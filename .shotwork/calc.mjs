const hx=(h)=>{h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16))};
const f=v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4};
const L=(c)=>0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]);
const CR=(a,b)=>{const l1=L(a),l2=L(b);return +(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05))).toFixed(2)};
// clampSceneBase logic from theme.ts
function clampBase(hex,maxLuma=0.055){let [r,g,b]=hx(hex);const luma=(0.2126*r+0.7152*g+0.0722*b)/255;
  if(luma>maxLuma){const k=maxLuma/luma;r=Math.round(r*k);g=Math.round(g*k);b=Math.round(b*k);}return [r,g,b];}
const tpl={
 'first-birthday':{bg:'#1A1210',ink:'#FFF6EA',accent:'#FF7A5C',muted:'#63C7B2'},
 'griha':{bg:'#0F1410',ink:'#F6EFDD',accent:'#C9A227',muted:'#1E4033'},
 'namakarana':{bg:'#140507',ink:'#FBF3E4',accent:'#D4A017',muted:'#7B1E28'},
 'coastal':{bg:'#0B1220',ink:'#F4EDE0',accent:'#C8A45C',muted:'#2D4260'},
};
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v*(1-t)+b[i]*t));
for(const [k,p] of Object.entries(tpl)){
  const base=clampBase(p.bg);
  const rows=[];
  for(const a of [0.14,0.20,0.26,0.32,0.40]){
    const hot=mix(base,hx(p.muted),a);
    // tier-2 flat fill: color-mix(base 100%, white 7%) => approximately base mixed 7% toward white
    const t2flat = mix(base, [255,255,255], 0.07);
    // tier-3 glass over hot: ~ hot + white gradient .135/.085 + scene-base 44%. approximate lightest: mix(hot,white,0.135)
    const t3 = mix(hot,[255,255,255],0.135);
    rows.push({a, hotL:+L(hot).toFixed(4), t3:'#'+t3.map(v=>v.toString(16).padStart(2,'0')).join(''), inkCR:CR(hx(p.ink),t3), ink3CR:CR(mix(t3,hx(p.ink),0.62),t3)});
  }
  console.log(k, 'base',base, 't2flat', mix(base,[255,255,255],0.07), JSON.stringify(rows));
}
// measured card fill vs page
console.log('card fill vs page', CR([61,47,48],[29,14,9]));
console.log('side rim vs inner', CR([40,27,29],[32,18,20]));
console.log('top rim vs scene', CR([141,134,136],[19,6,8]));
console.log('ink4 on t2flat namakarana:', CR(mix([34,22,24],hx('#FBF3E4'),0.46),[34,22,24]));
console.log('ink3 on t2flat namakarana:', CR(mix([34,22,24],hx('#FBF3E4'),0.62),[34,22,24]));
