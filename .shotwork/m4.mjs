import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext()).newPage();
await p.setContent(`<style>.a{-webkit-backdrop-filter:blur(9px);backdrop-filter:blur(9px)} html .a{-webkit-backdrop-filter:none}</style><div class=a>x</div>`);
console.log(await p.evaluate(() => getComputedStyle(document.querySelector('.a')).backdropFilter));
console.log(await p.evaluate(() => b?1:1), 'ver', await b.version?.());
await b.close();
