import { sql } from "./db";
import { config } from "./config";
import { createOrder } from "./providers/payments/razorpay";

export type Purpose = "unlock" | "rerender";

export function priceFor(purpose: Purpose): number {
  return purpose === "unlock" ? config().PRICE_LAUNCH_PAISE : config().PRICE_RERENDER_PAISE;
}

export async function startPayment(eventId: string, jobId: string | null, purpose: Purpose) {
  const db = sql();
  const amount = priceFor(purpose);

  // Never charge twice for the same unlock.
  if (purpose === "unlock") {
    const [existing] = await db`select * from payments
      where event_id = ${eventId} and purpose = 'unlock' and status = 'paid' limit 1`;
    if (existing) return { alreadyPaid: true as const, payment: existing };
  }

  const order = await createOrder({
    amountPaise: amount,
    receipt: `${purpose}-${eventId}`.slice(0, 40),
    notes: { eventId, jobId: jobId ?? "", purpose },
  });

  const [row] = await db`insert into payments ${db({
    event_id: eventId,
    job_id: jobId,
    purpose,
    amount_paise: amount,
    order_id: order.id,
  })} returning *`;

  return {
    alreadyPaid: false as const,
    payment: row!,
    checkout: { orderId: order.id, amount, keyId: config().RAZORPAY_KEY_ID, currency: "INR" },
  };
}

/** Idempotent by order_id. A webhook that arrives twice must settle once. */
export async function settlePayment(orderId: string, paymentId: string, method?: string) {
  const db = sql();
  const [p] = await db`update payments
      set status = 'paid', payment_id = ${paymentId}, method = ${method ?? null}, paid_at = now()
      where order_id = ${orderId} and status <> 'paid'
      returning *`;
  if (!p) return null;
  if (p.job_id) await db`update render_jobs set paid = true where id = ${p.job_id}`;
  else await db`update render_jobs set paid = true where event_id = ${p.event_id}`;
  return p;
}

export async function isUnlocked(eventId: string): Promise<boolean> {
  const [p] = await sql()`select 1 from payments
    where event_id = ${eventId} and purpose = 'unlock' and status = 'paid' limit 1`;
  return Boolean(p);
}
