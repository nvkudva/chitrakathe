import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto("http://localhost:3000/?lang=kn", { waitUntil: "networkidle" });
await p.waitForTimeout(900);
console.log(JSON.stringify(await p.evaluate(() => {
  const track = document.querySelector('div[role=group][aria-label="Language"]') as HTMLElement;
  const cs = getComputedStyle(track);
  const thumb = track.querySelector(".seg-thumb") as HTMLElement;
  const tcs = thumb ? getComputedStyle(thumb) : null;
  const kids = [...track.children].map(k => { const r=k.getBoundingClientRect(); return {tag:k.tagName, cls:(k.className||"").toString().slice(0,40), x:+r.x.toFixed(1), w:+r.width.toFixed(1), pos:getComputedStyle(k).position, ol:(k as HTMLElement).offsetLeft }; });
  const parent = track.parentElement!;
  return {
    trackDisplay: cs.display, trackWidth: cs.width, trackJustify: cs.justifyContent, trackPad: cs.padding, trackPos: cs.position, trackDir: cs.direction, trackFlexWrap: cs.flexWrap,
    parentTag: parent.tagName, parentCls: (parent.className||"").toString(), parentDisplay: getComputedStyle(parent).display, parentWidth: getComputedStyle(parent).width,
    thumbPos: tcs?.position, thumbLeft: tcs?.left, thumbTransform: tcs?.transform, thumbWidth: tcs?.width, thumbOffsetParent: thumb?.offsetParent?.tagName,
    kids, offsetParentOfLink: (track.querySelector('a[data-lang]') as HTMLElement).offsetParent?.className?.toString().slice(0,50),
  };
}, null), null, 1));
await b.close();
