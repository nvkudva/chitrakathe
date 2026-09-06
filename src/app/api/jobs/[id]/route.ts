import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { storage } from "@/lib/storage";
import { isUnlocked } from "@/lib/payments";
import * as repo from "@/lib/repo";
import { currentSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";

/** Progress polling. Preview URLs are signed; masters are never exposed here. */
async function handleGET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = await repo.getJob(id);
  if (!job) return NextResponse.json({ error: "No such job" }, { status: 404 });

  const outputs = await repo.outputsFor(id);
  const store = storage();
  const unlocked = await isUnlocked(job.event_id);

  const session = await currentSession();
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
