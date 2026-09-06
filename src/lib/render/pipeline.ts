import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "../config";
import { CostLedger, CostCeilingExceeded, OVERHEAD_RESERVE_PAISE } from "../cost/ledger";
import { ffmpeg, durationOf } from "./ffmpeg";
import { withTempDir } from "./tmp";
import { SIZES, FPS, photoFilter } from "./motion";
import { renderCardFrames, closeBrowser } from "./cards";
import { resolveSlot, voiceoverText } from "./text";
import { videoProviders } from "../providers/video";
import { ttsProvider } from "../providers/tts";
import { getTemplate, photoAt, scriptFor } from "../templates";
import type { Aspect, Brief, Shot, Template } from "../templates/schema";

export type PhotoSource = (key: string) => Promise<Buffer>;

export type RenderOptions = {
  jobId: string;
  brief: Brief;
  ledger: CostLedger;
  loadPhoto: PhotoSource;
  onProgress?: (stage: string, pct: number) => void | Promise<void>;
  /**
   * Called the moment one aspect is finished, before the next one starts.
   * The portrait master exists minutes before the job is marked succeeded, and
   * that is roughly half the perceived wait.
   */
  onAspectReady?: (out: RenderedAspect) => void | Promise<void>;
  /** Music bed file. Missing means silence under the voiceover. */
  musicDir?: string;
};

export type RenderedAspect = {
  aspect: Aspect;
  masterPath: string;
  previewPath: string;
  posterPath: string;
  bytes: number;
};

export type RenderResult = {
  outputs: RenderedAspect[];
  durationSeconds: number;
  /** Shots that fell back because the model failed or the ceiling was near. */
  degraded: string[];
  cost: ReturnType<CostLedger["summary"]>;
};

const STAGES = ["prepare", "shots", "voice", "assemble", "derive"] as const;

/**
 * Renders a brief to finished files on disk. Storage, database and queue are
 * all somebody else's problem: this function takes photos in and puts files
 * out, which is what makes it testable from a hardcoded JSON brief.
 */
