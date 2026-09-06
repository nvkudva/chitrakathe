import crypto from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../config";

/**
 * Google sign-in, hand-rolled for the same reason Razorpay is: the flow is two
 * redirects and a signed-token check, which is less surface than a dependency
 * that brings its own session store, its own tables and its own opinions about
 * our users table.
 *
 * The cryptography is NOT hand-rolled — `jose` verifies Google's RS256
 * signature against their published JWKS. What we own is the state/nonce
 * handshake and our own session cookie.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export type GoogleProfile = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

export function isConfigured(): boolean {
  const c = config();
  return Boolean(c.GOOGLE_CLIENT_ID && c.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(): string {
  return `${config().APP_URL}/api/auth/callback`;
}

/**
 * Builds the consent URL plus the one-time state and nonce that bind the
 * eventual callback to this browser. Both go in a short-lived httpOnly cookie;
 * neither is ever trusted from the query string alone.
 */
export function beginSignIn(): { url: string; state: string; nonce: string } {
  const state = crypto.randomBytes(24).toString("base64url");
  const nonce = crypto.randomBytes(24).toString("base64url");
  const params = new URLSearchParams({
    client_id: config().GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    // A family on a shared phone must not be silently signed in as whoever
    // used it last.
    prompt: "select_account",
  });
  return { url: `${AUTH_ENDPOINT}?${params}`, state, nonce };
}

/** Exchanges the code and verifies the ID token. Throws on anything unexpected. */
export async function completeSignIn(code: string, expectedNonce: string): Promise<GoogleProfile> {
  const c = config();
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.GOOGLE_CLIENT_ID,
      client_secret: c.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed ${res.status}: ${await res.text()}`);

  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new Error("Google returned no id_token");

  const { payload } = await jwtVerify(id_token, jwks, {
    issuer: ISSUERS,
    audience: c.GOOGLE_CLIENT_ID,
    clockTolerance: 60,
  });

  if (payload.nonce !== expectedNonce) throw new Error("Nonce mismatch — this sign-in was not started here");
  if (!payload.sub || !payload.email) throw new Error("Google profile is missing sub or email");
  if (payload.email_verified === false) throw new Error("Google email is not verified");

  return {
    sub: String(payload.sub),
    email: String(payload.email),
    name: payload.name ? String(payload.name) : undefined,
    picture: payload.picture ? String(payload.picture) : undefined,
  };
}
