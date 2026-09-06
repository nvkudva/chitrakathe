import fs from 'node:fs';
import { chromium } from 'playwright-core';
const OUT='/tmp/claude-0/-home-user/a059e46b-8a4d-56eb-acd5-361a04a37e2a/scratchpad/shots';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({viewport:{width:900,height:600}})).newPage();
const files = fs.readdirSync(OUT).filter(f=>f.includes('-on-')).map(f=>[f, f.replace('-on-','-off-')]).filter(([a,c])=>fs.existsSync(OUT+'/'+c));
for (const [a,c] of files) {
  const r = await p.evaluate(async ([u1,u2]) => {
    const load = (u) => new Promise(res => { const i = new Image(); i.onload=()=>res(i); i.src=u; });
    const [i1,i2] = await Promise.all([load(u1),load(u2)]);
    const cv = document.createElement('canvas'); cv.width=i1.width; cv.height=i1.height;
    const g = cv.getContext('2d'); g.drawImage(i1,0,0); const d1=g.getImageData(0,0,cv.width,cv.height).data;
    g.clearRect(0,0,cv.width,cv.height); g.drawImage(i2,0,0); const d2=g.getImageData(0,0,cv.width,cv.height).data;
    let diff=0,max=0,sum=0;
    for(let k=0;k<d1.length;k+=4){const dd=Math.abs(d1[k]-d2[k])+Math.abs(d1[k+1]-d2[k+1])+Math.abs(d1[k+2]-d2[k+2]); if(dd>3)diff++; if(dd>max)max=dd; sum+=dd;}
    return {px:d1.length/4, diff, max, mean:+(sum/(d1.length/4)).toFixed(2)};
  }, ['data:image/png;base64,'+fs.readFileSync(OUT+'/'+a).toString('base64'),'data:image/png;base64,'+fs.readFileSync(OUT+'/'+c).toString('base64')]);
  console.log(a.padEnd(34), JSON.stringify(r));
}
await b.close();
