/**
 * Generates development stand-ins so milestone 1 runs with no network, no
 * uploads and no licensed assets:
 *   - 8 placeholder "family photos"
 *   - 4 placeholder music beds
 *
 * The music beds are PLACEHOLDERS. They must be replaced with licensed or
 * original beds before launch. See docs/known-gaps.md.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { ffmpeg } from "../src/lib/render/ffmpeg";

const PHOTOS = path.resolve("fixtures/photos");
const MUSIC = path.resolve("assets/music");

const TONES: [string, string][] = [
  ["0x2b1216", "0xd8a35a"],
  ["0x1a2430", "0x9ec7d8"],
  ["0x2e1a10", "0xe0b184"],
  ["0x151d16", "0x9fc79a"],
  ["0x2a1420", "0xd79ab6"],
  ["0x1c1c26", "0xb8b4d8"],
  ["0x30200f", "0xe8c88a"],
  ["0x101c1e", "0x8fc4c2"],
];

async function photos() {
  await fs.mkdir(PHOTOS, { recursive: true });
  for (let i = 0; i < TONES.length; i++) {
    const [a, b] = TONES[i]!;
    const out = path.join(PHOTOS, `${String(i + 1).padStart(2, "0")}.jpg`);
    await ffmpeg([
      "-f", "lavfi",
      "-i", `gradients=s=1600x2000:d=1:c0=${a}:c1=${b}:x0=200:y0=200:nb_colors=2`,
      "-vf", `noise=alls=9:allf=t,vignette,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='PHOTO ${i + 1}':fontcolor=white@0.5:fontsize=110:x=(w-text_w)/2:y=(h-text_h)/2`,
      "-frames:v", "1", "-q:v", "2", "-y", out,
    ]);
  }
  console.log(`wrote ${TONES.length} placeholder photos to ${PHOTOS}`);
}

/** Four moods, built from layered sines. Placeholder, not a soundtrack. */
const BEDS: Record<string, string> = {
  "temple-warm":
    "sine=f=110:d=45,volume=0.5[a];sine=f=165:d=45,volume=0.3[b];sine=f=220:d=45,volume=0.18[c];[a][b][c]amix=inputs=3,tremolo=f=0.4:d=0.3,aecho=0.8:0.9:600:0.25",
  "strings-swell":
    "sine=f=98:d=45,volume=0.45[a];sine=f=147:d=45,volume=0.32[b];sine=f=294:d=45,volume=0.12[c];[a][b][c]amix=inputs=3,tremolo=f=0.22:d=0.5,aecho=0.8:0.88:900:0.3",
  "playful-strings":
    "sine=f=262:d=45,volume=0.35[a];sine=f=330:d=45,volume=0.28[b];sine=f=392:d=45,volume=0.2[c];[a][b][c]amix=inputs=3,tremolo=f=2.4:d=0.5",
  "nadaswaram-soft":
    "sine=f=131:d=45,volume=0.48[a];sine=f=196:d=45,volume=0.3[b];sine=f=262:d=45,volume=0.16[c];[a][b][c]amix=inputs=3,tremolo=f=0.7:d=0.35,aecho=0.8:0.9:1200:0.35",
};

async function music() {
  await fs.mkdir(MUSIC, { recursive: true });
  for (const [name, graph] of Object.entries(BEDS)) {
    const out = path.join(MUSIC, `${name}.m4a`);
    await ffmpeg([
      "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo:d=45",
      "-filter_complex", `${graph},afade=t=in:st=0:d=2,afade=t=out:st=42:d=3,aresample=48000[out]`,
      "-map", "[out]", "-t", "45", "-c:a", "aac", "-b:a", "128k", "-y", out,
    ]);
  }
  console.log(`wrote ${Object.keys(BEDS).length} PLACEHOLDER music beds to ${MUSIC}`);
}

await photos();
await music();
