import { NextResponse } from "next/server";
import { readJson } from "@/lib/http";
import { z } from "zod";
import { storage } from "@/lib/storage";
import { moderationProvider } from "@/lib/moderation";
import * as repo from "@/lib/repo";
import { authorizeEvent } from "@/lib/auth/eventAccess";

const Body = z.object({
  assets: z.array(
    z.object({ position: z.number().int().min(0), key: z.string(), contentType: z.string(), bytes: z.number().int() })
  ),
});

/**
 * Called after the browser finishes uploading. Every photo passes the
 * moderation gate here, BEFORE a job can be queued. A rejected photo blocks
 * the whole event: partial acceptance would leave a hole in the storyboard.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const access = await authorizeEvent(id, req);
  if (!access.ok) return access.response;

  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const store = storage();
  const mod = moderationProvider();
  const rejected: { position: number; reason: string }[] = [];

  for (const a of parsed.data.assets) {
    if (!(await store.exists(a.key))) {
      return NextResponse.json({ error: `Upload ${a.position} never arrived` }, { status: 400 });
    }
    const row = await repo.addAsset({
      eventId: id,
      position: a.position,
      storageKey: a.key,
      contentType: a.contentType,
      bytes: a.bytes,
    });
    const verdict = await mod.checkImage(await store.get(a.key), a.contentType);
    await repo.recordModeration(row.id as string, verdict);
    if (!verdict.allowed) {
      await store.delete(a.key);
      rejected.push({ position: a.position, reason: verdict.reason ?? "not allowed" });
    }
  }

  if (rejected.length) {
    return NextResponse.json(
      { error: "Some photos could not be accepted", rejected, moderated: true },
      { status: 422 }
    );
  }
  return NextResponse.json({ ok: true, count: parsed.data.assets.length });
}
