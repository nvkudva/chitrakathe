import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/providers/payments/razorpay";
import { settlePayment } from "@/lib/payments";

/**
 * Razorpay webhook. Signature is checked against the RAW body — parsing first
 * and re-serialising would change the bytes and fail every time.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!signature || !verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  const body = JSON.parse(raw) as {
    event: string;
    payload: { payment: { entity: { id: string; order_id: string; method?: string } } };
  };

  if (body.event === "payment.captured") {
    const p = body.payload.payment.entity;
    const settled = await settlePayment(p.order_id, p.id, p.method);
    console.log(`[payments] ${p.order_id} ${settled ? "settled" : "already settled"}`);
  }

  // Always 200 on a verified webhook, or Razorpay retries forever.
  return NextResponse.json({ ok: true });
}
