import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "@/lib/config";
import { verify } from "@/lib/storage/local";
import { MAX_UPLOAD_BYTES } from "@/lib/moderation";

/**
 * Serves the local storage driver behind the same signed-URL contract as S3,
 * so dev and production exercise identical code paths. Not used when
 * STORAGE_DRIVER=s3.
 */
function resolveKey(key: string): string {
  const root = path.resolve(config().STORAGE_LOCAL_DIR);
  const p = path.resolve(root, key);
  if (p !== root && !p.startsWith(root + path.sep)) throw new Error("Key escapes storage root");
  return p;
}

const TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function handleGET(req: Request, ctx: { params: Promise<{ key: string }> }) {
  if (config().STORAGE_DRIVER !== "local") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { key } = await ctx.params;
  const decoded = decodeURIComponent(key);
  const url = new URL(req.url);
  if (!verify(decoded, url.searchParams.get("exp") ?? "", url.searchParams.get("sig") ?? "")) {
    return NextResponse.json({ error: "Expired or invalid link" }, { status: 403 });
  }
  let file: Buffer;
  try {
    file = await fs.readFile(resolveKey(decoded));
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // `dl` is outside the signature on purpose: it only names the saved file and
  // cannot widen access to anything the signature does not already allow.
  const dl = url.searchParams.get("dl");
  const headers: Record<string, string> = {
    "content-type": TYPES[path.extname(decoded)] ?? "application/octet-stream",
    "cache-control": "private, max-age=300",
  };
  if (dl) headers["content-disposition"] = `attachment; filename="${dl.replace(/[^\w.\-]/g, "_")}"`;
  // Length and range support, so a preview can be seeked instead of streamed
  // whole. The S3 driver gets this from the store; the local one must say so.
  headers["content-length"] = String(file.byteLength);
  headers["accept-ranges"] = "bytes";

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), file.byteLength - 1) : file.byteLength - 1;
    if (start >= file.byteLength || start > end) {
      return new NextResponse(null, { status: 416, headers: { "content-range": `bytes */${file.byteLength}` } });
    }
    const slice = file.subarray(start, end + 1);
    return new NextResponse(new Uint8Array(slice), {
      status: 206,
      headers: {
        ...headers,
        "content-length": String(slice.byteLength),
        "content-range": `bytes ${start}-${end}/${file.byteLength}`,
      },
    });
  }
  return new NextResponse(new Uint8Array(file), { headers });
}

async function handlePUT(req: Request, ctx: { params: Promise<{ key: string }> }) {
  if (config().STORAGE_DRIVER !== "local") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { key } = await ctx.params;
  const decoded = decodeURIComponent(key);
  const url = new URL(req.url);
  if (!verify(decoded, url.searchParams.get("exp") ?? "", url.searchParams.get("sig") ?? "")) {
    return NextResponse.json({ error: "Expired or invalid link" }, { status: 403 });
  }
  // The signature covers the key and the expiry, not the size, so the cap is
  // enforced here. Without it a URL minted for a 200 KB photo accepted 20 MB.
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Too large" }, { status: 413 });
  }
  const body = Buffer.from(await req.arrayBuffer());
  if (body.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Too large" }, { status: 413 });
  }

  let p: string;
  try {
    p = resolveKey(decoded);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, body);
  return NextResponse.json({ ok: true });
}

export const GET = guard("api/files GET", handleGET);
export const PUT = guard("api/files PUT", handlePUT);
