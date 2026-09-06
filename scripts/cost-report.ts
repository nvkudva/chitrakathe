/** Terminal view of the cost dashboard. `npm run costs` */
import { costSummary, jobCosts } from "../src/lib/cost/report";
import { rupees } from "../src/lib/money";
import { closeDb } from "../src/lib/db";

const s = await costSummary(30);
const jobs = await jobCosts(20);

console.log(`\n  Last ${s.windowDays} days — prices checked ${s.pricesCheckedOn}${s.pricesStale ? "  ** STALE **" : ""}\n`);
console.log(`  renders              ${s.jobs}  (${s.paidJobs} paid)`);
console.log(`  preview -> paid      ${s.conversionPct.toFixed(1)}%`);
console.log(`  render cost          ${rupees(s.renderCostPaise)}`);
console.log(`  revenue              ${rupees(s.revenuePaise)}  (gateway ${rupees(s.gatewayPaise)})`);
console.log(`  margin / paid render ${s.perPaidMarginPct.toFixed(1)}%`);
console.log(`  blended margin       ${s.blendedMarginPct.toFixed(1)}%   <- the number that matters`);
console.log(`  ceiling refusals     ${s.breaches}\n`);

for (const j of jobs) {
  console.log(
    `  ${j.jobId.slice(0, 8)}  ${j.templateId.padEnd(26)} ${j.status.padEnd(20)} ` +
      `${rupees(j.costPaise).padStart(9)} / ${rupees(j.ceilingPaise).padStart(8)}  ` +
      `${j.marginPct === null ? "     —" : (j.marginPct.toFixed(1) + "%").padStart(6)}`
  );
}
console.log("");
await closeDb();
