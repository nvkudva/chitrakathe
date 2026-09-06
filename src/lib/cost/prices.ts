/**
 * Price table. Every number here is a claim about the outside world and will
 * go stale — that is why nothing else in the codebase hardcodes a price.
 *
 * Sources and date of check live in `checkedOn`. Re-verify monthly; the
 * cost dashboard flags a table older than 45 days.
 */
export const PRICES_CHECKED_ON = "2026-09-05";

export type VideoPrice = {
  provider: "fal" | "replicate" | "stub";
  model: string;
  /** USD per generated second of output. */
  usdPerSecond: number;
  maxResolution: "480p" | "720p" | "1080p";
  note?: string;
};

export const VIDEO_PRICES: VideoPrice[] = [
  {
    provider: "fal",
    model: "fal-ai/bytedance/seedance/v1/lite/image-to-video",
    usdPerSecond: 0.052,
    maxResolution: "720p",
    note: "~$0.26 per 5s 720p clip. Primary. Best cost per finished minute of trailer.",
  },
  {
    provider: "fal",
    model: "fal-ai/wan/v2.5/image-to-video",
    usdPerSecond: 0.05,
    maxResolution: "480p",
    note: "Cheapest, but 480p forces an upscale into a 1080p master.",
  },
  {
    provider: "fal",
    model: "fal-ai/kling-video/v2.5/image-to-video",
    usdPerSecond: 0.224,
    maxResolution: "1080p",
    note: "4x primary. Quality headroom we do not need for 10s of B-roll on a phone.",
  },
  {
    provider: "fal",
    model: "fal-ai/veo/3.1/image-to-video",
    usdPerSecond: 0.2,
    maxResolution: "1080p",
    note: "$0.40/s with audio. Reference point only.",
  },
  {
    provider: "replicate",
    model: "wan-video/wan-2.5-i2v",
    usdPerSecond: 0.06,
    maxResolution: "720p",
    note: "Configured secondary. Exists so a fal outage the day before a wedding is survivable.",
  },
  { provider: "stub", model: "stub", usdPerSecond: 0, maxResolution: "1080p", note: "Local development." },
];

export function videoPrice(provider: string, model: string): VideoPrice {
  const p = VIDEO_PRICES.find((x) => x.provider === provider && x.model === model);
  if (!p) {
    throw new Error(
      `No price entry for ${provider}/${model}. Add it to src/lib/cost/prices.ts. ` +
        `Rendering with an unpriced model is not allowed — the ceiling could not be enforced.`
    );
  }
  return p;
}

/** Sarvam Bulbul: Rs 30 per 10,000 characters. */
export const TTS_PAISE_PER_1K_CHARS: Record<string, number> = {
  sarvam: 300,
  elevenlabs: 900,
  stub: 0,
};

/** Per image checked. */
export const MODERATION_PAISE_PER_IMAGE: Record<string, number> = {
  sightengine: 10,
  stub: 0,
};

/** Worker CPU, amortised. Paise per second of wall clock on the render box. */
export const COMPUTE_PAISE_PER_SECOND = 0.9;

/** Storage + CDN, paise per MB held for the full retention window. */
export const STORAGE_PAISE_PER_MB = 0.014;
