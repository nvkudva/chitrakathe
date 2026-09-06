import { ffmpeg } from "../../render/ffmpeg";
import { withTempDir } from "../../render/tmp";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { GenerateRequest, GenerateResult, VideoProvider } from "./index";

/**
 * Local development provider. Costs nothing and produces a real, playable MP4
 * so the compositor, the queue and the cost ledger can be exercised end to end
 * without spending money or needing network access.
 *
 * It renders a slow gradient wash with the prompt's first words burned in, so
 * a developer can see which shot came from the model.
 */
export class StubVideoProvider implements VideoProvider {
  readonly name = "stub";
  readonly model = "stub";

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const [w, h] = req.aspect === "9:16" ? [1080, 1920] : [1080, 1080];
    return withTempDir("stub", async (dir) => {
      const out = path.join(dir, "clip.mp4");
      const hue = (req.prompt.length * 37) % 360;
      await ffmpeg([
        "-f", "lavfi",
        "-i", `gradients=s=${w}x${h}:d=${req.seconds}:r=30:c0=0x1a0d10:c1=0x${hueHex(hue)}:speed=0.06`,
        "-vf", "noise=alls=6:allf=t,vignette",
        "-t", String(req.seconds),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast",
        "-y", out,
      ]);
      const mp4 = await fs.readFile(out);
      return { mp4, provider: this.name, model: this.model, seconds: req.seconds };
    });
  }
}

function hueHex(h: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    const v = 0.55 - 0.35 * Math.max(Math.min(k, 4 - k, 1), 0);
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `${f(5)}${f(3)}${f(1)}`;
}
