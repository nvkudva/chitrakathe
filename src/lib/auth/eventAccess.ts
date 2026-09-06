import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "../db";
import { currentSession } from "./session";

/**
 * Who is allowed to act on an event.
 *
 * An event can be created before anyone signs in, so ownership is either:
 *   - the signed-in user the event belongs to, or
 *   - possession of the event's access token, handed to whoever created it.
 *
 * Both are checked server-side. Holding the event *id* is never enough: ids
 * appear in URLs and logs, and the upload keys derived from them are
 * deterministic.
 */
export const EVENT_TOKEN_HEADER = "x-event-token";

export const newAccessToken = () => crypto.randomBytes(24).toString("hex");

/** RFC 4122 shape. Anything else must never reach a uuid column — Postgres throws. */
export const isUuid = (v: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export type EventAccess =
  | { ok: true; eventId: string; userId: string }
  | { ok: false; response: NextResponse };

export async function authorizeEvent(eventId: string, req: Request): Promise<EventAccess> {
  if (!isUuid(eventId)) {
    return { ok: false, response: NextResponse.json({ error: "No such event" }, { status: 404 }) };
  }

  const [event] = await sql()`select id, user_id, access_token from events where id = ${eventId}`;
  if (!event) {
    return { ok: false, response: NextResponse.json({ error: "No such event" }, { status: 404 }) };
  }

  const session = await currentSession();
  if (session && event.user_id === session.userId) {
    return { ok: true, eventId, userId: session.userId };
  }

  const presented = req.headers.get(EVENT_TOKEN_HEADER) ?? "";
  const expected = String(event.access_token ?? "");
  if (expected && presented.length === expected.length) {
    const a = Buffer.from(presented);
    const b = Buffer.from(expected);
    if (crypto.timingSafeEqual(a, b)) {
      return { ok: true, eventId, userId: event.user_id as string };
    }
  }

  return {
    ok: false,
    response: NextResponse.json({ error: "This event belongs to someone else" }, { status: 403 }),
  };
}
