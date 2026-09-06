import { NextResponse } from "next/server";
import { enqueueRender } from "@/lib/queue";
import { deliver } from "@/lib/delivery";
import { getTemplate } from "@/lib/templates";
import { isUnlocked } from "@/lib/payments";
import { sql } from "@/lib/db";
import * as repo from "@/lib/repo";
import { authorizeEvent } from "@/lib/auth/eventAccess";
import { currentSession } from "@/lib/auth/session";
import { isConfigured } from "@/lib/auth/google";

/**
 * Enqueues a render. This route never renders — it writes a row and a queue
 * message and returns. See prd.md 8.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  // Holding the event id is not authorisation: ids travel in URLs and the
  // upload keys derived from them are deterministic.
  const access = await authorizeEvent(id, req);
  if (!access.ok) return access.response;
  const event = await repo.getEvent(id);
  if (!event) return NextResponse.json({ error: "No such event" }, { status: 404 });

  /*
   * The gate is here, not at the door and not at payment.
   *
   * The render is the only irreversible spend in the funnel — roughly Rs 51
   * whether or not the family ever pays — so it is the only place a sign-in
   * earns its keep. By this point they have typed the brief and chosen every
   * photo, which is maximum sunk cost for zero delivered value, and it buys a
   * verified email, a per-identity cap on free previews, and a trailer that
   * survives the tab closing.
   *
   * Watching a trailer at /t/<jobId> stays public and unauthenticated. The
   * whole growth loop is a WhatsApp forward; a sign-in wall there would kill it.
   */
  const session = await currentSession();
  if (isConfigured() && !session) {
    return NextResponse.json({ error: "Sign in to start your trailer", needsAuth: true }, { status: 401 });
  }
  if (session) {
    // Claim an event that was started before signing in, so the trailer lands
    // in the account rather than being orphaned on an anonymous row.
    await sql()`update events set user_id = ${session.userId}, claimed_at = now()
      where id = ${id} and (user_id = ${event.user_id} and claimed_at is null)`;
  }

  let template;
  try {
    template = getTemplate(event.template_id, event.template_version);
  } catch {
    return NextResponse.json({ error: "This event's template is no longer available" }, { status: 409 });
  }
  const photos = await repo.assetKeys(id);
  if (photos.length < template.photosRequired.min) {
    return NextResponse.json(
      { error: `This template needs at least ${template.photosRequired.min} photos; ${photos.length} uploaded` },
      { status: 400 }
    );
  }

  // Re-render policy: the first render is free, then one free re-render, then
  // paid. Decided inside a transaction that locks the event row — two taps on
  // a slow phone must not buy one free re-render twice, because each render
  // spends model seconds.
  const decision = await sql().begin(async (tx) => {
    await tx`select id from events where id = ${id} for update`;
    const [counted] = await tx`select count(*)::int as count from render_jobs where event_id = ${id}`;
    const isRerender = Number(counted?.count ?? 0) > 0;
    if (!isRerender) return { ok: true as const, isRerender };

    const [ev] = await tx`select free_rerender_used from events where id = ${id}`;
    if (!ev?.free_rerender_used) {
      await tx`update events set free_rerender_used = true, updated_at = now() where id = ${id}`;
      return { ok: true as const, isRerender };
    }
    const paidRerender = await tx`select 1 from payments
      where event_id = ${id} and purpose = 'rerender' and status = 'paid'
        and created_at > (select max(queued_at) from render_jobs where event_id = ${id}) limit 1`;
    return paidRerender.length > 0 ? { ok: true as const, isRerender } : { ok: false as const, isRerender };
  });

  if (!decision.ok) {
    return NextResponse.json({ error: "Free re-render already used", needsPayment: "rerender" }, { status: 402 });
  }

  const job = await repo.createJob(id, decision.isRerender);
  await enqueueRender({ jobId: job.id, eventId: id });

  // Send the link now, not when the render finishes. A family that closes the
  // tab during the 4-8 minute wait must still be able to find their trailer.
  await deliver(id, job.id, "queued");

  return NextResponse.json({ jobId: job.id, isRerender: decision.isRerender, unlocked: await isUnlocked(id) });
}
