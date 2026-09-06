import crypto from "node:crypto";
import { config } from "../../config";
import type { Paise } from "../../money";

/**
 * Razorpay, UPI-first. No SDK: two REST calls and an HMAC check are less
 * surface than a dependency that ships its own HTTP stack.
 *
 * The amount is always computed server-side from the price config. A client
 * never tells us what something costs.
 */
export type RazorpayOrder = { id: string; amount: number; currency: string; status: string };

function auth(): string {
  const c = config();
  if (!c.RAZORPAY_KEY_ID || !c.RAZORPAY_KEY_SECRET) throw new Error("Razorpay keys are not set");
  return "Basic " + Buffer.from(`${c.RAZORPAY_KEY_ID}:${c.RAZORPAY_KEY_SECRET}`).toString("base64");
}

export async function createOrder(input: {
  amountPaise: Paise;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: auth(), "content-type": "application/json" },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes,
      // UPI is the default rail for this market; cards are the fallback.
      method: "upi",
    }),
  });
  if (!res.ok) throw new Error(`razorpay order failed ${res.status}: ${await res.text()}`);
  return (await res.json()) as RazorpayOrder;
}

/** Checkout handshake signature: HMAC(order_id|payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const want = crypto
    .createHmac("sha256", config().RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqual(want, signature);
}

/** Webhook signature: HMAC(raw body, webhook_secret). Verify on RAW bytes. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const want = crypto
    .createHmac("sha256", config().RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return safeEqual(want, signature);
}

function safeEqual(a: string, b: string): boolean {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}
