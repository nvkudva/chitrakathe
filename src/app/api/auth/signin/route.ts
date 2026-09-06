import { NextResponse } from "next/server";
import { beginSignIn, isConfigured } from "@/lib/auth/google";
import { OAUTH_COOKIE, cookieOptions } from "@/lib/auth/session";

/** Starts the Google handshake. GET so it can be a plain link. */
export async function GET(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Google sign-in is not configured on this deployment" }, { status: 503 });
  }
  const returnTo = new URL(req.url).searchParams.get("returnTo") ?? "/";
  // Only ever return to our own paths — an open redirect here would let a
  // phishing page borrow our domain.
  const safeReturn = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";

  const { url, state, nonce } = beginSignIn();
  const res = NextResponse.redirect(url, 302);
  res.cookies.set(OAUTH_COOKIE, JSON.stringify({ state, nonce, returnTo: safeReturn }), cookieOptions(600));
  return res;
}
