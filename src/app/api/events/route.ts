import { NextResponse } from "next/server";
import { z } from "zod";
import { getTemplate } from "@/lib/templates";
import { LANGUAGES, SCRIPTS, ASPECTS } from "@/lib/templates/schema";
import * as repo from "@/lib/repo";
import { currentSession } from "@/lib/auth/session";

const Body = z.object({
  templateId: z.string(),
  language: z.enum(LANGUAGES),
  script: z.enum(SCRIPTS).optional(),
  fields: z.record(z.string(), z.string()),
  aspects: z.array(z.enum(ASPECTS)).min(1).default(["9:16", "1:1"]),
  email: z.email().optional(),
  phone: z.string().min(10).max(15).optional(),
  partnerCode: z.string().optional(),
});

/** Edit the brief. Only the fields — photos and template are fixed once queued. */
export async function PATCH(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing event id" }, { status: 400 });

  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Sign in to edit", needsAuth: true }, { status: 401 });

  const event = await repo.getEvent(id);
  if (!event) return NextResponse.json({ error: "No such event" }, { status: 404 });
  if (event.user_id !== session.userId) {
    return NextResponse.json({ error: "This event belongs to another account" }, { status: 403 });
  }

  const parsed = z.object({ fields: z.record(z.string(), z.string()) }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const template = getTemplate(event.template_id, event.template_version);
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

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const b = parsed.data;
  const session = await currentSession();

  // A signed-in family needs no contact fields — we already have their email.
  if (!session && !b.email && !b.phone) {
    return NextResponse.json({ error: "An email or a phone number is required for delivery" }, { status: 400 });
  }

  const template = getTemplate(b.templateId);

  // Required fields are checked against the template, not a duplicated list.
  const missing = template.fields.filter((f) => f.required && !b.fields[f.key]?.trim()).map((f) => f.key);
  if (missing.length) return NextResponse.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });

  const user = session
    ? { id: session.userId }
    : await repo.findOrCreateUser(b.email, b.phone, b.partnerCode);
  const event = await repo.createEvent({
    userId: user.id as string,
    templateId: template.id,
    templateVersion: template.version,
    language: b.language,
    script: b.script,
    fields: b.fields,
    aspects: b.aspects,
  });

  return NextResponse.json({
    eventId: event.id,
    photosRequired: template.photosRequired,
  });
}
