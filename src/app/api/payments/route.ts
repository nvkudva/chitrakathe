import { NextResponse } from "next/server";
import { readJson } from "@/lib/http";
import { z } from "zod";
import { startPayment } from "@/lib/payments";
import { currentSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";

const Body = z.object({
  eventId: z.uuid(),
  jobId: z.uuid().nullable().default(null),
  purpose: z.enum(["unlock", "rerender"]).default("unlock"),
});

/** Amount is always server-side. The client asks what for, never how much. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const { eventId, jobId, purpose } = parsed.data;

  // Payment is the gate. Anyone can watch a watermarked preview; only the
  // family that made it can buy it, so the receipt and the download land on
  // an account they can come back to.
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Sign in to pay", needsAuth: true }, { status: 401 });

  const [owned] = await sql()`select 1 from events
    where id = ${eventId} and user_id = ${session.userId} limit 1`;
  if (!owned) return NextResponse.json({ error: "This event belongs to another account" }, { status: 403 });

  const result = await startPayment(eventId, jobId, purpose);
  if (result.alreadyPaid) return NextResponse.json({ alreadyPaid: true });
  return NextResponse.json(result.checkout);
}
