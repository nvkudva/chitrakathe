import { spawn } from "node:child_process";
import { config } from "../config";

export class FfmpegError extends Error {}

function run(bin: string, args: string[], label: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve(out || err);
      else reject(new FfmpegError(`${label} exited ${code}\n${err.slice(-4000)}`));
    });
  });
}

export const ffmpeg = (args: string[]) => run(config().FFMPEG_PATH, ["-hide_banner", "-loglevel", "error", ...args], "ffmpeg");

export const ffprobe = (args: string[]) => run(config().FFPROBE_PATH, args, "ffprobe");

export async function durationOf(file: string): Promise<number> {
  const out = await ffprobe([
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  return Number(out.trim());
}

export async function dimensionsOf(file: string): Promise<{ width: number; height: number }> {
  const out = await ffprobe([
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height",
    "-of", "csv=p=0",
    file,
  ]);
  const [w, h] = out.trim().split(",").map(Number);
  return { width: w ?? 0, height: h ?? 0 };
}
