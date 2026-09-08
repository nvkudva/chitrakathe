import { chromium } from "playwright-core";
import { promises as fs } from "node:fs";

const OUT = "var/redesign-shots";
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});

type Probe = { label: string; sel: string };

const viewports = [
  { name: "phone", width: 393, height: 852 },
  { name: "desktop", width: 1280, height: 900 },
];
const pages = [
  { name: "gallery", path: "/" },
  { name: "create", path: "/create/namakarana-udupi" },
  { name: "terms", path: "/terms" },
  { name: "mine", path: "/mine" },
];

function lum(rgb: number[]) {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(rgb[0]!) + 0.7152 * f(rgb[1]!) + 0.0722 * f(rgb[2]!);
}
function cr(a: number[], b: number[]) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

for (const vp of viewports) {
  for (const lang of ["en", "kn"]) {
    for (const p of pages) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      const url = `http://localhost:3000${p.path}?lang=${lang}`;
      await page.goto(url, { waitUntil: "networkidle" }).catch(() => {});
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${OUT}/${p.name}-${vp.name}-${lang}.png` });

      // Measure the real composited colours, not the tokens.
      const probes: Probe[] = [
        { label: "h1", sel: "h1" },
        { label: "body-p", sel: "p.t-body-lg, p.t-body" },
        { label: "tertiary", sel: ".ink-3, .t-caption, .t-footnote" },
      ];
      const measured = (await page.evaluate(`(function(){
        var probes = ${JSON.stringify(probes)};
        function parse(s){ return s.match(/\\d+(\\.\\d+)?/g).slice(0,3).map(Number); }
        function groundOf(el){
          var n = el;
          while (n) {
            var bg = getComputedStyle(n).backgroundColor;
            var m = bg.match(/rgba?\\(([^)]+)\\)/);
            if (m) {
              var parts = m[1].split(",").map(parseFloat);
              if (parts.length < 4 || parts[3] > 0.5) return bg;
            }
            n = n.parentElement;
          }
          return "rgb(255,255,255)";
        }
        return probes.map(function(pr){
          var el = document.querySelector(pr.sel);
          if (!el) return null;
          var cs = getComputedStyle(el);
          return { label: pr.label, fg: parse(cs.color), bg: parse(groundOf(el)),
                   size: cs.fontSize, weight: cs.fontWeight, tracking: cs.letterSpacing,
                   text: (el.textContent || "").slice(0, 26) };
        });
      })()`)) as ({ label: string; fg: number[]; bg: number[]; size: string; weight: string; tracking: string; text: string } | null)[];

      for (const m of measured) {
        if (!m) continue;
        console.log(
          `${p.name.padEnd(8)} ${vp.name.padEnd(8)} ${lang}  ${m.label.padEnd(9)} ` +
            `${cr(m.fg, m.bg).toFixed(2)}:1  ${m.size} w${m.weight} track=${m.tracking}  "${m.text}"`,
        );
      }
      await ctx.close();
    }
  }
}

// Gallery specifics: how many videos are playing at once, and the scrim.
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
const page = await ctx.newPage();
await page.goto("http://localhost:3000/?lang=kn", { waitUntil: "networkidle" });
await page.waitForTimeout(1800);
const state = await page.evaluate(`(function(){
  var vids = Array.prototype.slice.call(document.querySelectorAll("video"));
  var hero = document.querySelector(".screen");
  return {
    count: vids.length,
    playing: vids.filter(function(v){ return !v.paused; }).length,
    posters: vids.map(function(v){ return v.getAttribute("poster"); }),
    attrs: vids.slice(0,1).map(function(v){ return { autoplay: v.autoplay, muted: v.muted, loop: v.loop, playsInline: v.playsInline, preload: v.preload }; }),
    heroFraction: hero ? +(hero.getBoundingClientRect().height / window.innerHeight).toFixed(3) : null
  };
})()`);
console.log("gallery/phone", JSON.stringify(state));

// Same with reduced motion.
const ctx2 = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: "reduce" });
const p2 = await ctx2.newPage();
await p2.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await p2.waitForTimeout(1500);
console.log(
  "reduced-motion playing:",
  await p2.evaluate(`Array.prototype.slice.call(document.querySelectorAll("video")).filter(function(v){return !v.paused;}).length`),
);

// Scroll to the grid and re-check the one-at-a-time rule.
await page.evaluate(`window.scrollBy(0, 900)`);
await page.waitForTimeout(1500);
console.log(
  "after scroll playing:",
  await page.evaluate(`Array.prototype.slice.call(document.querySelectorAll("video")).filter(function(v){return !v.paused;}).length`),
);
await page.screenshot({ path: `${OUT}/gallery-phone-kn-scrolled.png` });

// The label over the scrim, measured against the composited pixel behind it.
const label = await page.evaluate(`(function(){
  var h = document.querySelector("li h2");
  if (!h) return null;
  var r = h.getBoundingClientRect();
  return { color: getComputedStyle(h).color, size: getComputedStyle(h).fontSize, box: [r.x, r.y, r.width, r.height] };
})()`);
console.log("tile label", JSON.stringify(label));

// Admin stays dark.
const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p3 = await ctx3.newPage();
const token = process.env.ADMIN_TOKEN ?? "devtoken";
await p3.goto(`http://localhost:3000/admin/costs?token=${token}`, { waitUntil: "networkidle" }).catch(() => {});
await p3.waitForTimeout(500);
console.log("admin body bg:", await p3.evaluate(`getComputedStyle(document.body).backgroundColor`));
await p3.screenshot({ path: `${OUT}/admin-desktop.png` });

await browser.close();