export async function renderBrief(opts: RenderOptions): Promise<RenderResult> {
  const started = Date.now();
  const { brief, ledger } = opts;
  const t = getTemplate(brief.templateId, brief.templateVersion);
  const degraded: string[] = [];
  const progress = async (stage: string, pct: number) => {
    await opts.onProgress?.(stage, pct);
  };

  return withTempDir(`job-${opts.jobId}`, async (work) => {
    try {
      // Reserve compute and storage before spending anything. A job that
      // cannot afford its own overhead is refused here, having spent nothing.
      ledger.reserve(OVERHEAD_RESERVE_PAISE);
      await progress("prepare", 2);

      // 1. Pull every photo the storyboard names, once.
      const photoDir = path.join(work, "photos");
      await fs.mkdir(photoDir, { recursive: true });
      const photoPaths = new Map<number, string>();
      for (const idx of photoIndices(t)) {
        const key = photoAt(brief, idx);
        const buf = await opts.loadPhoto(key);
        const p = path.join(photoDir, `${idx}.jpg`);
        // Normalise and strip metadata in one pass.
        await fs.writeFile(path.join(photoDir, `${idx}.src`), buf);
        await ffmpeg(["-i", path.join(photoDir, `${idx}.src`), "-map_metadata", "-1", "-q:v", "2", "-y", p]);
        photoPaths.set(idx, p);
      }
      await progress("prepare", 10);

      // 2. Voiceover. Cheap, so it happens before the expensive shots and its
      //    length is known when the mix is built.
      await progress("voice", 12);
      const vo = voiceoverText(t, brief);
      const tts = ttsProvider();
      await ledger.chargeTts(tts.name, vo.length);
      const voicePath = path.join(work, "voice.m4a");
      await fs.writeFile(path.join(work, "voice.raw"), await tts.speak(vo, brief.language));
      await ffmpeg(["-i", path.join(work, "voice.raw"), "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "1", "-y", voicePath]);

      // 3. Shots, per aspect. Generated clips are produced once and reused.
      const genCache = new Map<string, string>();
      const outputs: RenderedAspect[] = [];
      const aspects = brief.aspects;
      for (const [ai, aspect] of aspects.entries()) {
        const aspectDir = path.join(work, aspect.replace(":", "x"));
        await fs.mkdir(aspectDir, { recursive: true });
        const clips: string[] = [];

        for (const [si, shot] of t.shots.entries()) {
          const base = 15 + (ai / aspects.length) * 55 + (si / t.shots.length) * (55 / aspects.length);
          await progress("shots", Math.round(base));
          const clip = path.join(aspectDir, `${String(si).padStart(2, "0")}_${shot.id}.mp4`);
          const fellBack = await renderShot({
            shot, t, brief, aspect, work: aspectDir, photoPaths, out: clip, ledger, genCache,
          });
          if (fellBack && !degraded.includes(shot.id)) degraded.push(shot.id);
          clips.push(clip);
        }

        // 4. Assemble: concat, then lay the audio bed under it.
        await progress("assemble", Math.round(72 + (ai / aspects.length) * 12));
        const master = path.join(work, `master.${aspect.replace(":", "x")}.mp4`);
        await assemble(clips, voicePath, musicPath(t, opts.musicDir), master, aspectDir);

        // 5. Derive the watermarked preview from the master. Model spend
        //    happens once per job, never once per download. See prd.md 5.
        await progress("derive", Math.round(86 + (ai / aspects.length) * 10));
        const preview = path.join(work, `preview.${aspect.replace(":", "x")}.mp4`);
        await watermark(master, preview, aspect);
        const poster = path.join(work, `poster.${aspect.replace(":", "x")}.jpg`);
        await ffmpeg(["-ss", "1.2", "-i", master, "-frames:v", "1", "-q:v", "3", "-y", poster]);

        const bytes = (await fs.stat(master)).size + (await fs.stat(preview)).size;
        // Copy out before announcing: the temp dir is swept on the way out, and
        // a consumer must never be handed a path that is about to vanish.
        const ready = await publish(opts.jobId, { aspect, masterPath: master, previewPath: preview, posterPath: poster, bytes });
        outputs.push(ready);
        await opts.onAspectReady?.(ready);
      }

      // 6. Charge for what the job actually consumed.
      const wall = (Date.now() - started) / 1000;
      await ledger.chargeCompute(wall);
      const mb = outputs.reduce((a, o) => a + o.bytes, 0) / 1_000_000 + brief.photos.length * 3;
      await ledger.chargeStorage(mb);

      await progress("derive", 100);

      return {
        outputs,
        durationSeconds: await durationOf(outputs[0]!.masterPath),
        degraded,
        cost: ledger.summary(),
      };
    } finally {
      await closeBrowser();
    }
  });
}

/** Moves one finished aspect out of the temp dir so it outlives the job. */
async function publish(jobId: string, o: RenderedAspect): Promise<RenderedAspect> {
  const outDir = path.join(config().STORAGE_LOCAL_DIR, "renders", jobId);
  await fs.mkdir(outDir, { recursive: true });
  const at = async (src: string) => {
    const dst = path.join(outDir, path.basename(src));
    await fs.copyFile(src, dst);
    return dst;
  };
  return {
    ...o,
    masterPath: await at(o.masterPath),
    previewPath: await at(o.previewPath),
    posterPath: await at(o.posterPath),
  };
}

function photoIndices(t: Template): number[] {
  const s = new Set<number>();
  for (const shot of t.shots) {
    if ("photo" in shot && typeof shot.photo === "number") s.add(shot.photo);
    if (shot.type === "photo_montage") shot.photos.forEach((p) => s.add(p));
    if (shot.type === "generative") {
      if (shot.seedPhoto !== undefined) s.add(shot.seedPhoto);
      s.add(shot.fallback.photo);
    }
  }
  return [...s].sort((a, b) => a - b);
}

function musicPath(t: Template, dir?: string): string | null {
  if (!dir) return null;
  return path.join(dir, `${t.music}.m4a`);
}

// ---------------------------------------------------------------------------

type ShotCtx = {
  shot: Shot;
  t: Template;
  brief: Brief;
  aspect: Aspect;
  work: string;
  photoPaths: Map<number, string>;
  out: string;
  ledger: CostLedger;
  /**
   * Generated clips, keyed by shot id, shared across every aspect of this job.
   *
   * Without this the aspect loop calls the model once per aspect: a 2-shot
   * template exported at 9:16 and 1:1 generates four clips, pays for four, and
   * then the ceiling refuses the last one so the square silently ships
   * degraded. "Model spend happens exactly once per job" (prd.md 5) is only
   * true because of this map.
   */
  genCache: Map<string, string>;
};

/** Renders one shot. Returns true if it degraded to a fallback. */
async function renderShot(ctx: ShotCtx): Promise<boolean> {
  const { shot } = ctx;
  switch (shot.type) {
    case "photo_motion":
      await photoShot(ctx, shot.photo, shot);
      return false;
    case "photo_montage":
      await montageShot(ctx);
      return false;
    case "title_card":
      await cardShot(ctx);
      return false;
    case "lower_third":
      await cardShot(ctx);
      return false;
    case "generative":
      return generativeShot(ctx);
  }
}

async function photoShot(
  ctx: ShotCtx,
  photoIdx: number,
  opts: { duration: number; motion: string; zoom?: [number, number]; ease?: string; anchor?: string },
  outOverride?: string
) {
  const size = SIZES[ctx.aspect];
  const src = ctx.photoPaths.get(photoIdx);
  if (!src) throw new Error(`Shot ${ctx.shot.id} references photo ${photoIdx} which was not loaded`);
  const filter = photoFilter({
    motion: opts.motion as never,
    zoom: opts.zoom ?? [1.0, 1.08],
    seconds: opts.duration,
    size,
    anchor: (opts.anchor ?? "center") as never,
    ease: (opts.ease ?? "ease_in_out") as never,
  });
  await ffmpeg([
    "-loop", "1", "-i", src,
    "-t", String(opts.duration),
    "-vf", filter,
    "-r", String(FPS),
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
    "-y", outOverride ?? ctx.out,
  ]);
}

async function montageShot(ctx: ShotCtx) {
  const shot = ctx.shot;
  if (shot.type !== "photo_montage") return;
  const parts: string[] = [];
  for (const [i, idx] of shot.photos.entries()) {
    const p = path.join(ctx.work, `${shot.id}_${i}.mp4`);
    // Alternate the direction so a montage reads as cut coverage, not a loop.
    await photoShot(
      ctx,
      idx,
      { duration: shot.per, motion: i % 2 === 0 ? "push_in" : "drift_left", zoom: [1.02, 1.1], ease: "linear" },
      p
    );
    parts.push(p);
  }
  await concat(parts, ctx.out, ctx.work);
}

async function cardShot(ctx: ShotCtx) {
  const shot = ctx.shot;
  if (shot.type !== "title_card" && shot.type !== "lower_third") return;
  const size = SIZES[ctx.aspect];
  const script = scriptFor(ctx.t, ctx.brief.language, ctx.brief.script);
  const hasPhoto = "photo" in shot && typeof shot.photo === "number";

  const framesDir = path.join(ctx.work, `${shot.id}_frames`);
  const cardFrames = await renderCardFrames(
    {
      lines: shot.lines.map((slot) => ({ text: resolveSlot(ctx.t, ctx.brief, slot), slot })),
      template: ctx.t,
      script,
      aspect: ctx.aspect,
      seconds: shot.duration,
      transparent: hasPhoto,
      anchor: shot.type === "lower_third" ? "bottom" : "center",
    },
    framesDir
  );

  // Clone the final frame for the still tail rather than capturing it.
  const hold = cardFrames.holdSeconds > 0 ? `,tpad=stop_mode=clone:stop_duration=${cardFrames.holdSeconds}` : "";

  if (!hasPhoto) {
    await ffmpeg([
      "-framerate", String(FPS), "-i", path.join(framesDir, "%05d.png"),
      "-vf", `scale=${size.w}:${size.h}${hold},format=yuv420p`,
      "-t", String(shot.duration),
      "-r", String(FPS),
      "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-y", ctx.out,
    ]);
    return;
  }

  // Photo bed under a transparent card.
  const bed = path.join(ctx.work, `${shot.id}_bed.mp4`);
  const scrim = "scrim" in shot ? shot.scrim : 0.55;
  await photoShot(ctx, (shot as { photo: number }).photo, {
    duration: shot.duration,
    motion: shot.motion,
    zoom: [1.0, 1.08],
    ease: "ease_in_out",
  }, bed);

  await ffmpeg([
    "-i", bed,
    "-framerate", String(FPS), "-i", path.join(framesDir, "%05d.png"),
    "-filter_complex",
    `[0:v]eq=brightness=${(-scrim * 0.45).toFixed(3)}:saturation=${(1 - scrim * 0.35).toFixed(3)}[bg];` +
      `[1:v]${hold ? hold.slice(1) + "," : ""}format=rgba[card];` +
      `[bg][card]overlay=0:0:eof_action=repeat,format=yuv420p[v]`,
    "-map", "[v]",
    "-t", String(shot.duration),
    "-r", String(FPS),
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-y", ctx.out,
  ]);
}

/**
 * The only shot type that spends money.
 *
 * Order of operations matters: quote first, check the ceiling, then call the
 * provider. A shot that cannot be afforded degrades to its authored fallback
 * rather than failing the job or overrunning the budget.
 */
async function generativeShot(ctx: ShotCtx): Promise<boolean> {
  const shot = ctx.shot;
  if (shot.type !== "generative") return false;

  // Already generated for another aspect of this job: re-frame, do not re-buy.
  const cached = ctx.genCache.get(shot.id);
  if (cached) {
    await reframe(cached, ctx.out, ctx.aspect, shot.duration);
    return false;
  }

  const providers = videoProviders();
  let lastError: unknown = null;

  for (const provider of providers) {
    const quote = ctx.ledger.quoteVideo(provider.name, provider.model, shot.duration);
    if (!ctx.ledger.canAfford(quote)) {
      console.warn(
        `[cost] shot ${shot.id}: ${provider.name} would cost ${quote}p, only ${ctx.ledger.remainingPaise}p left. Trying next provider.`
      );
      continue;
    }
    try {
      const seed = shot.seedPhoto !== undefined ? ctx.photoPaths.get(shot.seedPhoto) : undefined;
      const seedImage = seed ? await fs.readFile(seed) : undefined;
      const res = await provider.generate({
        prompt: shot.prompt,
        seedImage,
        seconds: shot.duration,
        // Generate once at the tallest aspect; every other export is a crop of
        // it, so nothing is generated twice and nothing is upscaled.
        aspect: "9:16",
        subject: shot.subject,
      });
      await ctx.ledger.chargeVideo(res.provider, res.model, res.seconds, shot.id);

      // Keep the source outside the per-aspect directory — it outlives it.
      const raw = path.join(ctx.work, "..", `gen_${shot.id}.mp4`);
      await fs.writeFile(raw, res.mp4);
      ctx.genCache.set(shot.id, raw);

      await reframe(raw, ctx.out, ctx.aspect, shot.duration);
      return false;
    } catch (e) {
      if (e instanceof CostCeilingExceeded) throw e;
      lastError = e;
      console.warn(`[video] ${provider.name} failed on shot ${shot.id}: ${(e as Error).message}`);
    }
  }

  console.warn(`[video] shot ${shot.id} degraded to fallback. Last error: ${(lastError as Error)?.message ?? "ceiling"}`);
  await photoShot(ctx, shot.fallback.photo, {
    duration: shot.duration,
    motion: shot.fallback.motion,
    zoom: [1.0, 1.12],
    ease: "ease_in_out",
  });
  return true;
}

/** Crops and scales a generated clip into one export aspect. */
async function reframe(src: string, out: string, aspect: Aspect, duration: number) {
  const size = SIZES[aspect];
  await ffmpeg([
    "-i", src,
    "-t", String(duration),
    "-vf", `scale=${size.w}:${size.h}:force_original_aspect_ratio=increase,crop=${size.w}:${size.h},fps=${FPS},format=yuv420p`,
    "-an",
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-y", out,
  ]);
}

// ---------------------------------------------------------------------------

async function concat(parts: string[], out: string, work: string) {
  const list = path.join(work, `concat-${path.basename(out)}.txt`);
  await fs.writeFile(list, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
  await ffmpeg(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-y", out]);
}

async function assemble(clips: string[], voice: string, music: string | null, out: string, work: string) {
  const video = path.join(work, "video-only.mp4");
  await concat(clips, video, work);
  const total = await durationOf(video);

  const args = ["-i", video, "-i", voice];
  let filter: string;
  if (music && (await exists(music))) {
    args.push("-stream_loop", "-1", "-i", music);
    // Music ducks under the voiceover; both are trimmed to picture and faded.
    // The voiceover is split: one copy keys the sidechain, the other is mixed.
    // A filtergraph label can only be consumed once.
    filter =
      `[2:a]atrim=0:${total},volume=0.38,afade=t=in:st=0:d=1.2,afade=t=out:st=${(total - 1.6).toFixed(2)}:d=1.6[bed];` +
      `[1:a]adelay=900|900,volume=1.5,apad,atrim=0:${total},asplit=2[vokey][vomix];` +
      `[bed][vokey]sidechaincompress=threshold=0.05:ratio=6:attack=25:release=350[ducked];` +
      `[ducked][vomix]amix=inputs=2:duration=first:dropout_transition=0,` +
      `atrim=0:${total},aresample=48000[a]`;
  } else {
    filter = `[1:a]adelay=900|900,volume=1.4,apad,atrim=0:${total},aresample=48000[a]`;
  }

  await ffmpeg([
    ...args,
    "-filter_complex", filter,
    "-map", "0:v", "-map", "[a]",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
    "-movflags", "+faststart",
    "-shortest", "-y", out,
  ]);
}

/**
 * Watermark and downscale in one pass to make the free preview.
 *
 * The watermark is a repeated diagonal wordmark, not a corner bug: a corner
 * bug is croppable in 10 seconds on a phone, which would make the paid tier
 * decorative.
 */
async function watermark(master: string, out: string, aspect: Aspect) {
  const size = SIZES[aspect];
  const w = Math.round(size.w * 0.5);
  const h = Math.round(size.h * 0.5);
  const font = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
  const marks = [0.2, 0.45, 0.7]
    .map(
      (y, i) =>
        `drawtext=fontfile=${font}:text='CHITRAKATHE PREVIEW':fontcolor=white@0.34:fontsize=${Math.round(h * 0.035)}:` +
        `x=(w-text_w)/2:y=h*${y}:box=0:shadowcolor=black@0.3:shadowx=2:shadowy=2`
    )
    .join(",");
  await ffmpeg([
    "-i", master,
    "-vf", `scale=${w}:${h},${marks},format=yuv420p`,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "26",
    "-c:a", "aac", "-b:a", "96k",
    "-movflags", "+faststart",
    "-y", out,
  ]);
}

async function exists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export { STAGES };
