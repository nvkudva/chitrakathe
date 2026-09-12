import { test } from "node:test";
import assert from "node:assert/strict";
import { contrast, accentText, PAPER } from "../src/lib/theme.ts";
import { listTemplates } from "../src/lib/templates/index.ts";
import { GROUND_STOP_ALPHA } from "../src/lib/render/cardStyles.ts";

/**
 * The palette, measured rather than asserted.
 *
 * These are the composited grounds the chrome actually paints (globals.css),
 * not a designer's intention: paper, the raised card, and the recessed well.
 * WCAG floors — 4.5:1 for body text, 3:1 for large text and non-text.
 *
 * They were retargeted from the near-black substrate to paper in the T2
 * repaint. If you change a token in globals.css, change it here too; the point
 * of the test is that the two cannot drift apart silently.
 */
const PAPER_2 = "#FFF6E9"; // raised card (.tier-2 / .tier-3)
const PAPER_3 = "#F7EDDC"; // recessed well (.tier-0)
const GROUNDS = { paper: PAPER, "paper-2": PAPER_2, "paper-3": PAPER_3 };

const INK = { "ink-1": "#1C1512", "ink-2": "#57493F", "ink-3": "#7D6D60" };

test("every ink clears 4.5:1 on every ground it is painted on", () => {
  for (const [ground, bg] of Object.entries(GROUNDS)) {
    for (const [name, fg] of Object.entries(INK)) {
      // --ink-3 is the one that has no headroom: inside a .tier-0 well it is
      // overridden to #786858 for exactly this reason.
      const colour = ground === "paper-3" && name === "ink-3" ? "#786858" : fg;
      const cr = contrast(colour, bg);
      assert.ok(cr >= 4.5, `${name} on ${ground} is ${cr.toFixed(2)}:1, needs 4.5:1`);
    }
  }
});

test("gold is a text colour only in its darkened form", () => {
  assert.ok(contrast("#8A6A12", PAPER) >= 4.5, "--gold-ink is text-safe on paper");
  assert.ok(contrast("#8A6A12", PAPER_2) >= 4.5, "--gold-ink is text-safe on a card");
  // The turmeric fill is a fill. It must never be used as text on paper.
  assert.ok(contrast("#D4A017", PAPER) < 4.5, "--color-cta is a fill, not an ink");
});

test("the CTA label clears 4.5:1 on the CTA fill", () => {
  assert.ok(contrast("#241A05", "#D4A017") >= 4.5);
});

test("every template's paper accent is legible as text, and is not the fill", () => {
  // Accents are painted on the page and on cards, never inside a well: the
  // authored #C2410C is 5.0:1 on paper and 4.46:1 on --paper-3, so putting an
  // accent inside a .tier-0 is the one thing this palette does not allow.
  for (const t of listTemplates()) {
    const onPaper = t.palette.accentOnPaper;
    assert.ok(onPaper, `${t.id} must author palette.accentOnPaper`);
    for (const ground of ["paper", "paper-2"] as const) {
      const cr = contrast(onPaper!, GROUNDS[ground]);
      assert.ok(cr >= 4.5, `${t.id} accent on ${ground} is ${cr.toFixed(2)}:1`);
    }
    assert.notEqual(onPaper, t.palette.accent, `${t.id}: the fill is not the ink`);
  }
});

test("the computed fallback darkens rather than lightens", () => {
  // The dark-era version walked toward white, which on paper made every step
  // worse and returned something unreadable. Any accent must come back legible.
  for (const t of listTemplates()) {
    const derived = accentText(t.palette.accent);
    assert.ok(
      contrast(derived, PAPER) >= 4.5,
      `${t.id}: derived ${derived} is ${contrast(derived, PAPER).toFixed(2)}:1 on paper`,
    );
  }
  assert.ok(contrast(accentText("#FFFFFF"), PAPER) >= 4.5, "even white is walked down to legible");
});

test("hairlines are non-text and stay non-text", () => {
  // A 1.3:1 hairline is a separator, not a border you may put a label in.
  assert.ok(contrast("#E8DCC9", PAPER) < 3, "the hairline is decoration; nothing text-bearing uses it");
});

/**
 * The grounds the FILM is painted on, as opposed to the chrome above.
 *
 * These were missed by the repaint: all four templates still carried a
 * near-black `palette.bg` (#140507, #0B1220, #0F1410, #1A1210) long after the
 * page became paper, so the gallery was four black slabs and — the part that
 * actually matters — the artefact forwarded on WhatsApp was unchanged.
 *
 * A title card is never painted on `palette.bg` alone: `cardGround` lifts the
 * centre with the accent and rings it with the muted hue, so the text sits on
 * whichever of the three composited stops it happens to land over. All three
 * are measured. Card text is large by construction — the smallest style on a
 * card is `caption` at 0.88 x bodySize, which is 41px in a 1080x1920 frame —
 * so the accent floor is the 3:1 large-text floor; the ink carries body-weight
 * meaning and is held to 4.5:1.
 */
const over = (fg: string, alpha: number, bg: string): string => {
  const px = (h: string) => {
    const n = parseInt(h.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r, g, b] = px(fg);
  const [R, G, B] = px(bg);
  const mix = (f: number, k: number) =>
    Math.round(f * alpha + k * (1 - alpha)).toString(16).padStart(2, "0");
  return `#${mix(r!, R!)}${mix(g!, G!)}${mix(b!, B!)}`;
};

test("no template ground is near-black any more", () => {
  /*
   * Measured in BT.601 luma, deliberately — the same Y that ffmpeg reports for
   * a frame, so this number and the poster's mean luma are the same units and
   * the review's "mean luma above 60/255" can be checked against it.
   *
   * WCAG relative luminance is the wrong instrument here: it weights green so
   * heavily that #4A2418, a mid terracotta, scores 0.028 — below near-black
   * navy #0B1220's own neighbourhood — and would have argued for a brown so
   * pale the cream ink stops working.
   *
   * The four grounds the repaint left behind measure 10, 18, 18 and 20. The
   * four that replaced them measure 46-59. 40 sits in the gap.
   */
  const luma601 = (hexColour: string): number => {
    const n = parseInt(hexColour.replace("#", ""), 16);
    return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  };
  for (const t of listTemplates()) {
    const y = luma601(t.palette.bg);
    assert.ok(y >= 40, `${t.id}: palette.bg ${t.palette.bg} is luma ${y.toFixed(0)}/255 — still a black slab`);
  }
});

test("card ink and accent clear their floors on every stop of the lit ground", () => {
  const alpha = GROUND_STOP_ALPHA / 255;
  for (const t of listTemplates()) {
    const stops = {
      bg: t.palette.bg,
      ring: over(t.palette.muted, alpha, t.palette.bg),
      glow: over(t.palette.accent, alpha, t.palette.bg),
    };
    for (const [name, ground] of Object.entries(stops)) {
      const ink = contrast(t.palette.ink, ground);
      assert.ok(ink >= 4.5, `${t.id}: ink on the ${name} stop is ${ink.toFixed(2)}:1, needs 4.5:1`);
      const accent = contrast(t.palette.accent, ground);
      assert.ok(accent >= 3, `${t.id}: accent on the ${name} stop is ${accent.toFixed(2)}:1, needs 3:1`);
    }
  }
});
