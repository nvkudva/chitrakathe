import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "@/lib/config";
import { verify } from "@/lib/storage/local";

/**
 * Serves the local storage driver behind the same signed-URL contract as S3,
 * so dev and production exercise identical code paths. Not used when
 * STORAGE_DRIVER=s3.
 */
function resolveKey(key: string): string {
  const root = path.resolve(config().STORAGE_LOCAL_DIR);
  const p = path.resolve(root, key);
  if (!p.startsWith(root)) throw new Error("Key escapes storage root");
  return p;
}

const TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(req: Request, ctx: { params: Promise<{ key: string }> }) {
  if (config().STORAGE_DRIVER !== "local") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { key } = await ctx.params;
  const decoded = decodeURIComponent(key);
  const url = new URL(req.url);
  if (!verify(decoded, url.searchParams.get("exp") ?? "", url.searchParams.get("sig") ?? "")) {
    return NextResponse.json({ error: "Expired or invalid link" }, { status: 403 });
  }
  const file = await fs.readFile(resolveKey(decoded));
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "content-type": TYPES[path.extname(decoded)] ?? "application/octet-stream",
      "cache-control": "private, max-age=300",
    },
  });
}

export async function PUT(req: Request, ctx: { params: Promise<{ key: string }> }) {
  if (config().STORAGE_DRIVER !== "local") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { key } = await ctx.params;
  const decoded = decodeURIComponent(key);
  const url = new URL(req.url);
  if (!verify(decoded, url.searchParams.get("exp") ?? "", url.searchParams.get("sig") ?? "")) {
    return NextResponse.json({ error: "Expired or invalid link" }, { status: 403 });
  }
  const p = resolveKey(decoded);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, Buffer.from(await req.arrayBuffer()));
  return NextResponse.json({ ok: true });
}
