import { chromium } from 'playwright-core';
const OUT='/tmp/claude-0/-home-user/a059e46b-8a4d-56eb-acd5-361a04a37e2a/scratchpad/shots';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 });
const p = await ctx.newPage();
await p.goto('http://localhost:3000/create/namakarana-udupi?lang=kn', { waitUntil:'networkidle' });
await p.evaluate(()=>document.documentElement.removeAttribute('data-glass'));
await p.waitForTimeout(500);
// crop: top of form
await p.screenshot({path:OUT+'/c-form-top.png', clip:{x:0,y:0,width:393,height:640}});
await p.evaluate(()=>window.scrollTo(0,560));
await p.waitForTimeout(300);
await p.screenshot({path:OUT+'/c-fields.png', clip:{x:0,y:0,width:393,height:600}});
await p.evaluate(()=>window.scrollTo(0,2600));
await p.waitForTimeout(300);
await p.screenshot({path:OUT+'/c-bottom.png', clip:{x:0,y:0,width:393,height:700}});
await b.close();
