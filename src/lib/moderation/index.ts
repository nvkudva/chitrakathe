import { config } from "../config";

export type ModerationVerdict = {
  allowed: boolean;
  provider: string;
  /** 0..1 per category. Stored for audit. */
  scores: Record<string, number>;
  reason?: string;
};

export interface ModerationProvider {
  readonly name: string;
  checkImage(image: Buffer, contentType: string): Promise<ModerationVerdict>;
}

/** Reject above these. Deliberately strict: these are family photos. */
const THRESHOLDS: Record<string, number> = { nudity: 0.3, gore: 0.2, violence: 0.35, offensive: 0.4 };

class SightengineModeration implements ModerationProvider {
  readonly name = "sightengine";
  async checkImage(image: Buffer): Promise<ModerationVerdict> {
    const c = config();
    if (!c.SIGHTENGINE_USER || !c.SIGHTENGINE_SECRET) throw new Error("Sightengine credentials are not set");
    const form = new FormData();
    form.set("media", new Blob([new Uint8Array(image)]), "photo.jpg");
    form.set("models", "nudity-2.1,gore-2.0,violence,offensive-2.0");
    form.set("api_user", c.SIGHTENGINE_USER);
    form.set("api_secret", c.SIGHTENGINE_SECRET);
    const res = await fetch("https://api.sightengine.com/1.0/check.json", { method: "POST", body: form });
    if (!res.ok) throw new Error(`sightengine failed ${res.status}`);
    const j = (await res.json()) as Record<string, any>;
    const scores: Record<string, number> = {
      nudity: 1 - (j.nudity?.none ?? 1),
      gore: j.gore?.prob ?? 0,
      violence: j.violence?.prob ?? 0,
      offensive: j.offensive?.prob ?? 0,
    };
    return verdict(this.name, scores);
  }
}

/** Local development. Allows everything and says so loudly. */
class StubModeration implements ModerationProvider {
  readonly name = "stub";
  async checkImage(): Promise<ModerationVerdict> {
    return { allowed: true, provider: this.name, scores: { nudity: 0, gore: 0, violence: 0, offensive: 0 } };
  }
}

function verdict(provider: string, scores: Record<string, number>): ModerationVerdict {
  for (const [k, limit] of Object.entries(THRESHOLDS)) {
    if ((scores[k] ?? 0) > limit) {
      return { allowed: false, provider, scores, reason: k };
    }
  }
  return { allowed: true, provider, scores };
}

export function moderationProvider(): ModerationProvider {
  return config().MODERATION_PROVIDER === "sightengine" ? new SightengineModeration() : new StubModeration();
}

/**
 * Non-negotiable local checks that run regardless of provider: they cost
 * nothing and catch the cases a remote classifier is not for.
 */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
export const MIN_LONG_EDGE = 1080;
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export function checkUploadShape(size: number, contentType: string): string | null {
  if (!ALLOWED_TYPES.includes(contentType)) return `Unsupported file type ${contentType}`;
  if (size > MAX_UPLOAD_BYTES) return `File is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`;
  if (size < 8 * 1024) return `File is too small to be a usable photo`;
  return null;
}
