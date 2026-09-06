import { NextResponse } from "next/server";
import { z } from "zod";
import { startPayment } from "@/lib/payments";

const Body = z.object({
  eventId: z.uuid(),
  jobId: z.uuid().nullable().default(null),
  purpose: z.enum(["unlock", "rerender"]).default("unlock"),
});

/** Amount is always server-side. The client asks what for, never how much. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const { eventId, jobId, purpose } = parsed.data;

  const result = await startPayment(eventId, jobId, purpose);
  if (result.alreadyPaid) return NextResponse.json({ alreadyPaid: true });
  return NextResponse.json(result.checkout);
}
