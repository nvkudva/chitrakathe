import { sql } from "./db";
import { config } from "./config";

/**
 * Delivery is a link, not an attachment: a 13 MB MP4 in an email bounces, and
 * WhatsApp re-compresses anything pushed through an API. The family gets a
 * short URL to the preview page and shares from there.
 */
export async function deliver(eventId: string, jobId: string): Promise<void> {
  const [row] = await sql()`
    select u.email, u.phone from events e join users u on u.id = e.user_id where e.id = ${eventId}`;
  if (!row) return;

  const link = `${config().APP_URL}/t/${jobId}`;
  if (row.email) await sendEmail(row.email as string, link);
  if (row.phone) await sendWhatsApp(row.phone as string, link);
}

async function sendEmail(to: string, link: string) {
  // Wire to a transactional provider before milestone 3 ships. Logged, not
  // silently dropped, so a missing integration is visible in the worker log.
  console.log(`[deliver] email -> ${to}: ${link}`);
}

async function sendWhatsApp(to: string, link: string) {
  // WhatsApp Cloud API template message. Requires an approved template.
  console.log(`[deliver] whatsapp -> ${to}: ${link}`);
}

/** A wa.me deep link the family can tap to forward the trailer themselves. */
export function whatsappShareUrl(link: string, caption: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${caption}\n${link}`)}`;
}
