import { config } from "../config";
import { usdToPaise, type Paise } from "../money";
import { videoPrice, TTS_PAISE_PER_1K_CHARS, MODERATION_PAISE_PER_IMAGE, COMPUTE_PAISE_PER_SECOND, STORAGE_PAISE_PER_MB } from "./prices";

export type CostKind = "video_model" | "tts" | "moderation" | "compute" | "storage";

export type CostEntry = {
  kind: CostKind;
  label: string;
  /** Units in the kind's natural measure: seconds, characters, images, MB. */
  units: number;
  amountPaise: Paise;
  meta?: Record<string, unknown>;
};

export class CostCeilingExceeded extends Error {
  constructor(
    readonly spentPaise: Paise,
    readonly wouldAddPaise: Paise,
    readonly ceilingPaise: Paise
  ) {
    super(
      `Cost ceiling would be exceeded: spent ${spentPaise}p + ${wouldAddPaise}p > ceiling ${ceilingPaise}p. ` +
        `Refusing rather than overrunning.`
    );
    this.name = "CostCeilingExceeded";
  }
}

type Persist = (jobId: string, entry: CostEntry) => Promise<void>;

/**
 * A per-job cost ledger with a hard ceiling.
 *
 * Every priced operation calls `charge()` BEFORE doing the work. If the charge
 * would cross the ceiling, it throws and the caller degrades — drops a
 * generative shot to its fallback, or fails the job. Nothing in this codebase
 * is allowed to spend without going through here.
 */
export class CostLedger {
  private entries: CostEntry[] = [];
  readonly ceilingPaise: Paise;

  constructor(
    readonly jobId: string,
    private persist: Persist = async () => {},
    ceilingPaise?: Paise
  ) {
    this.ceilingPaise = ceilingPaise ?? config().COST_CEILING_PAISE;
  }

  get spentPaise(): Paise {
    return this.entries.reduce((a, e) => a + e.amountPaise, 0);
  }

  get remainingPaise(): Paise {
    return this.ceilingPaise - this.spentPaise;
  }

  all(): readonly CostEntry[] {
    return this.entries;
  }

  /** True if `amount` fits without throwing. Use to decide on a fallback. */
  canAfford(amountPaise: Paise): boolean {
    return this.spentPaise + amountPaise <= this.ceilingPaise;
  }

  private async charge(entry: CostEntry): Promise<CostEntry> {
    if (!this.canAfford(entry.amountPaise)) {
      throw new CostCeilingExceeded(this.spentPaise, entry.amountPaise, this.ceilingPaise);
    }
    this.entries.push(entry);
    await this.persist(this.jobId, entry);
    return entry;
  }

  // ---- priced operations -------------------------------------------------

  quoteVideo(provider: string, model: string, seconds: number): Paise {
    return usdToPaise(videoPrice(provider, model).usdPerSecond * seconds, config().USD_INR_RATE);
  }

  chargeVideo(provider: string, model: string, seconds: number, shotId = "unknown") {
    return this.charge({
      kind: "video_model",
      label: `${provider}:${model}`,
      units: seconds,
      amountPaise: this.quoteVideo(provider, model, seconds),
      meta: { shotId, seconds },
    });
  }

  chargeTts(provider: string, characters: number) {
    const rate = TTS_PAISE_PER_1K_CHARS[provider] ?? 0;
    return this.charge({
      kind: "tts",
      label: provider,
      units: characters,
      amountPaise: Math.ceil((characters / 1000) * rate),
    });
  }

  chargeModeration(provider: string, images: number) {
    const rate = MODERATION_PAISE_PER_IMAGE[provider] ?? 0;
    return this.charge({ kind: "moderation", label: provider, units: images, amountPaise: Math.ceil(images * rate) });
  }

  chargeCompute(seconds: number) {
    return this.charge({
      kind: "compute",
      label: "worker",
      units: seconds,
      amountPaise: Math.ceil(seconds * COMPUTE_PAISE_PER_SECOND),
    });
  }

  chargeStorage(megabytes: number) {
    return this.charge({
      kind: "storage",
      label: "object-store",
      units: megabytes,
      amountPaise: Math.ceil(megabytes * STORAGE_PAISE_PER_MB),
    });
  }

  summary() {
    const byKind: Record<string, Paise> = {};
    for (const e of this.entries) byKind[e.kind] = (byKind[e.kind] ?? 0) + e.amountPaise;
    return { jobId: this.jobId, totalPaise: this.spentPaise, ceilingPaise: this.ceilingPaise, byKind };
  }
}
