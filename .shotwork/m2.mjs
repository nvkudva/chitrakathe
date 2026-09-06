import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/?lang=kn', { waitUntil: 'networkidle' });
const r = await page.evaluate(() => ({
  mq: {
    rt_reduce: matchMedia('(prefers-reduced-transparency: reduce)').matches,
    rt_nopref: matchMedia('(prefers-reduced-transparency: no-preference)').matches,
    rm: matchMedia('(prefers-reduced-motion: reduce)').matches,
    w479: matchMedia('(max-width: 479px)').matches,
    hover: matchMedia('(hover: hover)').matches,
    supportsBF: CSS.supports('backdrop-filter','blur(1px)'),
  },
  innerWidth,
  dataGlass: document.documentElement.dataset.glass,
  cardBF: getComputedStyle(document.querySelector('a[href*="/create/"]')).backdropFilter,
  cardBGC: getComputedStyle(document.querySelector('a[href*="/create/"]')).backgroundColor,
  headerPos: getComputedStyle(document.querySelector('header')).position,
  thumbPos: getComputedStyle(document.querySelector('[aria-label="Language"] span[aria-hidden]')).position,
}));
console.log(JSON.stringify(r, null, 1));
await browser.close();
