import { config } from "../../config";
import type { GenerateRequest, GenerateResult, VideoProvider } from "./index";

/** fal.ai queue API. Primary provider. */
export class FalVideoProvider implements VideoProvider {
  readonly name = "fal";
  constructor(readonly model: string) {}

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const key = config().FAL_KEY;
    if (!key) throw new Error("FAL_KEY is not set");

    const body: Record<string, unknown> = {
      prompt: req.prompt,
      duration: String(Math.round(req.seconds)),
      resolution: "720p",
      aspect_ratio: req.aspect === "9:16" ? "9:16" : "1:1",
    };
    if (req.seedImage) {
      body.image_url = `data:image/jpeg;base64,${req.seedImage.toString("base64")}`;
    }

    const submit = await fetch(`https://queue.fal.run/${this.model}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!submit.ok) throw new Error(`fal submit failed ${submit.status}: ${await submit.text()}`);
    const { status_url, response_url } = (await submit.json()) as {
      status_url: string;
      response_url: string;
    };

    const deadline = Date.now() + 6 * 60_000;
    for (;;) {
      if (Date.now() > deadline) throw new Error("fal generation timed out after 6 minutes");
      await new Promise((r) => setTimeout(r, 3000));
      const s = await fetch(status_url, { headers: { Authorization: `Key ${key}` } });
      const st = (await s.json()) as { status: string };
      if (st.status === "COMPLETED") break;
      if (st.status === "FAILED") throw new Error(`fal generation failed`);
    }

    const done = await fetch(response_url, { headers: { Authorization: `Key ${key}` } });
    const out = (await done.json()) as { video?: { url: string } };
    if (!out.video?.url) throw new Error(`fal returned no video url`);
    const mp4 = Buffer.from(await (await fetch(out.video.url)).arrayBuffer());
    return { mp4, provider: this.name, model: this.model, seconds: req.seconds };
  }
}
