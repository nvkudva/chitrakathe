import type { Brief, Language, Template, TextSlot } from "../templates/schema";

/**
 * Resolve a storyboard text slot to the string that will be drawn.
 *
 * Fixed lines come from the template's authored `strings` block. Family-supplied
 * values come from the brief and are NEVER translated — only rendered in the
 * chosen script.
 */
export function resolveSlot(t: Template, brief: Brief, slot: TextSlot): string {
  if (slot.stringKey) {
    const bundle = t.strings[brief.language] ?? t.strings.en ?? {};
    return bundle[slot.stringKey] ?? "";
  }
  if (!slot.key) return "";
  const raw = brief.fields[slot.key] ?? "";
  const field = t.fields.find((f) => f.key === slot.key);
  if (field?.type === "date") return formatDate(raw, brief.language);
  return raw;
}

const MONTHS: Record<Language, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  hi: ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
  kok: ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रील", "मे", "जून", "जुलय", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"],
  kn: ["ಜನವರಿ", "ಫೆಬ್ರವರಿ", "ಮಾರ್ಚ್", "ಏಪ್ರಿಲ್", "ಮೇ", "ಜೂನ್", "ಜುಲೈ", "ಆಗಸ್ಟ್", "ಸೆಪ್ಟೆಂಬರ್", "ಅಕ್ಟೋಬರ್", "ನವೆಂಬರ್", "ಡಿಸೆಂಬರ್"],
};

/** ISO date to a display string in the family's language. Falls through on junk. */
export function formatDate(iso: string, lang: Language): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return iso;
  const [, y, mo, d] = m;
  const month = MONTHS[lang]?.[Number(mo) - 1] ?? MONTHS.en[Number(mo) - 1]!;
  return `${Number(d)} ${month} ${y}`;
}

/** The voiceover script: authored lines only, plus the hero name if present. */
export function voiceoverText(t: Template, brief: Brief): string {
  const bundle = t.strings[brief.language] ?? t.strings.en ?? {};
  const lines = t.voiceover.map((k) => bundle[k]).filter((s): s is string => Boolean(s));
  return lines.join(". ") + ".";
}
