import type { CSSProperties } from "react";
import type { Template } from "./templates/schema";

/**
 * Maps a template's palette onto the page tokens.
 *
 * The page is paper now, so there is no scene to tint and nothing to clamp.
 * A template contributes exactly two things to the chrome:
 *   --color-accent      the raw palette accent, used as a FILL only (rules,
 *                       swatches, chips) where contrast is a non-text floor;
 *   --color-accent-text the same hue darkened until it clears 4.5:1 as text on
 *                       --paper. Authored per template as `palette.accentOnPaper`
 *                       (docs/review/ux-tasks.md §2); computed as a fallback so a
 *                       new template cannot ship an illegible accent by omission.
 */
export const PAPER = "#FFFBF4";

const hx = (v: number) => v.toString(16).padStart(2, "0");

const LIN = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

function parse(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(rgb: [number, number, number]): number {
  return 0.2126 * LIN(rgb[0]) + 0.7152 * LIN(rgb[1]) + 0.0722 * LIN(rgb[2]);
}

/** Contrast ratio between two hexes. Exported because the tests measure with it. */
export function contrast(a: string, b: string): number {
  const x = parse(a);
  const y = parse(b);
  if (!x || !y) return 0;
  const lx = luminance(x);
  const ly = luminance(y);
  const hi = Math.max(lx, ly);
  const lo = Math.min(lx, ly);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Darkens an accent until it clears 4.5:1 as text on paper.
 *
 * The old version walked toward *white*, because the ground was near-black.
 * On paper that is exactly backwards: every step toward white made it worse,
 * and the loop would have run out its guard and returned something unreadable.
 */
export function accentText(hex: string, ground = PAPER, target = 4.5): string {
  const rgb = parse(hex);
  if (!rgb) return "#8A6A12";
  let [r, g, b] = rgb;

  let guard = 0;
  while (contrast(`#${hx(r)}${hx(g)}${hx(b)}`, ground) < target && guard++ < 60) {
    r = Math.max(0, Math.round(r * 0.94) - 1);
    g = Math.max(0, Math.round(g * 0.94) - 1);
    b = Math.max(0, Math.round(b * 0.94) - 1);
  }
  return `#${hx(r)}${hx(g)}${hx(b)}`;
}

export function templateStyle(t: Template): CSSProperties {
  return {
    ["--color-accent" as string]: t.palette.accent,
    ["--color-accent-text" as string]: t.palette.accentOnPaper ?? accentText(t.palette.accent),
  };
}

export const _internal = { accentText, contrast };
