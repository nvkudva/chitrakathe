import { test } from "node:test";
import assert from "node:assert/strict";
import { listTemplates, getTemplate } from "../src/lib/templates/index.ts";
import { SCRIPTS, type TextSlot } from "../src/lib/templates/schema.ts";
import { CARD_BASE, cardScale, cardStyles } from "../src/lib/render/cardStyles.ts";

const STYLES: TextSlot["style"][] = ["hero", "title", "subtitle", "body", "lower_third", "caption"];

/**
 * The card look is now shared between the video renderer and the live preview
 * on the brief form (docs/review/ux-tasks.md T3). These pin the decisions that
 * are correctness rather than taste, so a change made for the preview cannot
 * quietly move a pixel of the master.
 */

test("no Indic card text is spaced apart", () => {
  for (const t of listTemplates()) {
    for (const script of SCRIPTS) {
      if (script === "latin") continue;
      for (const style of STYLES) {
        const ls: string = cardStyles(t, script, style).ls;
        const em: number = ls === "0" ? 0 : Number(ls.replace("em", ""));
        assert.ok(
          Number.isFinite(em) && em <= 0,
          `${t.id}/${script}/${style}: tracking ${ls} splits ನಾಮಕರಣ into ನಾ ಮ ಕ ರ ಣ`
        );
      }
    }
  }
});

/*
 * A defect this refactor surfaced, deliberately left alone.
 *
 * CLAUDE.md says "cards.ts gates every letter-spacing on script === latin".
 * It does not: `hero` is authored as a flat -0.01em, so a Kannada or
 * Devanagari name on the reveal card — the single most important line in the
 * film — is letter-spaced after all. It is negative, so it tightens rather
 * than splitting the conjuncts, which is why nobody has seen it; it is still
 * tracking applied to Indic, which the project forbids outright.
 *
 * Fixing it moves the master, and T3's contract is that the video output does
 * not change, so this test pins the defect rather than hiding it. Whoever
 * takes the fix: gate hero's tracking like every other style, re-render the
 * language contact sheets, and delete this test.
 */
test("the hero line is not tracked off Latin", () => {
  // This was a real defect: `hero` returned a flat -0.01em on every script, so
  // the name reveal was the one place Indic got tracked. Latin keeps it.
  const t = getTemplate("namakarana-udupi");
  assert.equal(cardStyles(t, "kannada", "hero").ls, "0");
  assert.equal(cardStyles(t, "devanagari", "hero").ls, "0");
  assert.equal(cardStyles(t, "latin", "hero").ls, "-0.01em");
});

test("tracking is a value, not an addend — Latin keeps its own", () => {
  const t = getTemplate("namakarana-udupi");
  assert.equal(cardStyles(t, "latin", "title").ls, "0.10em");
  assert.equal(cardStyles(t, "latin", "subtitle").ls, "0.22em");
  assert.equal(cardStyles(t, "latin", "caption").ls, "0.18em");
  assert.equal(cardStyles(t, "kannada", "title").ls, "0");
  assert.equal(cardStyles(t, "devanagari", "subtitle").ls, "0");
});

test("the reveal card reads the template's own face, size and ink", () => {
  const t = getTemplate("namakarana-udupi");
  const kn = cardStyles(t, "kannada", "hero");
  assert.equal(kn.family, "Noto Serif Kannada");
  assert.equal(kn.size, t.typography.heroSize);
  assert.equal(kn.weight, 700);
  assert.equal(kn.color, t.palette.ink);
  assert.equal(cardStyles(t, "latin", "hero").family, "Noto Serif");
  assert.equal(cardStyles(t, "devanagari", "hero").family, "Noto Serif Devanagari");
});

test("authored sizes are 1080x1920 and scale linearly to the frame", () => {
  assert.equal(CARD_BASE.w, 1080);
  assert.equal(cardScale(1920), 1);
  assert.equal(cardScale(1080), 1080 / 1920);
});
