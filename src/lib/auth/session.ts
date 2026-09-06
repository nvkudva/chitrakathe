import crypto from "node:crypto";
import { cookies } from "next/headers";
import { config } from "../config";
import { sql } from "../db";

/**
 * Session cookie: `<base64url payload>.<hmac>`, httpOnly, SameSite=Lax.
 *
 * Lax rather than Strict because Google redirects the browser back to us
 * cross-site; Strict would drop the cookie on the callback. Lax is safe here
 * because nothing state-changing is a top-level GET.
 */
export const SESSION_COOKIE = "ck_session";
export const OAUTH_COOKIE = "ck_oauth";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type Session = { userId: string; email: string; name?: string; picture?: string; exp: number };

function secret(): string {
  const s = config().SIGNING_SECRET;
  if (config().APP_URL.startsWith("https://") && s === "dev-only-signing-secret") {
    throw new Error("SIGNING_SECRET is still the development default on an https deployment");
  }
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function serialise(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Returns null for anything malformed, tampered with, or expired. */
export function parse(token: string | undefined): Session | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const mac = token.slice(dot + 1);

  const expected = sign(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(mac);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (!s.userId || !s.email || typeof s.exp !== "number") return null;
    if (s.exp * 1000 < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config().APP_URL.startsWith("https://"),
    path: "/",
    maxAge,
  };
}

export function newSession(user: { id: string; email: string; name?: string; picture?: string }): Session {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
}

export const SESSION_MAX_AGE = MAX_AGE_SECONDS;

/** The signed-in user for the current request, or null. */
export async function currentSession(): Promise<Session | null> {
  const jar = await cookies();
  return parse(jar.get(SESSION_COOKIE)?.value);
}

/**
 * Finds or creates the user behind a Google profile.
 *
 * Matching is by `google_sub` first and email second, so a family that gave us
 * an email before signing in keeps the same row — and with it their events,
 * their payments and their retention clock.
 */
export async function upsertGoogleUser(p: { sub: string; email: string; name?: string; picture?: string }) {
  const db = sql();
  const [existing] = await db`
    select * from users where google_sub = ${p.sub} or email = ${p.email} limit 1`;

  if (existing) {
    const [updated] = await db`
      update users set
        google_sub = ${p.sub},
        email = coalesce(email, ${p.email}),
        name = coalesce(${p.name ?? null}, name),
        avatar_url = coalesce(${p.picture ?? null}, avatar_url),
        last_seen_at = now()
      where id = ${existing.id} returning *`;
    return updated!;
  }

  const [created] = await db`
    insert into users (google_sub, email, name, avatar_url, last_seen_at)
    values (${p.sub}, ${p.email}, ${p.name ?? null}, ${p.picture ?? null}, now())
    returning *`;
  return created!;
}
