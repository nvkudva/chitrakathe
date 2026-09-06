import { config, videoProviderChain } from "../../config";
import { FalVideoProvider } from "./fal";
import { ReplicateVideoProvider } from "./replicate";
import { StubVideoProvider } from "./stub";

export type GenerateRequest = {
  prompt: string;
  /** Image-to-video seed. Absent means text-to-video. */
  seedImage?: Buffer;
  seconds: number;
  aspect: "9:16" | "1:1";
  /** Only "object" and "environment" reach a provider. See prd.md §10. */
  subject: "object" | "environment";
};

export type GenerateResult = {
  mp4: Buffer;
  provider: string;
  model: string;
  /** Billable seconds as reported or assumed. */
  seconds: number;
};

export interface VideoProvider {
  readonly name: string;
  readonly model: string;
  generate(req: GenerateRequest): Promise<GenerateResult>;
}

function build(name: string, model: string): VideoProvider {
  switch (name) {
    case "fal":
      return new FalVideoProvider(model);
    case "replicate":
      return new ReplicateVideoProvider(model);
    case "stub":
      return new StubVideoProvider();
    default:
      throw new Error(`Unknown video provider "${name}"`);
  }
}

/**
 * The configured chain, primary first. At least two entries are required by
 * `videoProviderChain()` — model pricing and availability move monthly, so a
 * single-provider deployment is rejected at config time, not at 2am.
 */
export function videoProviders(): VideoProvider[] {
  const c = config();
  const chain = videoProviderChain();
  const models = [c.VIDEO_MODEL_PRIMARY, c.VIDEO_MODEL_SECONDARY];
  return chain.map((name, i) => build(name, name === "stub" ? "stub" : (models[i] ?? models[0]!)));
}
