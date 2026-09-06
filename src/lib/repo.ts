import { sql } from "./db";
import { config } from "./config";
import type { CostEntry } from "./cost/ledger";
import type { Brief, Language, Script } from "./templates/schema";

export type JobRow = {
  id: string;
  event_id: string;
  status: "queued" | "running" | "succeeded" | "failed" | "refused_over_ceiling";
  attempt: number;
  is_rerender: boolean;
  paid: boolean;
  stage: string | null;
  progress: number;
  ceiling_paise: number;
  cost_paise: number;
  degraded_shots: string[];
  duration_seconds: string | null;
  error: string | null;
};

export type EventRow = {
  id: string;
  user_id: string;
  template_id: string;
  template_version: number;
  language: Language;
  script: Script | null;
  fields: Record<string, string>;
  aspects: string[];
  free_rerender_used: boolean;
};

export async function findOrCreateUser(email?: string, phone?: string, partnerCode?: string) {
  const db = sql();
  if (email) {
    const [u] = await db`
      insert into users (email, phone, partner_code) values (${email}, ${phone ?? null}, ${partnerCode ?? null})
      on conflict (email) do update set phone = coalesce(excluded.phone, users.phone)
      returning *`;
    return u!;
  }
  const [u] = await db`insert into users (phone, partner_code) values (${phone ?? null}, ${partnerCode ?? null})
    on conflict (phone) do update set phone = excluded.phone returning *`;
  return u!;
}

export async function createEvent(input: {
  userId: string;
  templateId: string;
  templateVersion: number;
  language: Language;
  script?: Script;
  fields: Record<string, string>;
  aspects: string[];
}): Promise<EventRow> {
  const db = sql();
  const [e] = await db`insert into events ${db({
    user_id: input.userId,
    template_id: input.templateId,
    template_version: input.templateVersion,
    language: input.language,
    script: input.script ?? null,
    fields: db.json(input.fields),
    aspects: input.aspects,
  })} returning *`;
  return e as unknown as EventRow;
}

export async function getEvent(id: string): Promise<EventRow | null> {
  const [e] = await sql()`select * from events where id = ${id}`;
  return (e as unknown as EventRow) ?? null;
}

export async function updateEventFields(eventId: string, fields: Record<string, string>) {
  const db = sql();
  await db`update events set fields = ${db.json(fields)}, updated_at = now() where id = ${eventId}`;
}

export async function addAsset(input: {
  eventId: string;
  position: number;
  storageKey: string;
  contentType: string;
  bytes: number;
  width?: number;
  height?: number;
}) {
  const db = sql();
  const purgeAfter = new Date(Date.now() + config().ASSET_RETENTION_DAYS * 86400_000);
  const [a] = await db`insert into assets ${db({
    event_id: input.eventId,
    position: input.position,
    storage_key: input.storageKey,
    content_type: input.contentType,
    bytes: input.bytes,
    width: input.width ?? null,
    height: input.height ?? null,
    purge_after: purgeAfter,
  })} on conflict (event_id, position) do update set
      storage_key = excluded.storage_key,
      content_type = excluded.content_type,
      bytes = excluded.bytes,
      uploaded_at = now(),
      purge_after = excluded.purge_after
    returning *`;
  return a!;
}

export async function recordModeration(assetId: string, v: { provider: string; allowed: boolean; reason?: string; scores: Record<string, number> }) {
  const db = sql();
  await db`insert into moderation_results ${db({
    asset_id: assetId,
    provider: v.provider,
    allowed: v.allowed,
    reason: v.reason ?? null,
    scores: db.json(v.scores),
  })}`;
}

export async function assetKeys(eventId: string): Promise<string[]> {
  const rows = await sql()`select storage_key from assets
    where event_id = ${eventId} and purged_at is null order by position asc`;
  return rows.map((r) => r.storage_key as string);
}

export async function createJob(eventId: string, isRerender = false): Promise<JobRow> {
  const db = sql();
  const [j] = await db`insert into render_jobs ${db({
    event_id: eventId,
    is_rerender: isRerender,
    ceiling_paise: config().COST_CEILING_PAISE,
    outputs_purge_after: new Date(Date.now() + config().OUTPUT_RETENTION_DAYS * 86400_000),
  })} returning *`;
  return j as unknown as JobRow;
}

export async function getJob(id: string): Promise<JobRow | null> {
  const [j] = await sql()`select * from render_jobs where id = ${id}`;
  return (j as unknown as JobRow) ?? null;
}

export async function markRunning(jobId: string) {
  await sql()`update render_jobs
    set status = 'running', started_at = coalesce(started_at, now()), attempt = attempt + 1
    where id = ${jobId}`;
}

export async function setProgress(jobId: string, stage: string, progress: number) {
  await sql()`update render_jobs set stage = ${stage}, progress = ${progress} where id = ${jobId}`;
}

export async function recordCost(jobId: string, e: CostEntry) {
  const db = sql();
  await db`insert into cost_entries ${db({
    job_id: jobId,
    kind: e.kind,
    label: e.label,
    units: e.units,
    amount_paise: e.amountPaise,
    meta: db.json((e.meta ?? {}) as Record<string, never>),
  })}`;
  await db`update render_jobs set cost_paise = cost_paise + ${e.amountPaise} where id = ${jobId}`;
}

export async function recordBreach(jobId: string, b: { shotId?: string; spent: number; wouldAdd: number; ceiling: number; action: "degraded" | "refused" }) {
  const db = sql();
  await db`insert into ceiling_breaches ${db({
    job_id: jobId,
    shot_id: b.shotId ?? null,
    spent_paise: b.spent,
    would_add_paise: b.wouldAdd,
    ceiling_paise: b.ceiling,
    action: b.action,
  })}`;
}

export async function finishJob(jobId: string, patch: { status: JobRow["status"]; degraded?: string[]; durationSeconds?: number; error?: string }) {
  await sql()`update render_jobs set
      status = ${patch.status},
      degraded_shots = ${patch.degraded ?? []},
      duration_seconds = ${patch.durationSeconds ?? null},
      error = ${patch.error ?? null},
      finished_at = now(),
      progress = case when ${patch.status} = 'succeeded' then 100 else progress end
    where id = ${jobId}`;
}

export async function addOutput(jobId: string, o: { aspect: string; masterKey: string; previewKey: string; posterKey: string; bytes: number }) {
  const db = sql();
  await db`insert into render_outputs ${db({
    job_id: jobId,
    aspect: o.aspect,
    master_key: o.masterKey,
    preview_key: o.previewKey,
    poster_key: o.posterKey,
    bytes: o.bytes,
  })} on conflict (job_id, aspect) do update set
      master_key = excluded.master_key,
      preview_key = excluded.preview_key,
      poster_key = excluded.poster_key,
      bytes = excluded.bytes`;
}

export async function outputsFor(jobId: string) {
  return sql()`select * from render_outputs where job_id = ${jobId} order by aspect`;
}

export async function briefFor(eventId: string): Promise<Brief> {
  const e = await getEvent(eventId);
  if (!e) throw new Error(`No event ${eventId}`);
  const photos = await assetKeys(eventId);
  return {
    templateId: e.template_id,
    templateVersion: e.template_version,
    language: e.language,
    script: e.script ?? undefined,
    fields: e.fields,
    photos,
    aspects: e.aspects as Brief["aspects"],
  };
}
