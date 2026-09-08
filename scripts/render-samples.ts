/**
 * Renders one sample trailer per template, for the gallery.
 *
 * A product that sells video showing four flat colour swatches is the single
 * worst thing on the site — a family cannot tell what they are buying, and
 * "watch the sample" is the only honest way to sell a 30-second film.
 *
 *   npx tsx scripts/render-samples.ts
 *
 * Outputs land in public/samples/<templateId>.{mp4,jpg} and are served
 * statically, so the gallery costs nothing per view.
 *
 * NOTE: these render from the placeholder photos in fixtures/photos, which are
 * synthetic gradients. They prove the mechanism, not the product. Real sample
 * trailers need licensed or consented photography — see docs/known-gaps.md.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { Brief } from "../src/lib/templates/schema";
import { renderBrief } from "../src/lib/render/pipeline";
import { CostLedger } from "../src/lib/cost/ledger";
import { listTemplates } from "../src/lib/templates";
import { ffmpeg } from "../src/lib/render/ffmpeg";
import { rupees } from "../src/lib/money";

const OUT = path.resolve("public/samples");
await fs.mkdir(OUT, { recursive: true });

let total = 0;
for (const template of listTemplates()) {
  const file = path.resolve(`fixtures/samples/${template.id}.json`);
  const brief = Brief.parse(JSON.parse(await fs.readFile(file, "utf8")));

  process.stdout.write(`  ${template.id.padEnd(28)} rendering…`);
  const ledger = new CostLedger(`sample-${template.id}`);
  const result = await renderBrief({
    jobId: `sample-${template.id}`,
    brief,
    ledger,
    musicDir: path.resolve("assets/music"),
    loadPhoto: (key) => fs.readFile(path.resolve(key)),
  });
  total += ledger.spentPaise;

  const master = result.outputs[0]!.masterPath;
  const mp4 = path.join(OUT, `${template.id}.mp4`);
  const poster = path.join(OUT, `${template.id}.jpg`);

  // Gallery-sized and web-tuned: these autoplay muted in a grid, so they are
  // small, faststart, and capped well below the paid master's bitrate.
  await ffmpeg([
    "-i", master,
    "-vf", "scale=540:960",
    "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-profile:v", "main",
    "-an", "-movflags", "+faststart",
    "-y", mp4,
  ]);
  // The name reveal reads better as a still than the opening black.
  await ffmpeg(["-ss", "27.5", "-i", master, "-frames:v", "1", "-vf", "scale=540:960", "-q:v", "4", "-y", poster]);

  const kb = Math.round((await fs.stat(mp4)).size / 1024);
  console.log(` ${String(kb).padStart(5)} KB`);
}

console.log(`\n  4 samples written to public/samples — model+compute spend ${rupees(total)}\n`);
