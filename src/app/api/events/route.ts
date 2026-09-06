import { NextResponse } from "next/server";
import { readJson, guard } from "@/lib/http";
import { z } from "zod";
import { getTemplate } from "@/lib/templates";
import { LANGUAGES, SCRIPTS, ASPECTS } from "@/lib/templates/schema";
import * as repo from "@/lib/repo";
import { currentSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";
import { authorizeEvent } from "@/lib/auth/eventAccess";

const Body = z.object({
  templateId: z.string(),
  language: z.enum(LANGUAGES),
  script: z.enum(SCRIPTS).optional(),
  fields: z.record(z.string(), z.string().max(500)),
  // Deduped and capped: the pipeline loops over this array, so 200 duplicates
  // meant 200 encode passes for one event.
  // Capped on input so a 200-element array cannot arrive at all, then deduped —
  // the pipeline loops over this, so duplicates mean repeated encode passes.
  // Dedupe must come after the cap, not before, or a legitimate repeat is a 400.
  aspects: z
    .array(z.enum(ASPECTS))
    .min(1)
    .max(8)
    .default(["9:16", "1:1"])
    .transform((a) => [...new Set(a)]),
  email: z.email().optional(),
  phone: z.string().min(10).max(15).optional(),
  partnerCode: z.string().optional(),
});

/** Edit the brief. Only the fields — photos and template are fixed once queued. */
async function patchEvent(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing event id" }, { status: 400 });


  const access = await authorizeEvent(id, req);
  if (!access.ok) return access.response;
  const event = await repo.getEvent(id);
  if (!event) return NextResponse.json({ error: "No such event" }, { status: 404 });

  const busy = await sql()`select 1 from render_jobs
    where event_id = ${id} and status in ('queued','running') limit 1`;
  if (busy.length > 0) {
    return NextResponse.json(
      { error: "This trailer is being made right now. Wait for it to finish, then change it." },
      { status: 409 }
    );
  }

  const parsed = z.object({ fields: z.record(z.string(), z.string().max(500)) }).safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  let template;
  try {
    template = getTemplate(event.template_id, event.template_version);
  } catch {
    return NextResponse.json({ error: "This event's template is no longer available" }, { status: 409 });
  }
  const allowed = new Set(template.fields.map((f) => f.key));
  const fields: Record<string, string> = { ...event.fields };
  for (const [k, v] of Object.entries(parsed.data.fields)) {
    // Silently ignore keys this template does not declare, rather than letting
    // arbitrary JSON accumulate on the row.
    if (allowed.has(k)) fields[k] = v.slice(0, template.fields.find((f) => f.key === k)!.maxLength);
  }
  const missing = template.fields.filter((f) => f.required && !fields[f.key]?.trim()).map((f) => f.key);
  if (missing.length) {
    return NextResponse.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });
  }

  await repo.updateEventFields(id, fields);
  return NextResponse.json({ ok: true, fields });
}

async function createEvent(req: Request) {
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const b = parsed.data;
  const session = await currentSession();

  // A signed-in family needs no contact fields — we already have their email.
  if (!session && !b.email && !b.phone) {
    return NextResponse.json({ error: "An email or a phone number is required for delivery" }, { status: 400 });
  }

  // An unknown template is the caller's mistake, not ours: 400, not a throw.
  let template;
  try {
    template = getTemplate(b.templateId);
  } catch {
    return NextResponse.json({ error: `Unknown template: ${b.templateId}` }, { status: 400 });
  }

  // Required fields are checked against the template, not a duplicated list.
  const missing = template.fields.filter((f) => f.required && !b.fields[f.key]?.trim()).map((f) => f.key);
  if (missing.length) return NextResponse.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });

  // Clip every value to what its own field declares, exactly as PATCH does.
  const limits = new Map(template.fields.map((f) => [f.key, f.maxLength]));
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(b.fields)) {
    if (limits.has(k)) fields[k] = v.slice(0, limits.get(k)!);
  }

  const user = session
    ? { id: session.userId }
    : await repo.findOrCreateUser(b.email, b.phone, b.partnerCode);
  const event = await repo.createEvent({
    userId: user.id as string,
    templateId: template.id,
    templateVersion: template.version,
    language: b.language,
    script: b.script,
    fields,
    aspects: b.aspects,
  });

  // The capability that lets an anonymous creator finish the flow. It is
  // returned once, to the caller that made the event, and never listed.
  return NextResponse.json({
    eventId: event.id,
    eventToken: event.access_token,
    photosRequired: template.photosRequired,
  });
}

export const POST = guard("api/events POST", createEvent);
export const PATCH = guard("api/events PATCH", patchEvent);
