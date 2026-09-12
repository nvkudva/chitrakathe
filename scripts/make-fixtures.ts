/**
 * Generates development stand-ins so milestone 1 runs with no network, no
 * uploads and no licensed assets:
 *   - 8 stand-in "family photos"
 *   - 4 placeholder music beds
 *
 * The music beds are PLACEHOLDERS. They must be replaced with licensed or
 * original beds before launch. See docs/known-gaps.md.
 *
 * THE PHOTOS ARE DRAWN, NOT PHOTOGRAPHED, AND MUST STAY THAT WAY.
 *
 * They used to be two-stop ffmpeg gradients with `PHOTO 1` … `PHOTO 8` burnt
 * into the middle in 110px DejaVu — and because `scripts/render-samples.ts`
 * renders the gallery from these same files, that lettering was baked into the
 * shop window: the housewarming tile on the home page read "PHOTO 1" behind
 * the date card. A buyer being asked for Rs 499 was looking at a mock.
 *
 * What replaced them is eight drawn SVG scenes — marigold, brass and lamplight,
 * silk, jasmine, turmeric on a leaf, festoon bokeh, rangoli, a warm drape —
 * rasterised through the same headless Chromium the title cards use. They are
 * abstract on purpose and they are bound by two rules:
 *
 *   1. NO TEXT. Not a caption, not a watermark, not a frame number. Whatever is
 *      in these files is in the sample videos, and `render-samples.ts` asserts
 *      it separately.
 *   2. NO PEOPLE, NO FACES, NOT EVEN SUGGESTED ONES. `CLAUDE.md` forbids human
 *      likeness across three layers of the render path; a fixture that looked
 *      like a photograph of a real child would walk straight around all three,
 *      and a stand-in that could be mistaken for a real family's photograph is
 *      a different and worse problem than an obvious placeholder.
 *
 * They are still stand-ins. See docs/known-gaps.md.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { ffmpeg } from "../src/lib/render/ffmpeg";
import { config } from "../src/lib/config";

const PHOTOS = path.resolve("fixtures/photos");
const MUSIC = path.resolve("assets/music");

const SIZE = { w: 1600, h: 2000 };

/**
 * Deterministic PRNG. The fixtures are checked against by eye and by mean luma;
 * regenerating them must not quietly produce a different set.
 */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Scene = { name: string; svg: string };

/** A soft round light. The whole vocabulary of a bokeh field. */
function disc(x: number, y: number, r: number, fill: string, opacity: number, blur: number): string {
  return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(0)}" fill="${fill}" opacity="${opacity.toFixed(3)}" filter="url(#b${blur})"/>`;
}

/** Scatters `n` discs across the frame, weighted toward the given centre. */
function bokeh(seed: number, n: number, palette: string[], radius: [number, number], cx = 0.5, cy = 0.45): string {
  const r = rng(seed);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const spread = 0.42 + r() * 0.5;
    const x = (cx + (r() - 0.5) * 2 * spread) * SIZE.w;
    const y = (cy + (r() - 0.5) * 2 * spread) * SIZE.h;
    const rad = radius[0] + r() * (radius[1] - radius[0]);
    const fill = palette[Math.floor(r() * palette.length)]!;
    // Big lights sit further out of focus and read fainter, as they do on glass.
    const soft = rad > (radius[0] + radius[1]) / 2;
    out.push(disc(x, y, rad, fill, 0.18 + r() * (soft ? 0.24 : 0.5), soft ? 3 : 2));
  }
  return out.join("");
}

/**
 * Eight scenes, in the order `photoSlots` consumes them across the four
 * templates. None of them depicts a person, and none of them carries text.
 */
