import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "../config";

export async function withTempDir<T>(prefix: string, fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `chitrakathe-${prefix}-`));
  try {
    return await fn(dir);
  } finally {
    if (!config().DEBUG_KEEP_TEMP) await fs.rm(dir, { recursive: true, force: true });
    else console.log(`[tmp] kept ${dir}`);
  }
}

export const rid = () => crypto.randomBytes(8).toString("hex");
