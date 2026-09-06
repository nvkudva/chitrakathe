/**
 * Retention job. Run daily (cron or a pg-boss schedule).
 *
 * Uploaded family photos are hard-deleted 30 days after upload. Rendered
 * outputs are kept 90 days so a family can re-download. Both numbers are
 * stated on the upload screen and in the privacy policy — this script is what
 * makes those statements true.
 */
import { sql, closeDb } from "../src/lib/db";
import { storage } from "../src/lib/storage";
import { config } from "../src/lib/config";

const db = sql();
const store = storage();

const assets = await db`select id, storage_key from assets
  where purged_at is null and purge_after <= now() limit 5000`;

let photos = 0;
for (const a of assets) {
  await store.delete(a.storage_key as string);
  await db`update assets set purged_at = now(), storage_key = '' where id = ${a.id}`;
  photos++;
}

const jobs = await db`select j.id from render_jobs j
  where j.outputs_purge_after is not null and j.outputs_purge_after <= now()
    and exists (select 1 from render_outputs o where o.job_id = j.id) limit 2000`;

let outputs = 0;
for (const j of jobs) {
  const outs = await db`select * from render_outputs where job_id = ${j.id}`;
  for (const o of outs) {
    await store.delete(o.master_key as string);
    await store.delete(o.preview_key as string);
    if (o.poster_key) await store.delete(o.poster_key as string);
    outputs++;
  }
  await db`delete from render_outputs where job_id = ${j.id}`;
}

console.log(
  `retention: purged ${photos} uploaded photos (>${config().ASSET_RETENTION_DAYS}d) and ` +
    `${outputs} rendered files (>${config().OUTPUT_RETENTION_DAYS}d)`
);
await closeDb();