function scenes(): Scene[] {
  return [
    // 0 — the close photo slot. A marigold garland, filling the frame.
    {
      name: "marigold garland",
      svg: `<rect width="100%" height="100%" fill="url(#gMaroon)"/>
        ${bokeh(11, 54, ["#F2A114", "#E4750E", "#FFC94A", "#C9450C"], [70, 210], 0.5, 0.48)}
        ${bokeh(12, 26, ["#FFD97A", "#FFB23F"], [26, 72], 0.5, 0.4)}
        <rect width="100%" height="100%" fill="url(#warmTop)"/>`,
    },
    // 1 — hands / held-object slot. A brass lamp's glow, deep and close.
    {
      name: "brass lamplight",
      svg: `<rect width="100%" height="100%" fill="url(#gBrown)"/>
        <ellipse cx="800" cy="1180" rx="430" ry="300" fill="#C97E17" opacity="0.5" filter="url(#b4)"/>
        <ellipse cx="800" cy="1120" rx="150" ry="230" fill="#FFD489" opacity="0.85" filter="url(#b3)"/>
        <ellipse cx="800" cy="1060" rx="52" ry="120" fill="#FFF3CF" opacity="0.95" filter="url(#b2)"/>
        ${bokeh(21, 30, ["#D99B27", "#F2C36B", "#8C4A12"], [40, 190], 0.5, 0.3)}
        <rect width="100%" height="100%" fill="url(#warmTop)"/>`,
    },
    // 2 — the "two of them together" slot. Silk, lit across the fold.
    {
      name: "silk folds",
      svg: `<rect width="100%" height="100%" fill="url(#gCrimson)"/>
        <g filter="url(#b4)">
          ${[0, 1, 2, 3, 4, 5]
            .map((i) => {
              const x = -200 + i * 380;
              return `<path d="M${x} 0 C ${x + 150} 600, ${x - 60} 1400, ${x + 190} 2000 L ${x + 320} 2000 C ${x + 90} 1400, ${x + 280} 600, ${x + 130} 0 Z" fill="${i % 2 ? "#8E1A2A" : "#C2452F"}" opacity="0.5"/>`;
            })
            .join("")}
        </g>
        <rect width="100%" height="100%" fill="url(#sheen)"/>
        ${bokeh(31, 14, ["#F0C05A"], [30, 90], 0.62, 0.3)}
        <rect width="100%" height="100%" fill="url(#warmTop)"/>`,
    },
    // 3 — the elders slot. Jasmine strands against temple green.
    {
      name: "jasmine on green",
      svg: `<rect width="100%" height="100%" fill="url(#gGreen)"/>
        ${bokeh(41, 64, ["#FFFDF4", "#F6EFD8", "#E9DFC0"], [22, 66], 0.5, 0.5)}
        ${bokeh(42, 16, ["#FFFFFF"], [80, 170], 0.5, 0.55)}
        <rect width="100%" height="100%" fill="url(#coolTop)"/>`,
    },
    // 4 — montage. Turmeric and kumkum on a banana leaf.
    {
      name: "turmeric on leaf",
      svg: `<rect width="100%" height="100%" fill="url(#gLeaf)"/>
        <g opacity="0.5">${[...Array(11)].map((_, i) => `<rect x="0" y="${i * 190 - 40}" width="1600" height="26" fill="#0E2E1C" transform="rotate(-7 800 1000)"/>`).join("")}</g>
        <ellipse cx="560" cy="1230" rx="250" ry="185" fill="#E8B419" opacity="0.92" filter="url(#b3)"/>
        <ellipse cx="1070" cy="1330" rx="185" ry="140" fill="#C2231C" opacity="0.9" filter="url(#b3)"/>
        ${bokeh(51, 46, ["#FFF7E2", "#F3E9CB"], [10, 26], 0.52, 0.62)}
        <rect width="100%" height="100%" fill="url(#warmTop)"/>`,
    },
    // 5 — montage. Festoon lights over a courtyard at dusk.
    {
      name: "festoon bokeh",
      svg: `<rect width="100%" height="100%" fill="url(#gDusk)"/>
        ${bokeh(61, 70, ["#FFD37A", "#FFAE4D", "#FFF0C4", "#E07C3A"], [34, 170], 0.5, 0.42)}
        ${bokeh(62, 34, ["#FFF6DC"], [12, 34], 0.5, 0.36)}
        <rect width="100%" height="100%" fill="url(#warmTop)"/>`,
    },
    // 6 — montage. A rangoli on a swept floor.
    {
      name: "rangoli",
      svg: `<rect width="100%" height="100%" fill="url(#gOchre)"/>
        <g transform="translate(800 1080)" filter="url(#b2)">
          ${[...Array(12)]
            .map((_, i) => {
              const a = (i / 12) * 360;
              return `<ellipse cx="0" cy="-420" rx="92" ry="230" fill="${i % 2 ? "#D8471F" : "#EFB01C"}" opacity="0.72" transform="rotate(${a})"/>`;
            })
            .join("")}
          ${[...Array(12)]
            .map((_, i) => {
              const a = (i / 12) * 360 + 15;
              return `<ellipse cx="0" cy="-220" rx="58" ry="130" fill="#FAEBC6" opacity="0.62" transform="rotate(${a})"/>`;
            })
            .join("")}
          <circle r="120" fill="#E8B419" opacity="0.9"/>
          <circle r="56" fill="#C2231C" opacity="0.9"/>
        </g>
        ${bokeh(71, 18, ["#FFE6A8"], [24, 80], 0.5, 0.2)}
        <rect width="100%" height="100%" fill="url(#warmTop)"/>`,
    },
    // 7 — the wide backdrop slot. The date and venue card sits over this one,
    //     so the middle third is deliberately quiet.
    {
      name: "warm drape",
      svg: `<rect width="100%" height="100%" fill="url(#gDrape)"/>
        <g filter="url(#b5)" opacity="0.55">
          ${[...Array(7)].map((_, i) => `<rect x="${i * 250 - 60}" y="-100" width="120" height="2200" fill="${i % 2 ? "#7A2E22" : "#A8552C"}"/>`).join("")}
        </g>
        ${bokeh(81, 22, ["#F5C876", "#E0913C"], [60, 200], 0.5, 0.14)}
        ${bokeh(82, 18, ["#F5C876", "#E0913C"], [60, 200], 0.5, 0.88)}
        <rect width="100%" height="100%" fill="url(#warmTop)"/>`,
    },
  ];
}

/** Gradients, blurs and the grain every scene shares. */
const DEFS = `<defs>
  ${[2, 3, 4, 5].map((n) => `<filter id="b${n}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${n * 14}"/></filter>`).join("")}
  <radialGradient id="gMaroon" cx="50%" cy="42%" r="78%"><stop offset="0" stop-color="#8E2230"/><stop offset="1" stop-color="#3B0D14"/></radialGradient>
  <radialGradient id="gBrown" cx="50%" cy="56%" r="80%"><stop offset="0" stop-color="#5E3319"/><stop offset="1" stop-color="#20100A"/></radialGradient>
  <radialGradient id="gCrimson" cx="55%" cy="38%" r="86%"><stop offset="0" stop-color="#A32A2C"/><stop offset="1" stop-color="#43101A"/></radialGradient>
  <radialGradient id="gGreen" cx="50%" cy="46%" r="80%"><stop offset="0" stop-color="#2C5B45"/><stop offset="1" stop-color="#0F2B20"/></radialGradient>
  <radialGradient id="gLeaf" cx="45%" cy="58%" r="84%"><stop offset="0" stop-color="#3E7A45"/><stop offset="1" stop-color="#14331E"/></radialGradient>
  <radialGradient id="gDusk" cx="50%" cy="44%" r="82%"><stop offset="0" stop-color="#6B3B23"/><stop offset="1" stop-color="#231524"/></radialGradient>
  <radialGradient id="gOchre" cx="50%" cy="54%" r="80%"><stop offset="0" stop-color="#B4783D"/><stop offset="1" stop-color="#4A2916"/></radialGradient>
  <radialGradient id="gDrape" cx="50%" cy="46%" r="88%"><stop offset="0" stop-color="#A85C31"/><stop offset="1" stop-color="#38180F"/></radialGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FFE9B8" stop-opacity="0.22"/>
    <stop offset="0.45" stop-color="#FFE9B8" stop-opacity="0"/>
    <stop offset="1" stop-color="#2A0910" stop-opacity="0.3"/>
  </linearGradient>
  <radialGradient id="warmTop" cx="50%" cy="40%" r="76%">
    <stop offset="0" stop-color="#FFCE7A" stop-opacity="0.1"/>
    <stop offset="0.62" stop-color="#000000" stop-opacity="0"/>
    <stop offset="1" stop-color="#0B0406" stop-opacity="0.58"/>
  </radialGradient>
  <radialGradient id="coolTop" cx="50%" cy="42%" r="76%">
    <stop offset="0" stop-color="#FFF3CF" stop-opacity="0.08"/>
    <stop offset="0.62" stop-color="#000000" stop-opacity="0"/>
    <stop offset="1" stop-color="#04120B" stop-opacity="0.56"/>
  </radialGradient>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/></filter>
