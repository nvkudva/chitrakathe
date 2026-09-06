import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth/session";
import { isConfigured } from "@/lib/auth/google";

export async function GET() {
  const s = await currentSession();
  return NextResponse.json({
    signedIn: Boolean(s),
    googleConfigured: isConfigured(),
    user: s ? { email: s.email, name: s.name, picture: s.picture } : null,
  });
}
