/**
 * Milestone 5 check: every template's hero card in every launch language.
 *
 * Renders the reveal card and the details card for all 4 templates x 4
 * languages and tiles them into two contact sheets. Indic shaping fails
 * silently — a missing font gives tofu, a bad stack gives broken conjuncts,
 * and a long venue line overflows the frame — none of which throws. So the
 * check is: render everything, then look at it.
 *
 *   npx tsx scripts/check-languages.ts
 *
 * It also fails loudly on the two things that CAN be checked mechanically:
 * an empty card (nothing rendered) and a line that touched the frame edge.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { listTemplates, scriptFor } from "../src/lib/templates";
import { LANGUAGES, type Language, type Template, type Shot } from "../src/lib/templates/schema";
import { renderCardStill, closeBrowser } from "../src/lib/render/cards";
import { resolveSlot } from "../src/lib/render/text";
import { ffmpeg } from "../src/lib/render/ffmpeg";

const OUT = path.resolve("var/language-check");

/** Plausible family input per template, in each script. */
const SAMPLES: Record<string, Record<Language, Record<string, string>>> = {
  "namakarana-udupi": {
    kn: { babyName: "ಆದ್ವಿಕ್", parentsNames: "ಶ್ರುತಿ ಮತ್ತು ರಾಘವೇಂದ್ರ", eventDate: "2026-10-18", eventTime: "ಬೆಳಗ್ಗೆ 9:30", venue: "ಶ್ರೀ ಕೃಷ್ಣ ಮಠ ಸಭಾಂಗಣ, ಕಾರ್ ಸ್ಟ್ರೀಟ್, ಉಡುಪಿ" },
    kok: { babyName: "आद्विक", parentsNames: "श्रुती आनी राघवेंद्र", eventDate: "2026-10-18", eventTime: "सकाळीं 9:30", venue: "श्री कृष्ण मठ सभाघर, कार स्ट्रीट, उडुपी" },
    hi: { babyName: "आद्विक", parentsNames: "श्रुति और राघवेंद्र", eventDate: "2026-10-18", eventTime: "सुबह 9:30", venue: "श्री कृष्ण मठ सभागृह, कार स्ट्रीट, उडुपी" },
    en: { babyName: "Aadvik", parentsNames: "Shruti & Raghavendra", eventDate: "2026-10-18", eventTime: "9:30 in the morning", venue: "Sri Krishna Matha Hall, Car Street, Udupi" },
  },
  "save-the-date-coastal": {
    kn: { partnerA: "ಅನನ್ಯಾ", partnerB: "ವಿಕ್ರಮ್", eventDate: "2027-01-24", venue: "ಕುಡ್ಲ ಬೀಚ್ ರೆಸಾರ್ಟ್, ಮಂಗಳೂರು", hostedBy: "ಕುಡ್ವ ಮತ್ತು ಶೆಣೈ ಕುಟುಂಬಗಳು" },
    kok: { partnerA: "अनन्या", partnerB: "विक्रम", eventDate: "2027-01-24", venue: "कुडला बीच रिसॉर्ट, मंगळूर", hostedBy: "कुडवा आनी शेणय कुटुंबां" },
    hi: { partnerA: "अनन्या", partnerB: "विक्रम", eventDate: "2027-01-24", venue: "कुडला बीच रिज़ॉर्ट, मंगलूरु", hostedBy: "कुडवा और शेणै परिवार" },
    en: { partnerA: "Ananya", partnerB: "Vikram", eventDate: "2027-01-24", venue: "Kudla Beach Resort, Mangaluru", hostedBy: "The Kudva & Shenoy families" },
  },
  "first-birthday-storybook": {
    kn: { childName: "ಮೈರಾ", parentsNames: "ದೀಪಾ ಮತ್ತು ಅರುಣ್", eventDate: "2026-11-08", eventTime: "ಸಂಜೆ 5:00", venue: "ಸಿಲ್ವರ್ ಓಕ್ ಬ್ಯಾಂಕ್ವೆಟ್, ಬೆಂಗಳೂರು" },
    kok: { childName: "मैरा", parentsNames: "दीपा आनी अरुण", eventDate: "2026-11-08", eventTime: "सांजेर 5:00", venue: "सिल्वर ओक बँक्वेट, बेंगळूर" },
    hi: { childName: "मायरा", parentsNames: "दीपा और अरुण", eventDate: "2026-11-08", eventTime: "शाम 5:00", venue: "सिल्वर ओक बैंक्वेट, बेंगलुरु" },
    en: { childName: "Myra", parentsNames: "Deepa & Arun", eventDate: "2026-11-08", eventTime: "5 in the evening", venue: "Silver Oak Banquet, Bengaluru" },
  },
  "griha-pravesha-classic": {
    kn: { familyName: "ಪೈ", eventDate: "2026-12-03", muhurtaTime: "ಬೆಳಗ್ಗೆ 7:45", address: "ನಂ. 42, ಶಾಂತಿ ನಿವಾಸ, 3ನೇ ಕ್ರಾಸ್, ಜಯನಗರ, ಬೆಂಗಳೂರು 560041" },
    kok: { familyName: "पै", eventDate: "2026-12-03", muhurtaTime: "सकाळीं 7:45", address: "क्र. 42, शांती निवास, 3वो क्रॉस, जयनगर, बेंगळूर 560041" },
    hi: { familyName: "पै", eventDate: "2026-12-03", muhurtaTime: "सुबह 7:45", address: "सं. 42, शांति निवास, तीसरा क्रॉस, जयनगर, बेंगलुरु 560041" },
    en: { familyName: "Pai", eventDate: "2026-12-03", muhurtaTime: "7:45 in the morning", address: "No. 42, Shanti Nivas, 3rd Cross, Jayanagar, Bengaluru 560041" },
  },
};

