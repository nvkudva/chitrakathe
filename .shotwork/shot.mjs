import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = '/tmp/claude-0/-home-user/a059e46b-8a4d-56eb-acd5-361a04a37e2a/scratchpad/shots';
fs.mkdirSync(OUT, { recursive: true });

const pages = [
  ['home-kn', '/?lang=kn'],
  ['home-en', '/?lang=en'],
  ['create-kn', '/create/namakarana-udupi?lang=kn'],
  ['create-hi', '/create/griha-pravesha-classic?lang=hi'],
  ['privacy', '/privacy'],
  ['terms', '/terms'],
  ['admin', '/admin/costs?token=devtoken'],
];

const viewports = [
  ['phone', { width: 393, height: 852 }, 3],
  ['desk', { width: 1280, height: 900 }, 2],
];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});

for (const [vname, vp, dsf] of viewports) {
  for (const glass of ['on', 'off']) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dsf });
    const page = await ctx.newPage();
    for (const [name, path] of pages) {
      try {
        await page.goto('http://localhost:3000' + path, { waitUntil: 'networkidle', timeout: 60000 });
      } catch (e) { console.log('nav fail', name, e.message); }
      if (glass === 'off') {
        await page.evaluate(() => document.documentElement.setAttribute('data-glass', 'off'));
      } else {
        await page.evaluate(() => document.documentElement.removeAttribute('data-glass'));
      }
      await page.waitForTimeout(700);
      const f = `${OUT}/${vname}-${glass}-${name}.png`;
      await page.screenshot({ path: f, fullPage: vname === 'desk' ? false : false });
      // also a full-page for create
      if (name.startsWith('create') && vname === 'phone') {
        await page.screenshot({ path: `${OUT}/${vname}-${glass}-${name}-full.png`, fullPage: true });
      }
    }
    await ctx.close();
  }
}
await browser.close();
console.log('done');
