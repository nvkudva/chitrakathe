import type { Script, Template, TextSlot } from "../templates/schema";

/**
 * The card look, as data.
 *
 * `cards.ts` builds an HTML document for headless Chromium; `StoryboardPreview`
 * builds React nodes for a browser. Both must agree on every per-style decision
 * or the live preview is a lie about the film the family is about to pay for.
 * So the decisions live here, once, in a module that imports nothing but types:
 * no playwright, no node:fs, no zod. It is safe in a client bundle.
 *
 * Nothing in here is allowed to change the rendered video. The renderer reads
 * exactly these values in exactly these places; `tests/cards.test.ts` pins the
 * output so a well-meaning tweak to the preview cannot move a pixel of the
 * master.
 */

/** Every line animates for this long; used to size the capture window. */
export const ANIM_MS = 900;

/**
 * Storyboard type sizes and paddings are authored against a 1080x1920 frame.
 * Any other frame is that one, scaled.
 */
export const CARD_BASE = { w: 1080, h: 1920 } as const;

/** The one rule that maps authored geometry onto the frame being rendered. */
export const cardScale = (height: number): number => height / CARD_BASE.h;

/**
 * Indic scripts are shaped as connected clusters; adding tracking splits a
 * word into loose glyphs (ನಾ ಮ ಕ ರ ಣ instead of ನಾಮಕರಣ). Latin keeps its
 * tracking. Tracking is a VALUE here, never an addend — see the same rule in
 * globals.css, which zeroes the --track-* tokens under :lang(kn|hi|kok).
 */
export const isLatinScript = (script: Script): boolean => script === "latin";

/**
 * Frame geometry, unscaled. Multiply by `cardScale(height)` and round.
 * These are the literals the renderer used inline; they are constants now only
 * so the preview can lay out the same frame, not so they can be tuned.
 */
export const CARD_GEOMETRY = {
  /** Vertical gap between lines. */
  gap: 28,
  padTop: 96,
  padX: 88,
  padBottom: 96,
  /** A lower third sits above the safe area at the bottom of the frame. */
  padBottomAnchored: 180,
  /** How far a non-hero line travels up as it fades in. */
  lineInShift: 34,
  shadowY: 4,
  shadowBlur: 30,
  lineHeight: 1.18,
  /** The overshoot. Matches --ease-overshoot in globals.css. */
  ease: "cubic-bezier(.22,1.2,.36,1)",
  /** Latin titles ramp their tracking in; Indic titles hold at 0. */
  titleTrackFrom: ".42em",
  titleTrackTo: ".10em",
} as const;

export type CardLineStyle = {
  /** Family name only; wrap with `cardFontStack` for a CSS value. */
  family: string;
  /** Authored size, in 1080x1920 pixels. Scale it for the target frame. */
  size: number;
  weight: number;
  /** letter-spacing. Always "0" off Latin. */
  ls: string;
  color: string;
};

/**
 * The per-style decision table. This is the whole look of a card line:
 * which face, how big, how heavy, how tracked, in which ink.
 */
export function cardStyles(t: Template, script: Script, style: TextSlot["style"]): CardLineStyle {
  const pal = t.palette;
  const hero = t.typography.hero[script] ?? "Noto Serif";
  const body = t.typography.body[script] ?? "Noto Sans";
  const track = (latin: string) => (isLatinScript(script) ? latin : "0");

  switch (style) {
    case "hero":
      // The reveal — the baby's name, the family name — and the one style that
      // used to carry a flat -0.01em on every script. Negative tracking tightens
      // rather than splits, so it never produced the obvious ನಾ ಮ ಕ ರ ಣ failure
      // and went unnoticed; it is still tracking on Indic, in the single frame
      // the whole trailer builds to. Gated like every other style.
      return { family: hero, size: t.typography.heroSize, weight: 700, ls: track("-0.01em"), color: pal.ink };
    case "title":
      return { family: hero, size: t.typography.titleSize, weight: 600, ls: track("0.10em"), color: pal.ink };
    case "subtitle":
      return { family: body, size: Math.round(t.typography.bodySize * 1.15), weight: 500, ls: track("0.22em"), color: pal.accent };
    case "lower_third":
      return { family: hero, size: Math.round(t.typography.titleSize * 0.8), weight: 600, ls: "0", color: pal.ink };
    case "caption":
      return { family: body, size: Math.round(t.typography.bodySize * 0.88), weight: 400, ls: track("0.18em"), color: pal.accent };
    default:
      return { family: body, size: t.typography.bodySize, weight: 400, ls: track("0.02em"), color: pal.ink };
  }
}

/** The CSS font-family value for a card line. */
export const cardFontStack = (family: string): string => `'${family}', system-ui, sans-serif`;

/**
 * Which entry animation a line gets. The hero is the reveal and gets the
 * overshoot; a title ramps its tracking; everything else rises and fades.
 */
export function cardAnimationName(style: TextSlot["style"]): "heroIn" | "titleIn" | "lineIn" {
  return style === "hero" ? "heroIn" : style === "title" ? "titleIn" : "lineIn";
}

/** The opaque ground a card sits on when there is no photo under it. */
export function cardGround(t: Template): string {
  return `radial-gradient(120% 70% at 50% 45%, ${t.palette.muted}22 0%, ${t.palette.bg} 70%)`;
}