</defs>`;

function sceneHtml(s: Scene): string {
  return `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${SIZE.w}px;height:${SIZE.h}px;overflow:hidden;background:#000}
    svg{display:block}
    /* Film grain over the whole frame; a perfectly clean gradient reads as a
       swatch, which is what these used to be mistaken for. */
    .grain{position:fixed;inset:0;filter:url(#grain);opacity:0.1;mix-blend-mode:overlay}
  </style>
  <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE.w}" height="${SIZE.h}" viewBox="0 0 ${SIZE.w} ${SIZE.h}">
    ${DEFS}
    ${s.svg}
  </svg>
  <svg class="grain" xmlns="http://www.w3.org/2000/svg" width="${SIZE.w}" height="${SIZE.h}">
    ${DEFS}<rect width="100%" height="100%" filter="url(#grain)"/>
  </svg>`;
}

async function photos() {
  await fs.mkdir(PHOTOS, { recursive: true });
  const all = scenes();

  // Rule 1, enforced rather than remembered: an SVG that can draw a glyph is
  // an SVG that can put "PHOTO 1" back in the shop window. The markup is
  // checked, not this file's source — a guard that tripped over its own list of
  // banned strings would be a guard nobody could keep.
  const GLYPH_SOURCES = ["\x3ctext", "\x3ctspan", "textPath", "font-family", "font-size"];
  for (const s of all) {
    const html = sceneHtml(s);
    for (const banned of GLYPH_SOURCES) {
      if (html.includes(banned)) throw new Error(`Scene "${s.name}" contains ${banned}: fixtures must carry no text`);
    }
  }

  const browser = await chromium.launch({
    executablePath: config().CHROMIUM_PATH || undefined,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: SIZE.w, height: SIZE.h }, deviceScaleFactor: 1 });
    for (let i = 0; i < all.length; i++) {
      const s = all[i]!;
      const out = path.join(PHOTOS, `${String(i + 1).padStart(2, "0")}.jpg`);
      await page.setContent(sceneHtml(s), { waitUntil: "load" });
      await page.screenshot({ path: out, type: "jpeg", quality: 92 });
      console.log(`  ${path.basename(out)}  ${s.name}`);
    }
    await page.close();
  } finally {
    await browser.close();
  }

  /*
   * A receipt, so `scripts/render-samples.ts` can refuse to build the shop
   * window out of artwork that did not come through the guard above. It cannot
   * re-run that guard itself — this file is a top-level-await script, and
   * importing it would regenerate every fixture — and it cannot read glyphs out
   * of a JPEG.
   */
  await fs.writeFile(
    path.join(PHOTOS, "manifest.json"),
    JSON.stringify(
      {
        generator: "scripts/make-fixtures.ts",
        kind: "drawn-svg-stand-in",
        textFree: true,
        peopleFree: true,
        generatedAt: new Date().toISOString(),
        scenes: all.map((s, i) => ({ file: `${String(i + 1).padStart(2, "0")}.jpg`, depicts: s.name })),
      },
      null,
      2
    ) + "\n"
  );
  console.log(`wrote ${all.length} drawn stand-in photos to ${PHOTOS} — no text, no people`);
}

/** Four moods, built from layered sines. Placeholder, not a soundtrack. */
const BEDS: Record<string, string> = {
  "temple-warm":
    "sine=f=110:d=45,volume=0.5[a];sine=f=165:d=45,volume=0.3[b];sine=f=220:d=45,volume=0.18[c];[a][b][c]amix=inputs=3,tremolo=f=0.4:d=0.3,aecho=0.8:0.9:600:0.25",
  "strings-swell":
    "sine=f=98:d=45,volume=0.45[a];sine=f=147:d=45,volume=0.32[b];sine=f=294:d=45,volume=0.12[c];[a][b][c]amix=inputs=3,tremolo=f=0.22:d=0.5,aecho=0.8:0.88:900:0.3",
  "playful-strings":
    "sine=f=262:d=45,volume=0.35[a];sine=f=330:d=45,volume=0.28[b];sine=f=392:d=45,volume=0.2[c];[a][b][c]amix=inputs=3,tremolo=f=2.4:d=0.5",
  "nadaswaram-soft":
    "sine=f=131:d=45,volume=0.48[a];sine=f=196:d=45,volume=0.3[b];sine=f=262:d=45,volume=0.16[c];[a][b][c]amix=inputs=3,tremolo=f=0.7:d=0.35,aecho=0.8:0.9:1200:0.35",
};

async function music() {
  await fs.mkdir(MUSIC, { recursive: true });
  for (const [name, graph] of Object.entries(BEDS)) {
    const out = path.join(MUSIC, `${name}.m4a`);
    await ffmpeg([
      "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo:d=45",
      "-filter_complex", `${graph},afade=t=in:st=0:d=2,afade=t=out:st=42:d=3,aresample=48000[out]`,
      "-map", "[out]", "-t", "45", "-c:a", "aac", "-b:a", "128k", "-y", out,
    ]);
  }
  console.log(`wrote ${Object.keys(BEDS).length} PLACEHOLDER music beds to ${MUSIC}`);
}

await photos();
await music();
