import { NextResponse } from "next/server";
import { z } from "zod";
import { storage, keys } from "@/lib/storage";
import { checkUploadShape } from "@/lib/moderation";
import { getTemplate } from "@/lib/templates";
import * as repo from "@/lib/repo";

const Body = z.object({
  files: z
    .array(z.object({ contentType: z.string(), bytes: z.number().int().positive() }))
    .min(1)
    .max(10),
});

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

/** Hands back presigned PUTs. The browser uploads straight to object storage. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const event = await repo.getEvent(id);
  if (!event) return NextResponse.json({ error: "No such event" }, { status: 404 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const template = getTemplate(event.template_id, event.template_version);
  const { min, max } = template.photosRequired;
  const n = parsed.data.files.length;
  if (n < min || n > max) {
    return NextResponse.json({ error: `This template needs between ${min} and ${max} photos` }, { status: 400 });
  }

  const store = storage();
  const out = [];
  for (const [i, f] of parsed.data.files.entries()) {
    const problem = checkUploadShape(f.bytes, f.contentType);
    if (problem) return NextResponse.json({ error: problem, index: i }, { status: 400 });
    const key = keys.upload(id, i, EXT[f.contentType] ?? "jpg");
    out.push({ position: i, key, ...(await store.signedUpload(key, f.contentType)) });
  }
  return NextResponse.json({ uploads: out });
}
