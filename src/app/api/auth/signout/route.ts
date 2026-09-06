import { NextResponse } from "next/server";
import { SESSION_COOKIE, cookieOptions } from "@/lib/auth/session";

/** POST only: signing someone out must not be reachable by a stray <img src>. */
export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/", new URL(req.url).origin), 302);
  res.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
  return res;
}
