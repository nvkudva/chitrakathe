import { NextResponse } from "next/server";
import { completeSignIn } from "@/lib/auth/google";
import {
  OAUTH_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  cookieOptions,
  newSession,
  serialise,
  upsertGoogleUser,
} from "@/lib/auth/session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return NextResponse.redirect(new URL(`/?auth=${encodeURIComponent(error)}`, url.origin), 302);
  if (!code || !state) return NextResponse.redirect(new URL("/?auth=missing_code", url.origin), 302);

  const raw = req.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${OAUTH_COOKIE}=`))
    ?.slice(OAUTH_COOKIE.length + 1);

  let pending: { state: string; nonce: string; returnTo: string } | null = null;
  try {
    pending = raw ? JSON.parse(decodeURIComponent(raw)) : null;
  } catch {
    pending = null;
  }
  // The state must come back from the cookie we set, not from the query alone.
  if (!pending || pending.state !== state) {
    return NextResponse.redirect(new URL("/?auth=state_mismatch", url.origin), 302);
  }

  try {
    const profile = await completeSignIn(code, pending.nonce);
    const user = await upsertGoogleUser(profile);
    const session = newSession({
      id: user.id as string,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    });

    const res = NextResponse.redirect(new URL(pending.returnTo, url.origin), 302);
    res.cookies.set(SESSION_COOKIE, serialise(session), cookieOptions(SESSION_MAX_AGE));
    res.cookies.set(OAUTH_COOKIE, "", cookieOptions(0));
    return res;
  } catch (e) {
    console.error("[auth] sign-in failed:", (e as Error).message);
    return NextResponse.redirect(new URL("/?auth=failed", url.origin), 302);
  }
}
