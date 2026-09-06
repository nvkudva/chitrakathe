import { NextResponse } from "next/server";
import { enqueueRender } from "@/lib/queue";
import { getTemplate } from "@/lib/templates";
import { isUnlocked } from "@/lib/payments";
import { sql } from "@/lib/db";
import * as repo from "@/lib/repo";

/**
 * Enqueues a render. This route never renders — it writes a row and a queue
 * message and returns. See prd.md 8.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const event = await repo.getEvent(id);
  if (!event) return NextResponse.json({ error: "No such event" }, { status: 404 });

  const template = getTemplate(event.template_id, event.template_version);
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

  return NextResponse.json({ jobId: job.id, isRerender: decision.isRerender, unlocked: await isUnlocked(id) });
}
