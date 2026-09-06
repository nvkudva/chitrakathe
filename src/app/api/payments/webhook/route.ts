import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { verifyWebhookSignature } from "@/lib/providers/payments/razorpay";
import { settlePayment } from "@/lib/payments";

/**
 * Razorpay webhook. Signature is checked against the RAW body — parsing first
 * and re-serialising would change the bytes and fail every time.
 */
async function handlePOST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!signature || !verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  // A signature-valid body is still arbitrary JSON: a captured event with no
  // payload used to throw on the destructure and return a 500.
  let body: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; method?: string } } } };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  if (body.event === "payment.captured") {
    const entity = body.payload?.payment?.entity;
    if (!entity?.order_id || !entity.id) {
      console.warn("[payments] payment.captured with no entity; ignoring");
      return NextResponse.json({ ok: true });
    }
    const settled = await settlePayment(entity.order_id, entity.id, entity.method);
    console.log(`[payments] ${entity.order_id} ${settled ? "settled" : "already settled"}`);
  }

  // Always 200 on a verified webhook, or Razorpay retries forever.
  return NextResponse.json({ ok: true });
}

export const POST = guard("api/webhook POST", handlePOST);
