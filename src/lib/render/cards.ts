import { chromium, type Browser } from "playwright-core";
import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "../config";
import { SIZES, FPS } from "./motion";
import type { Aspect, Script, Template, TextSlot } from "../templates/schema";

/**
 * Title cards are rendered in headless Chromium, one PNG per frame, then
 * composited by ffmpeg.
 *
 * Two reasons this is not ffmpeg drawtext:
 *  1. Kannada and Devanagari conjuncts need a real shaping engine. drawtext
 *     renders them broken or as tofu. This is a correctness requirement, not
 *     a polish one.
 *  2. It buys the full CSS animation vocabulary for free — overshoot, letter-
 *     spacing ramps, typewriter reveals — which is what the storyboards
 *     actually call for.
 *
 * Frames are deterministic: CSS animations are paused and driven frame by
 * frame through the Web Animations API, so the same brief renders the same
 * bytes every time.
 */

/** Every line animates for this long; used to size the capture window. */
export const ANIM_MS = 900;

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      executablePath: config().CHROMIUM_PATH,
      args: ["--no-sandbox", "--font-render-hinting=none", "--disable-lcd-text"],
    });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  await browser?.close();
  browser = null;
}

export type CardSpec = {
  lines: { text: string; slot: TextSlot }[];
  template: Template;
  script: Script;
  aspect: Aspect;
  seconds: number;
  /** Transparent PNGs for overlaying on a photo, or opaque on the palette. */
  transparent: boolean;
};

export type CardFrames = {
  /** Frames actually written, as %05d.png. */
  count: number;
  /** Seconds the last frame must be held to fill the shot. */
  holdSeconds: number;
};

/** Longest animation on the card, in seconds. Frames after this are identical. */
function animatedSeconds(spec: CardSpec): number {
  const last = Math.max(0, ...spec.lines.map((l) => l.slot.delay));
  return Math.min(spec.seconds, last + ANIM_MS / 1000 + 0.1);
}

/**
 * Renders the animating window of a card as a PNG sequence.
 *
 * A 4.5s card typically stops moving after 1.6s. Capturing all 135 frames when
 * 48 of them differ was the single biggest cost in the pipeline, so only the
 * moving window is captured and the compositor clones the last frame for the
 * rest.
 */
export async function renderCardFrames(spec: CardSpec, outDir: string): Promise<CardFrames> {
  const size = SIZES[spec.aspect];
  const animSecs = animatedSeconds(spec);
  const frames = Math.max(1, Math.round(animSecs * FPS));
  await fs.mkdir(outDir, { recursive: true });

  const page = await (await getBrowser()).newPage({
    viewport: { width: size.w, height: size.h },
    deviceScaleFactor: 1,
  });

  try {
    await page.setContent(cardHtml(spec, size), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);

    // Pause every animation so frames are driven, not sampled.
    await page.evaluate(() => {
      for (const a of document.getAnimations()) {
        a.pause();
        a.currentTime = 0;
      }
    });

    for (let i = 0; i < frames; i++) {
      const ms = (i / FPS) * 1000;
      await page.evaluate((t) => {
        for (const a of document.getAnimations()) a.currentTime = t;
      }, ms);
      await page.screenshot({
        path: path.join(outDir, `${String(i).padStart(5, "0")}.png`),
        omitBackground: spec.transparent,
        type: "png",
      });
    }
    return { count: frames, holdSeconds: +(spec.seconds - animSecs).toFixed(3) };
  } finally {
    await page.close();
  }
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function cardHtml(spec: CardSpec, size: { w: number; h: number }): string {
  const { template: t, script } = spec;
  const pal = t.palette;
  const hero = t.typography.hero[script] ?? "Noto Serif";
  const body = t.typography.body[script] ?? "Noto Sans";
  const scale = size.h / 1920; // storyboard sizes are authored against 1080x1920

  const styleFor = (s: TextSlot["style"]) => {
    switch (s) {
      case "hero":
        return { family: hero, size: t.typography.heroSize, weight: 700, ls: "-0.01em", color: pal.ink };
      case "title":
        return { family: hero, size: t.typography.titleSize, weight: 600, ls: "0.10em", color: pal.ink };
      case "subtitle":
        return { family: body, size: Math.round(t.typography.bodySize * 1.15), weight: 500, ls: "0.22em", color: pal.accent };
      case "lower_third":
        return { family: hero, size: Math.round(t.typography.titleSize * 0.8), weight: 600, ls: "0", color: pal.ink };
      case "caption":
        return { family: body, size: Math.round(t.typography.bodySize * 0.72), weight: 400, ls: "0.18em", color: pal.accent };
      default:
        return { family: body, size: t.typography.bodySize, weight: 400, ls: "0.02em", color: pal.ink };
    }
  };

  const items = spec.lines
    .filter((l) => l.text.trim().length > 0)
    .map((l, i) => {
      const st = styleFor(l.slot.style);
      const anim = l.slot.style === "hero" ? "heroIn" : l.slot.style === "title" ? "titleIn" : "lineIn";
      return `<div class="line l${i}" style="
        font-family:'${st.family}', system-ui, sans-serif;
        font-size:${Math.round(st.size * scale)}px;
        font-weight:${st.weight};
        letter-spacing:${st.ls};
        color:${st.color};
        text-align:${l.slot.align};
        align-self:${l.slot.align === "left" ? "flex-start" : l.slot.align === "right" ? "flex-end" : "center"};
        animation:${anim} ${ANIM_MS}ms cubic-bezier(.22,1.2,.36,1) ${Math.round(l.slot.delay * 1000)}ms both;
      ">${esc(l.text)}</div>`;
    })
    .join("\n");

  const isLowerThird = spec.lines.some((l) => l.slot.style === "lower_third" || l.slot.style === "caption");

  return `<!doctype html><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${size.w}px;height:${size.h}px;background:${spec.transparent ? "transparent" : pal.bg};overflow:hidden}
  .stage{
    width:100%;height:100%;display:flex;flex-direction:column;
    justify-content:${isLowerThird ? "flex-end" : "center"};
    gap:${Math.round(28 * scale)}px;
    padding:${Math.round(96 * scale)}px ${Math.round(88 * scale)}px ${Math.round(isLowerThird ? 180 : 96) * scale}px;
    ${spec.transparent ? "" : `background:radial-gradient(120% 70% at 50% 45%, ${pal.muted}22 0%, ${pal.bg} 70%);`}
  }
  .line{
    line-height:1.18;
    text-shadow:0 ${Math.round(4 * scale)}px ${Math.round(30 * scale)}px rgba(0,0,0,.8);
    white-space:pre-wrap;width:100%;
    /* Long venue and address lines must wrap, not overflow the frame. */
    overflow-wrap:break-word;text-wrap:balance;
  }
  @keyframes lineIn{from{opacity:0;transform:translateY(${Math.round(34 * scale)}px)}to{opacity:1;transform:none}}
  @keyframes titleIn{from{opacity:0;letter-spacing:.42em}to{opacity:1;letter-spacing:.10em}}
  /* The reveal: scale up past 1.0 and settle. See prd.md 6.1 shot 9. */
  @keyframes heroIn{
    0%{opacity:0;transform:scale(.92)}
    60%{opacity:1;transform:scale(1.03)}
    100%{opacity:1;transform:scale(1)}
  }
  </style><div class="stage">${items}</div>`;
}
