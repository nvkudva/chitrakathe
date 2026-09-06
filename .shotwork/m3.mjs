import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/?lang=kn', { waitUntil: 'networkidle' });
const r = await page.evaluate(() => {
  const out = { sheets: [], hits: [] };
  for (const s of document.styleSheets) {
    let rules; try { rules = s.cssRules } catch { continue }
    out.sheets.push({ href: s.href, n: rules.length });
    const walk = (list, ctxTxt) => {
      for (const r of list) {
        if (r.cssRules) { walk(r.cssRules, ctxTxt + ' | ' + (r.conditionText||r.media?.mediaText||r.name||r.type)); continue; }
        if (r.selectorText && /tier-2|data-glass/.test(r.selectorText)) out.hits.push({ sel: r.selectorText, ctx: ctxTxt, css: r.style.cssText.slice(0,200) });
      }
    };
    walk(rules, '');
  }
  return out;
});
console.log(JSON.stringify(r, null, 1).slice(0, 6000));
await browser.close();
