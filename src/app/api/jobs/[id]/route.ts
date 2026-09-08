import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { storage } from "@/lib/storage";
import { isUnlocked } from "@/lib/payments";
import * as repo from "@/lib/repo";
import { getTemplate, heroFieldKey } from "@/lib/templates";
import { currentSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";

/** Progress polling. Preview URLs are signed; masters are never exposed here. */
/** The template's own hero field, never a guess at key order. */
function heroTitle(event: Awaited<ReturnType<typeof repo.getEvent>>): string | null {
  if (!event) return null;
  try {
    const key = heroFieldKey(getTemplate(event.template_id, event.template_version));
    return key ? (event.fields[key]?.trim() || null) : null;
  } catch {
    return null;
  }
}

/**
 * How long a render actually takes, as a rolling median of recent successes.
 *
 * A percentage that sits at 62% reads as stuck; "about 3 minutes left" does
 * not. duration_seconds is the length of the VIDEO, not the wall clock, so
 * this measures started_at to finished_at.
 */
async function medianRenderSeconds(): Promise<number | null> {
  const rows = await sql()`
    select extract(epoch from (finished_at - started_at)) as secs
    from render_jobs
    where status = 'succeeded' and started_at is not null and finished_at is not null
    order by finished_at desc limit 50`;
  const values = rows
    .map((r) => Number(r.secs))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  // Below three samples the median is noise, and a wrong estimate is worse
  // than none — the caller falls back to a static line.
  if (values.length < 3) return null;
  return values[Math.floor(values.length / 2)]!;
}

async function handleGET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = await repo.getJob(id);
  if (!job) return NextResponse.json({ error: "No such job" }, { status: 404 });

  const outputs = await repo.outputsFor(id);
  const store = storage();
  const unlocked = await isUnlocked(job.event_id);

  const event = await repo.getEvent(job.event_id);
  const session = await currentSession();
  const working = job.status === "queued" || job.status === "running";

  /*
   * While the render runs, hand back the family's own photos.
   *
   * They are already in storage and they are the most interesting thing we
   * could possibly show for four minutes. A progress bar is where people close
   * the tab, and by then we have already spent about Rs 51.
   */
  const photoUrls = working
    ? await Promise.all(
        (await repo.assetKeys(job.event_id)).map((key) => store.signedDownload(key, 3600))
      )
    : [];

  const median = working ? await medianRenderSeconds() : null;
  const [owned] = session
    ? await sql()`select 1 from events where id = ${job.event_id} and user_id = ${session.userId} limit 1`
    : [null];

  return NextResponse.json({
    id: job.id,
    eventId: job.event_id,
    // A job with a finished portrait is watchable even while the square is
    // still rendering, so the client is told to switch screens early.
    status: job.status,
    watchable: outputs.length > 0,
    stage: job.stage,
    progress: job.progress,
    error: job.status === "failed" ? "Render failed" : job.error,
    degraded: job.degraded_shots,
    unlocked,
    title: heroTitle(event),
    photos: photoUrls,
    // Seconds left, floored at 20 so it never counts down to zero while the
    // worker is still going.
    etaSeconds:
      median === null || !job.started_at
        ? null
        : Math.max(20, Math.round(median - (Date.now() - new Date(job.started_at).getTime()) / 1000)),
    signedIn: Boolean(session),
    owned: Boolean(owned),
    outputs: await Promise.all(
      outputs.map(async (o) => ({
        aspect: o.aspect,
        previewUrl: await store.signedDownload(o.preview_key as string, 3600),
        posterUrl: o.poster_key ? await store.signedDownload(o.poster_key as string, 3600) : null,
      }))
    ),
  });
}

export const GET = guard("api/jobs GET", handleGET);
