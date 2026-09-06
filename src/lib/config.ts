import { z } from "zod";

/** Coerce "1"/"true"/"yes" to boolean. */
const bool = z
  .string()
  .optional()
  .transform((v) => v === "1" || v === "true" || v === "yes");

const int = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? def : Number(v)))
    .pipe(z.number().int());

const Schema = z.object({
  DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/chitrakathe"),
  APP_URL: z.string().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./storage"),
  S3_BUCKET: z.string().default(""),
  S3_REGION: z.string().default("auto"),
  S3_ENDPOINT: z.string().default(""),
  S3_ACCESS_KEY_ID: z.string().default(""),
  S3_SECRET_ACCESS_KEY: z.string().default(""),
  S3_PUBLIC_BASE_URL: z.string().default(""),

  VIDEO_PROVIDERS: z.string().default("stub,stub"),
  VIDEO_MODEL_PRIMARY: z.string().default("fal-ai/bytedance/seedance/v1/lite/image-to-video"),
  VIDEO_MODEL_SECONDARY: z.string().default("wan-video/wan-2.5-i2v"),
  FAL_KEY: z.string().default(""),
  REPLICATE_API_TOKEN: z.string().default(""),

  TTS_PROVIDER: z.enum(["sarvam", "elevenlabs", "stub"]).default("stub"),
  SARVAM_API_KEY: z.string().default(""),
  ELEVENLABS_API_KEY: z.string().default(""),

  MODERATION_PROVIDER: z.enum(["sightengine", "stub"]).default("stub"),
  SIGHTENGINE_USER: z.string().default(""),
  SIGHTENGINE_SECRET: z.string().default(""),

  RAZORPAY_KEY_ID: z.string().default(""),
  RAZORPAY_KEY_SECRET: z.string().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(""),

  PRICE_LAUNCH_PAISE: int(49900),
  PRICE_RERENDER_PAISE: int(14900),
  COST_CEILING_PAISE: int(9500),
  USD_INR_RATE: int(89),

  FFMPEG_PATH: z.string().default("ffmpeg"),
  FFPROBE_PATH: z.string().default("ffprobe"),
  CHROMIUM_PATH: z.string().default("/opt/pw-browsers/chromium-1194/chrome-linux/chrome"),

  ASSET_RETENTION_DAYS: int(30),
  OUTPUT_RETENTION_DAYS: int(90),

  ADMIN_TOKEN: z.string().default(""),
  DEBUG_KEEP_TEMP: bool,
});

export type Config = z.infer<typeof Schema>;

let cached: Config | null = null;

export function config(): Config {
  if (!cached) cached = Schema.parse(process.env);
  return cached;
}

/** Ordered provider chain, e.g. ["fal", "replicate"]. Always at least two entries. */
export function videoProviderChain(): string[] {
  const chain = config()
    .VIDEO_PROVIDERS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (chain.length < 2) {
    throw new Error(
      `VIDEO_PROVIDERS must configure at least two providers (got ${chain.length}). ` +
        `Model pricing and availability move monthly; a single provider is not a valid deployment.`
    );
  }
  return chain;
}
