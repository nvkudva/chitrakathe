import { chromium } from "playwright-core";
const S = "/tmp/claude-0/-home-user/a059e46b-8a4d-56eb-acd5-361a04a37e2a/scratchpad";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
for (const w of [320, 360, 375, 393]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  for (const path of ["/?lang=kn", "/create/namakarana-udupi?lang=kn", "/create/griha-pravesha-classic?lang=hi"]) {
    await p.goto("http://localhost:3000" + path, { waitUntil: "networkidle" });
    await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      const de = document.documentElement;
      const off: any[] = [];
      document.querySelectorAll("*").forEach(el => { const b = el.getBoundingClientRect(); if (b.right > de.clientWidth + 0.5) off.push({ tag: el.tagName, cls: (el.className||"").toString().slice(0,55), right: +b.right.toFixed(1), w: +b.width.toFixed(1), t:(el.textContent||"").trim().slice(0,30) }); });
      const track = document.querySelector('div[role=group][aria-label="Language"]') as HTMLElement;
      return { ow: de.scrollWidth - de.clientWidth, cw: de.clientWidth, trackW: track ? +track.getBoundingClientRect().width.toFixed(1) : null, trackRight: track? +track.getBoundingClientRect().right.toFixed(1):null, off: off.slice(0,8) };
    });
    console.log(w, path, JSON.stringify(r));
  }
  if (w === 360) { await p.goto("http://localhost:3000/?lang=kn", {waitUntil:"networkidle"}); await p.waitForTimeout(800); await p.screenshot({ path: `${S}/z-360-home-kn.png` }); }
  await ctx.close();
}
await b.close();
