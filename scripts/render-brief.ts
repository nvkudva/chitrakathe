/**
 * Milestone 1: one template, end to end, from a hardcoded JSON brief.
 *
 *   npm run render:brief -- fixtures/brief.namakarana.json
 *
 * No database, no queue, no network. Proves the storyboard, the Indic type,
 * the compositor and the cost ledger before anything else is built on them.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { Brief } from "../src/lib/templates/schema";
import { renderBrief } from "../src/lib/render/pipeline";
import { CostLedger } from "../src/lib/cost/ledger";
import { rupees, marginPct, gatewayFeePaise } from "../src/lib/money";
import { config } from "../src/lib/config";
import { getTemplate, totalDuration } from "../src/lib/templates";

const file = process.argv[2] ?? "fixtures/brief.namakarana.json";
const brief = Brief.parse(JSON.parse(await fs.readFile(path.resolve(file), "utf8")));
const t = getTemplate(brief.templateId, brief.templateVersion);

console.log(`\n  ${t.name.en}  (${t.id} v${t.version})`);
console.log(`  ${t.shots.length} shots, ${totalDuration(t)}s, language=${brief.language}, aspects=${brief.aspects.join(" ")}\n`);

const ledger = new CostLedger("local-" + Date.now());
const started = Date.now();

const result = await renderBrief({
  jobId: `brief-${path.basename(file, ".json")}`,
  brief,
  ledger,
  musicDir: path.resolve("assets/music"),
  loadPhoto: async (key) => fs.readFile(path.resolve(key)),
  onProgress: (stage, pct) => {
    process.stdout.write(`\r  [${String(pct).padStart(3)}%] ${stage.padEnd(10)}`);
  },
});

process.stdout.write("\r" + " ".repeat(40) + "\r");

const price = config().PRICE_LAUNCH_PAISE;
const total = result.cost.totalPaise + gatewayFeePaise(price);

console.log(`  rendered ${result.durationSeconds.toFixed(2)}s in ${((Date.now() - started) / 1000).toFixed(1)}s wall\n`);
for (const o of result.outputs) {
  console.log(`  ${o.aspect}  master  ${o.masterPath}`);
  console.log(`        preview ${o.previewPath}`);
}
if (result.degraded.length) console.log(`\n  degraded shots (fell back): ${result.degraded.join(", ")}`);

console.log(`\n  cost`);
for (const [kind, paise] of Object.entries(result.cost.byKind)) {
  console.log(`    ${kind.padEnd(14)} ${rupees(paise as number)}`);
}
console.log(`    ${"gateway".padEnd(14)} ${rupees(gatewayFeePaise(price))}`);
console.log(`    ${"—".repeat(28)}`);
console.log(`    ${"total".padEnd(14)} ${rupees(total)}   ceiling ${rupees(result.cost.ceilingPaise)}`);
console.log(`    ${"price".padEnd(14)} ${rupees(price)}`);
console.log(`    ${"margin".padEnd(14)} ${marginPct(price, total).toFixed(1)}%\n`);
