import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate } from "../src/lib/render/text.ts";
import { getTemplate } from "../src/lib/templates/index.ts";
import { resolveSlot, voiceoverText } from "../src/lib/render/text.ts";

test("dates render in the family's script, not ISO", () => {
  assert.equal(formatDate("2026-10-18", "kn"), "18 ಅಕ್ಟೋಬರ್ 2026");
  assert.equal(formatDate("2026-10-18", "hi"), "18 अक्टूबर 2026");
  assert.equal(formatDate("2026-10-18", "en"), "18 October 2026");
  assert.equal(formatDate("not a date", "kn"), "not a date", "junk passes through untouched");
});

test("family-supplied names are rendered, never translated", () => {
  const t = getTemplate("namakarana-udupi");
  const brief = {
    templateId: t.id, templateVersion: 1, language: "en" as const,
    fields: { babyName: "ಆದ್ವಿಕ್" }, photos: ["a"], aspects: ["9:16" as const],
  };
  const slot = { key: "babyName", style: "hero" as const, align: "center" as const, delay: 0 };
  assert.equal(resolveSlot(t, brief, slot), "ಆದ್ವಿಕ್", "an English trailer keeps the name as typed");
});

test("the voiceover is built from authored lines only", () => {
  const t = getTemplate("namakarana-udupi");
  const brief = {
    templateId: t.id, templateVersion: 1, language: "kn" as const,
    fields: { babyName: "X" }, photos: ["a"], aspects: ["9:16" as const],
  };
  const vo = voiceoverText(t, brief);
  assert.ok(vo.includes("ನಾಮಕರಣ"));
  assert.ok(!vo.includes("X"), "family-supplied values must not leak into the TTS script");
});
