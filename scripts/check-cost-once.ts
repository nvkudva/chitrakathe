/**
 * Guards the most expensive bug this codebase has had.
 *
 * Generative shots used to be produced inside the per-aspect loop, so a
 * two-shot template exported at 9:16 and 1:1 called the model four times, paid
 * four times, hit the ceiling, and silently shipped a degraded square. It made
 * the gross margin published in README.md wrong.
 *
 * This renders a real brief at BOTH aspects with a counting provider and
 * asserts the model was called exactly once per generative shot. It needs
 * ffmpeg and Chromium, so it is not in `npm test` — run it before changing
 * anything in src/lib/render/pipeline.ts.
 *
 *   npx tsx scripts/check-cost-once.ts
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { Brief, type Template } from "../src/lib/templates/schema";
import { getTemplate, generativeShots } from "../src/lib/templates";
import { renderBrief } from "../src/lib/render/pipeline";
import { CostLedger } from "../src/lib/cost/ledger";
import { rupees } from "../src/lib/money";

const brief = Brief.parse({
  ...JSON.parse(await fs.readFile(path.resolve("fixtures/brief.namakarana.json"), "utf8")),
  aspects: ["9:16", "1:1"],
});

const template: Template = getTemplate(brief.templateId, brief.templateVersion);
const expected = generativeShots(template).length;

// Count what the provider chain is actually asked to produce.
let calls = 0;
const { StubVideoProvider } = await import("../src/lib/providers/video/stub");
const original = StubVideoProvider.prototype.generate;
StubVideoProvider.prototype.generate = async function (...args: Parameters<typeof original>) {
  calls++;
  return original.apply(this, args);
};

const ledger = new CostLedger("cost-once");
const result = await renderBrief({
  jobId: "cost-once",
  brief,
  ledger,
  musicDir: path.resolve("assets/music"),
  loadPhoto: (key) => fs.readFile(path.resolve(key)),
});

console.log(`\n  aspects rendered : ${result.outputs.map((o) => o.aspect).join(", ")}`);
console.log(`  generative shots : ${expected}`);
console.log(`  model calls      : ${calls}`);
console.log(`  degraded         : ${result.degraded.length ? result.degraded.join(", ") : "none"}`);
console.log(`  cost             : ${rupees(result.cost.totalPaise)} of ${rupees(result.cost.ceilingPaise)}\n`);

assert.equal(
  calls,
  expected,
  `The model was called ${calls} times for ${expected} generative shots. ` +
    `Generation must happen once per job and be reframed per aspect — see the genCache in pipeline.ts.`
);
assert.equal(result.outputs.length, 2, "both aspects must be produced");
assert.equal(result.degraded.length, 0, "nothing should degrade when the ceiling is not the constraint");

console.log("  OK — one generation per shot, reused across both aspects.\n");
