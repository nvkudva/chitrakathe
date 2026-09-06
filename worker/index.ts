/**
 * Render worker. Runs as its own process — nothing renders inside a web
 * request. Start with `npm run worker`.
 */
import { promises as fs } from "node:fs";
import { QUEUES, queue, stopQueue, type RenderPayload } from "../src/lib/queue";
import { closeDb } from "../src/lib/db";
import { storage, keys } from "../src/lib/storage";
import { CostLedger, CostCeilingExceeded } from "../src/lib/cost/ledger";
import { renderBrief } from "../src/lib/render/pipeline";
import { closeBrowser } from "../src/lib/render/cards";
import { deliver } from "../src/lib/delivery";
import * as repo from "../src/lib/repo";
import path from "node:path";

const MUSIC_DIR = path.resolve("assets/music");

async function handleRender(payload: RenderPayload) {
  const { jobId, eventId } = payload;
  const job = await repo.getJob(jobId);
  if (!job) throw new Error(`No job ${jobId}`);
  if (job.status === "succeeded") {
    console.log(`[worker] job ${jobId} already succeeded, skipping`);
    return;
  }

  await repo.markRunning(jobId);
  const brief = await repo.briefFor(eventId);
  const store = storage();

  // The ledger persists every charge as it happens, so a job that dies
  // mid-render still shows what it spent.
  const ledger = new CostLedger(jobId, repo.recordCost, job.ceiling_paise);

  try {
    const result = await renderBrief({
      jobId,
      brief,
      ledger,
      musicDir: MUSIC_DIR,
      loadPhoto: (key) => store.get(key),
      onProgress: (stage, pct) => repo.setProgress(jobId, stage, pct),
    });

    for (const out of result.outputs) {
      const masterKey = keys.master(jobId, out.aspect);
      const previewKey = keys.preview(jobId, out.aspect);
      const posterKey = keys.poster(jobId, out.aspect);
      await store.put(masterKey, await fs.readFile(out.masterPath), "video/mp4");
      await store.put(previewKey, await fs.readFile(out.previewPath), "video/mp4");
      await store.put(posterKey, await fs.readFile(out.posterPath), "image/jpeg");
      await repo.addOutput(jobId, { aspect: out.aspect, masterKey, previewKey, posterKey, bytes: out.bytes });
    }

    for (const shotId of result.degraded) {
      await repo.recordBreach(jobId, {
        shotId,
        spent: ledger.spentPaise,
        wouldAdd: 0,
        ceiling: ledger.ceilingPaise,
        action: "degraded",
      });
    }

    await repo.finishJob(jobId, {
      status: "succeeded",
      degraded: result.degraded,
      durationSeconds: result.durationSeconds,
    });

    console.log(
      `[worker] job ${jobId} done in ${result.durationSeconds}s of video, cost ${ledger.spentPaise}p of ${ledger.ceilingPaise}p`
    );
    await deliver(eventId, jobId);
  } catch (err) {
    if (err instanceof CostCeilingExceeded) {
      // Refuse rather than overrun. The family is not charged and the job is
      // not retried: a retry would cost the same and fail the same way.
      await repo.recordBreach(jobId, {
        spent: err.spentPaise,
        wouldAdd: err.wouldAddPaise,
        ceiling: err.ceilingPaise,
        action: "refused",
      });
      await repo.finishJob(jobId, { status: "refused_over_ceiling", error: err.message });
      console.error(`[worker] job ${jobId} REFUSED over ceiling: ${err.message}`);
      return; // swallow: no retry
    }
    await repo.finishJob(jobId, { status: "failed", error: (err as Error).message });
    throw err; // let pg-boss retry
  }
}

async function main() {
  const boss = await queue();
  await boss.work<RenderPayload>(QUEUES.render, { batchSize: 1, pollingIntervalSeconds: 2 }, async (jobs: { data: RenderPayload }[]) => {
    for (const j of jobs) await handleRender(j.data);
  });
  console.log(`[worker] listening on "${QUEUES.render}"`);

  const shutdown = async (sig: string) => {
    console.log(`[worker] ${sig}, draining`);
    await stopQueue();
    await closeBrowser();
    await closeDb();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

await main();
