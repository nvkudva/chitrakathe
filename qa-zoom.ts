import { chromium } from "playwright-core";
const S = "/tmp/claude-0/-home-user/a059e46b-8a4d-56eb-acd5-361a04a37e2a/scratchpad";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 4 });
const p = await ctx.newPage();

// --- header wordmark clipping ---
await p.goto("http://localhost:3000/?lang=kn", { waitUntil: "networkidle" });
await p.waitForTimeout(800);
await p.screenshot({ path: `${S}/z-header.png`, clip: { x: 0, y: 0, width: 260, height: 60 } });

// measure wordmark glyph overflow
const wm = await p.evaluate(() => {
  const el = document.querySelector('span[lang="kn"]') as HTMLElement;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const range = document.createRange(); range.selectNodeContents(el);
  const rr = range.getBoundingClientRect();
  return { fontSize: cs.fontSize, lineHeight: cs.lineHeight, font: cs.fontFamily, boxTop: r.top, boxBottom: r.bottom, boxH: r.height, inkTop: rr.top, inkBottom: rr.bottom, inkH: rr.height, headerTop: (document.querySelector("header") as HTMLElement).getBoundingClientRect().top };
});
console.log("WORDMARK", JSON.stringify(wm));

// --- language bar thumb alignment ---
await p.screenshot({ path: `${S}/z-langbar-kn.png`, clip: await p.locator('div[role=group][aria-label=Language]').boundingBox().then(bb=>({x:bb!.x-6,y:bb!.y-6,width:bb!.width+12,height:bb!.height+12})) });
const seg = await p.evaluate(() => {
  const track = document.querySelector('div[role=group][aria-label="Language"]') as HTMLElement;
  const thumb = track.querySelector(".seg-thumb") as HTMLElement;
  const out: any = { thumb: thumb ? thumb.getBoundingClientRect() : null, track: track.getBoundingClientRect(), links: [] as any[] };
  track.querySelectorAll("a[data-lang]").forEach((a) => {
    const r = a.getBoundingClientRect();
    out.links.push({ lang: (a as HTMLElement).dataset.lang, x: +r.x.toFixed(1), w: +r.width.toFixed(1), h:+r.height.toFixed(1), cur: a.getAttribute("aria-current") });
  });
  return JSON.parse(JSON.stringify(out));
});
console.log("SEGCTL kn", JSON.stringify(seg));

for (const l of ["en","hi","kok"]) {
  await p.goto(`http://localhost:3000/?lang=${l}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(700);
  const s = await p.evaluate(() => {
    const track = document.querySelector('div[role=group][aria-label="Language"]') as HTMLElement;
    const thumb = track.querySelector(".seg-thumb") as HTMLElement;
    const cur = track.querySelector('a[aria-current="true"]') as HTMLElement;
    const t = thumb?.getBoundingClientRect(), c = cur?.getBoundingClientRect();
    return { thumbX:+t?.x.toFixed(1), thumbW:+t?.width.toFixed(1), curX:+c?.x.toFixed(1), curW:+c?.width.toFixed(1), dx:+(t.x-c.x).toFixed(1), dw:+(t.width-c.width).toFixed(1) };
  });
  console.log("SEGCTL", l, JSON.stringify(s));
  const bb = await p.locator('div[role=group][aria-label=Language]').boundingBox();
  await p.screenshot({ path: `${S}/z-langbar-${l}.png`, clip: {x:bb!.x-6,y:bb!.y-6,width:bb!.width+12,height:bb!.height+12} });
}
await b.close();
