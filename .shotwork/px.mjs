import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();

async function sample(url, label){
  await p.goto(url,{waitUntil:'networkidle'});
  await p.evaluate(()=>document.documentElement.removeAttribute('data-glass'));
  await p.waitForTimeout(400);
  const buf = await p.screenshot({fullPage:true});
  const res = await p.evaluate(async (b64)=>{
    const img = await new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src='data:image/png;base64,'+b64;});
    const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
    const g=c.getContext('2d');g.drawImage(img,0,0);
    const px=(x,y)=>{const d=g.getImageData(Math.round(x),Math.round(y),1,1).data;return [d[0],d[1],d[2]];};
    const L=(rgb)=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4};return 0.2126*f(rgb[0])+0.7152*f(rgb[1])+0.0722*f(rgb[2])};
    const CR=(a,bb)=>{const l1=L(a),l2=L(bb);return +(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05))).toFixed(2)};
    const out={w:img.width,h:img.height};
    // scene luminance across page
    const pts=[[196,10],[196,300],[10,700],[380,900],[196,1200]];
    out.sceneSamples = pts.map(([x,y])=>({x,y,rgb:px(x,y),L:+L(px(x,y)).toFixed(4)}));
    out.px = px; // not serializable
    delete out.px;
    // helper exported
    window.__px = px; window.__L=L; window.__CR=CR;
    return out;
  }, buf.toString('base64'));
  return res;
}
const home = await sample('http://localhost:3000/?lang=kn');
console.log('HOME', JSON.stringify(home));
// now measure specific element edges on home
const edge = await p.evaluate(()=>{
  const px=window.__px, CR=window.__CR, L=window.__L;
  const card = document.querySelector('a[href*="/create/"]').getBoundingClientRect();
  const scrollY = window.scrollY;
  const cx = Math.round(card.x+card.width/2), cy=Math.round(card.y+scrollY);
  const out={};
  out.cardRect={x:card.x,y:card.y+scrollY,w:card.width,h:card.height};
  // vertical strip through the card top edge
  out.topStrip = [];
  for(let d=-4;d<=8;d++) out.topStrip.push({d, rgb: px(cx, cy+d)});
  // left edge strip through vertical middle
  const my = Math.round(card.y+scrollY+card.height/2);
  out.leftStrip=[]; for(let d=-4;d<=8;d++) out.leftStrip.push({d, rgb: px(Math.round(card.x)+d, my)});
  // bottom edge
  const by = Math.round(card.y+scrollY+card.height);
  out.botStrip=[]; for(let d=-8;d<=4;d++) out.botStrip.push({d, rgb: px(cx, by+d)});
  // card fill vs page bg beside card
  out.cardFill = px(cx, cy+ Math.round(card.height)-30);
  out.pageBesideCard = px(8, my);
  out.cardVsPage = CR(out.cardFill, out.pageBesideCard);
  return out;
});
console.log('HOME EDGE', JSON.stringify(edge,null,1));
await b.close();