/** The card carrying a `hero` line, and the last card (always the details). */
function pickCards(t: Template): { reveal: Shot; details: Shot } {
  const cards = t.shots.filter((s) => s.type === "title_card" || s.type === "lower_third");
  const reveal = cards.find((s) => "lines" in s && s.lines.some((l) => l.style === "hero"));
  const details = cards[cards.length - 1]!;
  if (!reveal) throw new Error(`${t.id} has no hero card — every template needs one reveal`);
  return { reveal, details };
}

const problems: string[] = [];

async function renderOne(t: Template, lang: Language, shot: Shot, tag: string): Promise<string> {
  if (!("lines" in shot)) throw new Error("not a card");
  const fields = SAMPLES[t.id]?.[lang];
  if (!fields) throw new Error(`No sample fields for ${t.id}/${lang}`);
  const brief = {
    templateId: t.id,
    templateVersion: t.version,
    language: lang,
    fields,
    photos: ["x"],
    aspects: ["9:16" as const],
  };

  const last = path.join(OUT, `still.${t.id}.${lang}.${tag}.png`);
  await renderCardStill(
    {
      lines: shot.lines.map((slot) => ({ text: resolveSlot(t, brief, slot), slot })),
      template: t,
      script: scriptFor(t, lang),
      aspect: "9:16",
      seconds: shot.duration,
      transparent: false,
      anchor: shot.type === "lower_third" ? "bottom" : "center",
    },
    last
  );
  const cell = path.join(OUT, `cell.${t.id}.${lang}.${tag}.png`);

  // Mechanical checks: ink present, and nothing bleeding off the edges.
  const stats = await inkStats(last);
  if (stats.ink < 0.004) problems.push(`${t.id}/${lang}/${tag}: card is blank (ink ${stats.ink.toFixed(4)})`);
  if (stats.edgeInk > 0.0015) problems.push(`${t.id}/${lang}/${tag}: text touches the frame edge (${stats.edgeInk.toFixed(4)})`);

  await ffmpeg([
    "-i", last,
    "-vf", `scale=270:480,drawbox=x=0:y=0:w=270:h=480:color=0x333333:t=1,` +
      `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='${lang}':fontcolor=white@0.75:fontsize=20:x=8:y=6:box=1:boxcolor=black@0.6:boxborderw=4`,
    "-y", cell,
  ]);
  return cell;
}

/**
 * Ink coverage, measured on the pixels rather than on ffmpeg's log output.
 *
 * Decodes the card to raw 8-bit grey and counts pixels brighter than the
 * palette background. Type on these templates is always light on dark, so
 * "bright pixel" is a sound proxy for "glyph", and a blank card scores zero
 * whether it failed to load a font or failed to resolve a string.
 */
async function inkStats(png: string): Promise<{ ink: number; edgeInk: number }> {
  const W = 216;
  const H = 384;
  const raw = path.join(OUT, `.probe-${path.basename(png)}.gray`);
  await ffmpeg(["-i", png, "-vf", `scale=${W}:${H},format=gray`, "-f", "rawvideo", "-y", raw]);
  const buf = await fs.readFile(raw);
  await fs.rm(raw, { force: true });

  // Background is the modal value; anything well above it is a glyph.
  const hist = new Uint32Array(256);
  for (const v of buf) hist[v]!++;
  let bg = 0;
  for (let i = 0; i < 256; i++) if (hist[i]! > hist[bg]!) bg = i;
  const threshold = Math.min(255, bg + 45);

  let lit = 0;
  let edgeLit = 0;
  const edgeRows = 10;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (buf[y * W + x]! <= threshold) continue;
      lit++;
      if (y < edgeRows || y >= H - edgeRows || x < edgeRows || x >= W - edgeRows) edgeLit++;
    }
  }
  return { ink: lit / (W * H), edgeInk: edgeLit / (W * H) };
}

async function main() {
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });

  for (const tag of ["reveal", "details"] as const) {
    const cells: string[] = [];
    for (const t of listTemplates()) {
      const shot = pickCards(t)[tag];
      for (const lang of LANGUAGES) {
        process.stdout.write(`\r  ${tag}: ${t.id} / ${lang}`.padEnd(70));
        cells.push(await renderOne(t, lang, shot, tag));
      }
    }
    const sheet = path.join(OUT, `contact-sheet.${tag}.png`);
    await ffmpeg([
      ...cells.flatMap((c) => ["-i", c]),
      "-filter_complex", `${cells.map((_, i) => `[${i}:v]`).join("")}xstack=inputs=${cells.length}:layout=${layout4x4()}[v]`,
      "-map", "[v]", "-y", sheet,
    ]);
    process.stdout.write(`\r  ${tag}: ${sheet}`.padEnd(70) + "\n");
  }

  await closeBrowser();

  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s):`);
    for (const p of problems) console.error(`    - ${p}`);
    process.exit(1);
  }
  console.log(`\n  16 template x language cards rendered per sheet, no blanks, nothing off-frame.`);
  console.log(`  Shaping and wrapping still need human eyes — open the sheets.\n`);
}

/** 4 columns x 4 rows of 270x480 cells. */
function layout4x4(): string {
  const cells: string[] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) cells.push(`${c * 270}_${r * 480}`);
  return cells.join("|");
}

await main();
