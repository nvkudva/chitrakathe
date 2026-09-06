import { chromium } from "playwright-core";

const JOB_OK = "19d8e6f3-ec0e-489d-9a6c-13df9c369711";
const JOB_REFUSED = "2e452d10-144e-4988-81ac-cf0b6593d291";

const PAGES = [
  ["home-en", "/"],
  ["home-kn", "/?lang=kn"],
  ["home-hi", "/?lang=hi"],
  ["home-kok", "/?lang=kok"],
  ["create-nama-kn", "/create/namakarana-udupi?lang=kn"],
  ["create-nama-en", "/create/namakarana-udupi?lang=en"],
  ["create-std-kn", "/create/save-the-date-coastal?lang=kn"],
  ["create-fb-kok", "/create/first-birthday-storybook?lang=kok"],
  ["create-gp-hi", "/create/griha-pravesha-classic?lang=hi"],
  ["mine", "/mine"],
  ["privacy", "/privacy?lang=kn"],
  ["admin", "/admin/costs?token=devtoken"],
  ["job-ok-kn", `/t/${JOB_OK}?lang=kn`],
  ["job-refused", `/t/${JOB_REFUSED}?lang=kn`],
  ["job-badid", "/t/not-a-uuid"],
];

const VIEWPORTS: [string, number, number][] = [["phone", 393, 852], ["desk", 1280, 900]];

const out: any = {};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });

for (const [vname, w, h] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  for (const [name, path] of PAGES) {
    const page = await ctx.newPage();
    const logs: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`[${m.type()}] ${m.text()}`); });
    page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
    page.on("requestfailed", (r) => logs.push(`[reqfail] ${r.url().slice(0, 120)} ${r.failure()?.errorText}`));
    await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle" }).catch((e) => logs.push(`[goto] ${e.message}`));
    await page.waitForTimeout(1200);

    const info = await page.evaluate(() => {
      const de = document.documentElement;
      // horizontal overflow
      const overflow = de.scrollWidth - de.clientWidth;
      const offenders: any[] = [];
      if (overflow > 0) {
        document.querySelectorAll("*").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.right > de.clientWidth + 1 || r.left < -1) {
            offenders.push({ tag: el.tagName, cls: (el.className || "").toString().slice(0, 70), right: Math.round(r.right), left: Math.round(r.left), text: (el.textContent || "").trim().slice(0, 40) });
          }
        });
      }
      // small tap targets
      const small: any[] = [];
      document.querySelectorAll("a,button,input,select,textarea,[role=button],label[for]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") return;
        if (el.classList.contains("sr-only")) return;
        if (r.width < 44 || r.height < 44) {
          small.push({ tag: el.tagName, cls: (el.className||"").toString().slice(0,60), w: +r.width.toFixed(1), h: +r.height.toFixed(1), text: (el.textContent||"").trim().slice(0,40) });
        }
      });
      // text clipping: scrollHeight > clientHeight on text-bearing elements
      const clipped: any[] = [];
      document.querySelectorAll("h1,h2,h3,p,span,a,button,label,li,td,th").forEach((el) => {
        const cs = getComputedStyle(el);
        if (cs.overflow === "hidden" || cs.overflowY === "hidden") {
          if (el.scrollHeight > el.clientHeight + 1 && el.clientHeight > 0) {
            clipped.push({ tag: el.tagName, cls: (el.className||"").toString().slice(0,60), sh: el.scrollHeight, ch: el.clientHeight, text: (el.textContent||"").trim().slice(0,50) });
          }
        }
      });
      return { overflow, scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, offenders: offenders.slice(0, 12), small, clipped, htmlLang: de.lang };
    });

    out[`${vname}:${name}`] = { ...info, logs };
    await page.screenshot({ path: `/tmp/claude-0/-home-user/a059e46b-8a4d-56eb-acd5-361a04a37e2a/scratchpad/${vname}-${name}.png`, fullPage: true });
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
