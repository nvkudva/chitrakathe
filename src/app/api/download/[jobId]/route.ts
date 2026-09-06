import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { isUnlocked } from "@/lib/payments";
import * as repo from "@/lib/repo";

/**
 * The paywall. The unwatermarked master exists from the moment the render
 * finishes — payment only unlocks the URL, so a purchase costs no model
 * seconds. See prd.md 5.
 */
export async function GET(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;
  const aspect = new URL(req.url).searchParams.get("aspect") ?? "9:16";

  const job = await repo.getJob(jobId);
  if (!job) return NextResponse.json({ error: "No such job" }, { status: 404 });
  if (job.status !== "succeeded") return NextResponse.json({ error: "Render is not finished" }, { status: 409 });
  if (!(await isUnlocked(job.event_id))) {
    return NextResponse.json({ error: "Not unlocked", needsPayment: "unlock" }, { status: 402 });
  }

  const outputs = await repo.outputsFor(jobId);
  const out = outputs.find((o) => o.aspect === aspect);
  if (!out) return NextResponse.json({ error: `No ${aspect} output` }, { status: 404 });

  const url = await storage().signedDownload(out.master_key as string, 900);
  return NextResponse.redirect(url, 302);
}
