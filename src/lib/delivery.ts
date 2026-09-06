import { sql } from "./db";
import { config } from "./config";

export type DeliveryMoment = "queued" | "ready";

/**
 * Delivery is a link, not an attachment: a 13 MB MP4 in an email bounces, and
 * WhatsApp re-compresses anything pushed through an API. The family gets a
 * short URL to the preview page and shares from there.
 *
 * Sent TWICE, and the first one is the one that matters. A render takes 4-8
 * minutes and costs us roughly Rs 51 whether or not anyone ever comes back to
 * it; a family that closes the tab during the wait used to lose the trailer
 * with no way to find it again. So the link goes out the moment the job is
 * queued, not when it finishes.
 */
export async function deliver(eventId: string, jobId: string, moment: DeliveryMoment = "ready"): Promise<void> {
  const [row] = await sql()`
    select u.email, u.phone from events e join users u on u.id = e.user_id where e.id = ${eventId}`;
  if (!row) return;

  const link = `${config().APP_URL}/t/${jobId}`;
  const body =
    moment === "queued"
      ? `We're making your trailer. It takes about 5 minutes — open this link any time, you can close the page: ${link}`
      : `Your trailer is ready: ${link}`;

  try {
    if (row.email) await sendEmail(row.email as string, body);
    if (row.phone) await sendWhatsApp(row.phone as string, body);
  } catch (e) {
    // Delivery must never fail a render that already cost us money.
    console.error(`[deliver] ${moment} notice failed for job ${jobId}:`, (e as Error).message);
  }
}

/** Masked for display: "98xxxxxx12". Never show a family their own full number back. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return phone;
  return `${digits.slice(0, 2)}${"x".repeat(Math.max(0, digits.length - 4))}${digits.slice(-2)}`;
}

async function sendEmail(to: string, body: string) {
  // Wire to a transactional provider before milestone 3 ships. Logged, not
  // silently dropped, so a missing integration is visible in the worker log.
  console.log(`[deliver] email -> ${to}: ${body}`);
}

async function sendWhatsApp(to: string, body: string) {
  // WhatsApp Cloud API template message. Requires an approved template.
  console.log(`[deliver] whatsapp -> ${to}: ${body}`);
}

/** A wa.me deep link the family can tap to forward the trailer themselves. */
export function whatsappShareUrl(link: string, caption: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${caption}\n${link}`)}`;
}
