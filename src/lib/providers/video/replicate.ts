import { config } from "../../config";
import type { GenerateRequest, GenerateResult, VideoProvider } from "./index";

/** Replicate. Configured secondary so a primary outage is survivable. */
export class ReplicateVideoProvider implements VideoProvider {
  readonly name = "replicate";
  constructor(readonly model: string) {}

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const token = config().REPLICATE_API_TOKEN;
    if (!token) throw new Error("REPLICATE_API_TOKEN is not set");

    const input: Record<string, unknown> = {
      prompt: req.prompt,
      duration: Math.round(req.seconds),
      aspect_ratio: req.aspect,
      resolution: "720p",
    };
    if (req.seedImage) input.image = `data:image/jpeg;base64,${req.seedImage.toString("base64")}`;

    const res = await fetch(`https://api.replicate.com/v1/models/${this.model}/predictions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json", Prefer: "wait=60" },
      body: JSON.stringify({ input }),
    });
    if (!res.ok) throw new Error(`replicate submit failed ${res.status}: ${await res.text()}`);

    let pred = (await res.json()) as { id: string; status: string; output?: string | string[]; urls: { get: string } };
    const deadline = Date.now() + 6 * 60_000;
    while (pred.status === "starting" || pred.status === "processing") {
      if (Date.now() > deadline) throw new Error("replicate generation timed out after 6 minutes");
      await new Promise((r) => setTimeout(r, 3000));
      pred = (await (await fetch(pred.urls.get, { headers: { Authorization: `Bearer ${token}` } })).json()) as typeof pred;
    }
    if (pred.status !== "succeeded") throw new Error(`replicate generation ${pred.status}`);

    const url = Array.isArray(pred.output) ? pred.output[0] : pred.output;
    if (!url) throw new Error("replicate returned no output url");
    const mp4 = Buffer.from(await (await fetch(url)).arrayBuffer());
    return { mp4, provider: this.name, model: this.model, seconds: req.seconds };
  }
}
