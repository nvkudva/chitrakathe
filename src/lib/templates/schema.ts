import { z } from "zod";

/**
 * The storyboard schema. This is the product.
 *
 * Design rules encoded here, not left to convention:
 *  - The shot vocabulary is CLOSED. New expressive capability needs code;
 *    new templates do not.
 *  - `generative` shots may only depict objects or environments. "person" is
 *    not a member of the union, so likeness generation cannot be authored.
 *  - `maxGenerativeShots` is validated, so a template cannot quietly grow past
 *    the cost ceiling.
 */

export const LANGUAGES = ["kn", "kok", "hi", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export const SCRIPTS = ["kannada", "devanagari", "latin"] as const;
export type Script = (typeof SCRIPTS)[number];

export const ASPECTS = ["9:16", "1:1"] as const;
export type Aspect = (typeof ASPECTS)[number];

/** Closed vocabulary of camera moves the compositor knows how to execute. */
export const MOTIONS = [
  "push_in",
  "push_out",
  "drift_left",
  "drift_right",
  "tilt_up",
  "tilt_down",
  "hold",
] as const;

export const Ease = z.enum(["linear", "ease_in_out", "ease_out"]).default("ease_in_out");

/** A slot the brief form fills. `key` is looked up in the brief's `fields`. */
export const TextSlot = z.object({
  key: z.string(),
  /** i18n key for a fixed line; mutually exclusive with `key` at render time. */
  stringKey: z.string().optional(),
  style: z.enum(["hero", "title", "subtitle", "body", "lower_third", "caption"]),
  align: z.enum(["left", "center", "right"]).default("center"),
  /** Seconds into the shot at which this line starts animating. */
  delay: z.number().min(0).default(0),
});
export type TextSlot = z.infer<typeof TextSlot>;

const ShotBase = {
  id: z.string(),
  /** Seconds. */
  duration: z.number().positive().max(12),
  note: z.string().optional(),
};

export const TitleCardShot = z.object({
  ...ShotBase,
  type: z.literal("title_card"),
  /** Optional background photo index; when absent the card sits on the palette. */
  photo: z.number().int().min(0).optional(),
  /** 0..1 darkening applied over the background photo. */
  scrim: z.number().min(0).max(1).default(0.55),
  lines: z.array(TextSlot).min(1).max(4),
  motion: z.enum(MOTIONS).default("hold"),
});

export const PhotoMotionShot = z.object({
  ...ShotBase,
  type: z.literal("photo_motion"),
  photo: z.number().int().min(0),
  motion: z.enum(MOTIONS),
  /** Start and end zoom. 1.0 = fit. */
  zoom: z.tuple([z.number().min(1).max(2), z.number().min(1).max(2)]).default([1.0, 1.1]),
  ease: Ease,
  /** Where to keep the subject when cropping to the target aspect. */
  anchor: z.enum(["center", "top", "bottom"]).default("center"),
  lines: z.array(TextSlot).max(3).default([]),
});

export const PhotoMontageShot = z.object({
  ...ShotBase,
  type: z.literal("photo_montage"),
  photos: z.array(z.number().int().min(0)).min(2).max(6),
  /** Seconds per still. duration must equal photos.length * per. */
  per: z.number().positive(),
  transition: z.enum(["cut", "whip", "dissolve"]).default("cut"),
});

export const GenerativeShot = z.object({
  ...ShotBase,
  type: z.literal("generative"),
  /**
   * Objects and environments only. There is deliberately no "person" member:
   * v1 does not generate human likeness. See prd.md §10.
   */
  subject: z.enum(["object", "environment"]),
  /** Authored prompt. Never assembled from family-supplied free text. */
  prompt: z.string().min(10),
  /** Optional seed photo index for image-to-video. */
  seedPhoto: z.number().int().min(0).optional(),
  /** Fallback when the model is unavailable or the ceiling is hit. */
  fallback: z.object({
    type: z.literal("photo_motion"),
    photo: z.number().int().min(0),
    motion: z.enum(MOTIONS),
  }),
  motion: z.enum(MOTIONS).default("hold"),
});

export const LowerThirdShot = z.object({
  ...ShotBase,
  type: z.literal("lower_third"),
  photo: z.number().int().min(0),
  motion: z.enum(MOTIONS).default("hold"),
  lines: z.array(TextSlot).min(1).max(3),
});

/** An explicit exclusion every generative prompt must carry. */
const NO_PEOPLE = /,?\s*no (people|humans|persons|faces)\.?\s*$/i;

/** Human subject words that may not appear outside that exclusion. */
const HUMAN_SUBJECT = /\b(face|person|people|human|man|woman|men|women|child|children|baby|couple|bride|groom|portrait)\b/i;

export const Shot = z.discriminatedUnion("type", [
  TitleCardShot,
  PhotoMotionShot,
  PhotoMontageShot,
  GenerativeShot,
  LowerThirdShot,
]);
export type Shot = z.infer<typeof Shot>;

export const Palette = z.object({
  bg: z.string(),
  ink: z.string(),
  accent: z.string(),
  muted: z.string(),
  /**
   * The accent as TEXT on the paper chrome (#FFFBF4), authored so it clears
   * 4.5:1. `accent` itself stays the fill colour used inside the film, where it
   * sits on the template's own dark grounds and would be muddy on cream.
   * Optional: lib/theme.ts darkens `accent` as a fallback.
   */
  accentOnPaper: z.string().optional(),
});

export const Typography = z.object({
  /** Font family stacks per script. Must be installed on the render host. */
  hero: z.record(z.enum(SCRIPTS), z.string()),
  body: z.record(z.enum(SCRIPTS), z.string()),
  heroSize: z.number().default(118),
  titleSize: z.number().default(74),
  bodySize: z.number().default(44),
});

/**
 * What each photo index is FOR.
 *
 * The storyboard consumes photos by index with fixed semantic roles — photo 0
 * of the namakarana template gets a centre-weighted push-in on a face. Without
 * this, the form collects camera-roll order and the montage gets the best
 * photo while a group shot gets a face crop of somebody's shoulder.
 *
 * Roles are a closed list so their labels live once in the UI bundle rather
 * than being translated per template.
 */
export const PHOTO_ROLES = [
  "face_close", "family_hands", "parents", "elders", "montage", "wide_backdrop",
  "partner_a", "partner_b", "couple_wide", "couple_close",
  "newborn", "milestone", "house_exterior", "threshold", "interior", "family_group",
] as const;
export type PhotoRole = (typeof PHOTO_ROLES)[number];

export const FieldDef = z.object({
  key: z.string(),
  labelKey: z.string(),
  type: z.enum(["text", "date", "time", "textarea"]),
  required: z.boolean().default(true),
  maxLength: z.number().int().default(60),
  /** Rendered in the family's chosen script; never machine-translated. */
  script: z.enum(["family", "latin"]).default("family"),
});

export const Template = z
  .object({
    id: z.string(),
    version: z.number().int().min(1),
    occasion: z.enum(["namakarana", "save_the_date", "first_birthday", "griha_pravesha"]),
    name: z.record(z.enum(LANGUAGES), z.string()),
    blurb: z.record(z.enum(LANGUAGES), z.string()),
    region: z.string(),
    /** Default script per language for this template's region. */
    defaultScript: z.record(z.enum(LANGUAGES), z.enum(SCRIPTS)),
    photosRequired: z.object({ min: z.number().int(), max: z.number().int() }),
    music: z.enum(["temple-warm", "strings-swell", "playful-strings", "nadaswaram-soft"]),
    palette: Palette,
    typography: Typography,
    fields: z.array(FieldDef).min(1),
    /** Fixed on-screen and voiceover copy, authored per language. */
    strings: z.record(z.enum(LANGUAGES), z.record(z.string(), z.string())),
    /** 2-4 short voiceover lines, referencing `strings` keys or brief fields. */
    voiceover: z.array(z.string()).max(4).default([]),
    shots: z.array(Shot).min(4),
    /** Enforced cap; see prd.md §9. */
    maxGenerativeShots: z.number().int().min(0).max(3).default(2),
    /** Index-aligned with the storyboard's photo references. */
    photoSlots: z.array(z.enum(PHOTO_ROLES)).min(1),
  })
  .superRefine((t, ctx) => {
    const gen = t.shots.filter((s) => s.type === "generative").length;
    if (gen > t.maxGenerativeShots) {
      ctx.addIssue({
        code: "custom",
        message: `Template ${t.id} has ${gen} generative shots but maxGenerativeShots is ${t.maxGenerativeShots}. Cut shots until it fits the cost ceiling (prd.md §9).`,
      });
    }
    for (const s of t.shots) {
      if (s.type === "photo_montage") {
        const expected = +(s.photos.length * s.per).toFixed(3);
        if (Math.abs(expected - s.duration) > 0.01) {
          ctx.addIssue({
            code: "custom",
            message: `Shot ${s.id}: duration ${s.duration}s != photos(${s.photos.length}) * per(${s.per}) = ${expected}s`,
          });
        }
      }
    }
    // The no-likeness rule (prd.md 10) is enforced here so it cannot be
    // authored away in a JSON file: every generative prompt must carry an
    // explicit exclusion, and may not name a human subject outside it.
    for (const s of t.shots) {
      if (s.type !== "generative") continue;
      if (!NO_PEOPLE.test(s.prompt)) {
        ctx.addIssue({
          code: "custom",
          message: `Shot ${s.id}: generative prompts must end with an explicit "no people" exclusion (prd.md 10)`,
        });
      }
      const withoutExclusion = s.prompt.replace(NO_PEOPLE, "");
      if (HUMAN_SUBJECT.test(withoutExclusion)) {
        ctx.addIssue({
          code: "custom",
          message: `Shot ${s.id}: generative prompt names a human subject. v1 does not generate likeness.`,
        });
      }
    }
    // Every photo the storyboard names must have a slot the form can ask for.
    const referenced = new Set<number>();
    for (const s of t.shots) {
      if ("photo" in s && typeof s.photo === "number") referenced.add(s.photo);
      if (s.type === "photo_montage") s.photos.forEach((n) => referenced.add(n));
      if (s.type === "generative") {
        if (s.seedPhoto !== undefined) referenced.add(s.seedPhoto);
        referenced.add(s.fallback.photo);
      }
    }
    const highest = Math.max(...referenced);
    if (t.photoSlots.length <= highest) {
      ctx.addIssue({
        code: "custom",
        message: `Template ${t.id} references photo ${highest} but declares only ${t.photoSlots.length} photo slots`,
      });
    }
    if (t.photoSlots.length < t.photosRequired.min) {
      ctx.addIssue({
        code: "custom",
        message: `Template ${t.id} asks for ${t.photosRequired.min} photos but labels only ${t.photoSlots.length}`,
      });
    }

    const ids = t.shots.map((s) => s.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", message: `Template ${t.id} has duplicate shot ids` });
    }
  });

export type Template = z.infer<typeof Template>;

export const totalDuration = (t: Template): number =>
  +t.shots.reduce((a, s) => a + s.duration, 0).toFixed(2);

export const generativeShots = (t: Template) =>
  t.shots.filter((s): s is Extract<Shot, { type: "generative" }> => s.type === "generative");

/** What a family actually submits. */
export const Brief = z.object({
  templateId: z.string(),
  templateVersion: z.number().int(),
  language: z.enum(LANGUAGES),
  script: z.enum(SCRIPTS).optional(),
  fields: z.record(z.string(), z.string()),
  /** Ordered storage keys, index-aligned with `photo` references in shots. */
  photos: z.array(z.string()).min(1),
  aspects: z.array(z.enum(ASPECTS)).min(1).default(["9:16", "1:1"]),
});
export type Brief = z.infer<typeof Brief>;
