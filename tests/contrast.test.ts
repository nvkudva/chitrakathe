import { test } from "node:test";
import assert from "node:assert/strict";
import { contrast, accentText, PAPER } from "../src/lib/theme.ts";
import { listTemplates } from "../src/lib/templates/index.ts";

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
