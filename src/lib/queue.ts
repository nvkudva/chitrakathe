import { PgBoss } from "pg-boss";
import { config } from "./config";

/**
 * pg-boss on the same Postgres. No Redis in v1: one less thing to run, and job
 * state is transactional with domain state.
 *
 * Nothing renders in a web request. The web tier only enqueues and reads.
 */
export const QUEUES = {
  render: "render",
  purgeAssets: "purge-assets",
} as const;

export type RenderPayload = { jobId: string; eventId: string };

let boss: PgBoss | null = null;

export async function queue(): Promise<PgBoss> {
  if (!boss) {
    boss = new PgBoss({ connectionString: config().DATABASE_URL, schema: "pgboss" });
    boss.on("error", (e: unknown) => console.error("[pg-boss]", e));
    await boss.start();
    for (const q of Object.values(QUEUES)) await boss.createQueue(q);
  }
  return boss;
}

export async function enqueueRender(payload: RenderPayload): Promise<string | null> {
  const b = await queue();
  return b.send(QUEUES.render, payload, {
    retryLimit: 2,
    retryDelay: 30,
    retryBackoff: true,
    expireInSeconds: 1500,
    // One live render per job. A duplicate enqueue must never double-spend.
    singletonKey: payload.jobId,
  });
}

export async function stopQueue(): Promise<void> {
  await boss?.stop({ graceful: true });
  boss = null;
}
