import type { CSSProperties } from "react";
import type { Template } from "./templates/schema";

/**
 * Maps a template's palette onto the scene tokens.
 *
 * Surfaces stay achromatic; only the scene carries colour, and it is clamped.
 * The tint ceiling is 14%: at 32% the first-birthday mint lifts the composite
 * enough that body text drops below 4.5:1. See docs/design-spec.md §3.4.
 */
export const SCENE_TINT_CEILING = "14%";

/** Darkens a hex toward black so a light template palette cannot wash out the scene. */
function clampSceneBase(hex: string, maxLuma = 0.055): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#130608";
  const n = parseInt(m[1]!, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (luma > maxLuma) {
    const k = maxLuma / luma;
    r = Math.round(r * k);
    g = Math.round(g * k);
    b = Math.round(b * k);
  }
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Lightens an accent until it clears 4.5:1 as text on the scene. */
function accentText(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  let [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];

  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const rel = () => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  // Against the darkest scene we allow, so the answer holds for every template.
  const ratio = () => (rel() + 0.05) / (0.02 + 0.05);

  let guard = 0;
  while (ratio() < 4.5 && guard++ < 40) {
    r = Math.min(255, Math.round(r + (255 - r) * 0.08) + 1);
    g = Math.min(255, Math.round(g + (255 - g) * 0.08) + 1);
    b = Math.min(255, Math.round(b + (255 - b) * 0.08) + 1);
  }
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function sceneStyle(t: Template): CSSProperties {
  return {
    ["--color-scene-base" as string]: clampSceneBase(t.palette.bg),
    ["--color-scene-tint" as string]: t.palette.muted,
    ["--color-scene-accent" as string]: t.palette.accent,
    ["--color-ink" as string]: t.palette.ink,
    ["--color-accent" as string]: t.palette.accent,
    ["--color-accent-text" as string]: accentText(t.palette.accent),
    ["--scene-tint-a" as string]: SCENE_TINT_CEILING,
  };
}

export const _internal = { clampSceneBase, accentText };
