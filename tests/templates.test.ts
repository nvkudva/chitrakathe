import { test } from "node:test";
import assert from "node:assert/strict";
import { listTemplates, totalDuration, generativeShots, photoAt, heroFieldKey } from "../src/lib/templates/index.ts";
import { LANGUAGES } from "../src/lib/templates/schema.ts";

test("all four launch templates load and validate", () => {
  const ts = listTemplates();
  assert.equal(ts.length, 4, "prd.md requires 4 launch templates");
  const ids = ts.map((t) => t.id).sort();
  assert.deepEqual(ids, [
    "first-birthday-storybook",
    "griha-pravesha-classic",
    "namakarana-udupi",
    "save-the-date-coastal",
  ]);
});

test("every template stays inside its generative-shot budget", () => {
  for (const t of listTemplates()) {
    assert.ok(
      generativeShots(t).length <= t.maxGenerativeShots,
      `${t.id} exceeds its generative shot cap`
    );
    assert.ok(generativeShots(t).length <= 2, `${t.id} has more than 2 generative shots (prd.md 6)`);
  }
});

test("generative shots never depict a person and always have a fallback", () => {
  for (const t of listTemplates()) {
    for (const s of generativeShots(t)) {
      assert.ok(["object", "environment"].includes(s.subject), `${t.id}/${s.id} subject must be object or environment`);
      assert.equal(s.fallback.type, "photo_motion", `${t.id}/${s.id} needs a photo fallback`);
      assert.match(s.prompt, /no (people|humans|persons|faces)\.?$/i,
        `${t.id}/${s.id} prompt is missing its explicit no-people exclusion`);
      const body = s.prompt.replace(/,?\s*no (people|humans|persons|faces)\.?\s*$/i, "");
      assert.doesNotMatch(body, /\b(face|person|people|human|man|woman|child|baby|couple|bride|groom|portrait)\b/i,
        `${t.id}/${s.id} prompt names a human subject outside the exclusion`);
    }
  }
});

test("trailers are between 28 and 35 seconds", () => {
  for (const t of listTemplates()) {
    const d = totalDuration(t);
    assert.ok(d >= 28 && d <= 35, `${t.id} is ${d}s, outside the 28-35s WhatsApp Status window`);
  }
});

test("every template has authored strings in all four launch languages", () => {
  for (const t of listTemplates()) {
    for (const lang of LANGUAGES) {
      const bundle = t.strings[lang];
      assert.ok(bundle && Object.keys(bundle).length > 0, `${t.id} is missing ${lang} strings`);
      assert.ok(t.name[lang], `${t.id} is missing a ${lang} name`);
    }
  }
});

test("every stringKey referenced by a shot exists in every language", () => {
  for (const t of listTemplates()) {
    const used = t.shots.flatMap((s) => ("lines" in s ? s.lines : [])).map((l) => l.stringKey).filter(Boolean);
    for (const lang of LANGUAGES) {
      for (const key of used) {
        assert.ok(t.strings[lang]?.[key!], `${t.id}: ${lang} is missing string "${key}"`);
      }
    }
  }
});

test("every field key referenced by a shot is declared in the form", () => {
  for (const t of listTemplates()) {
    const declared = new Set(t.fields.map((f) => f.key));
    for (const s of t.shots) {
      if (!("lines" in s)) continue;
      for (const l of s.lines) {
        if (l.key) assert.ok(declared.has(l.key), `${t.id}/${s.id} uses undeclared field "${l.key}"`);
      }
    }
  }
});

test("photo indices wrap so a minimum-length brief still renders", () => {
  const brief = { photos: ["a", "b", "c", "d", "e", "f"] } as never;
  assert.equal(photoAt(brief, 0), "a");
  assert.equal(photoAt(brief, 7), "b", "index 7 must wrap onto a 6-photo brief");
});

test("every template declares a hero field, and it is not the venue", () => {
  // The delivery screen and the WhatsApp link preview both lead with this.
  // Deriving it from key order picked the venue, which is why it is now read
  // from the storyboard's own `hero`-styled line.
  const expected: Record<string, string> = {
    "namakarana-udupi": "babyName",
    "save-the-date-coastal": "eventDate",
    "first-birthday-storybook": "childName",
    "griha-pravesha-classic": "familyName",
  };
  for (const t of listTemplates()) {
    const key = heroFieldKey(t);
    assert.ok(key, `${t.id} has no hero-styled line bound to a field`);
    assert.equal(key, expected[t.id], `${t.id} hero field changed`);
    assert.ok(
      t.fields.some((f) => f.key === key),
      `${t.id} hero field "${key}" is not a declared form field`
    );
  }
});
