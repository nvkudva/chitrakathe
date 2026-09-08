import type { Language } from "@/lib/templates/schema";

/**
 * A plain-language summary in the reader's own language, above the operative
 * English text.
 *
 * The full terms stay English on purpose: a machine-translated refund clause
 * that says something slightly different from the one we would defend is worse
 * than an honest English one. These summaries are written to be true to the
 * text below them, and they say which version governs.
 */
const GOVERNS: Record<Language, string> = {
  en: "",
  kn: "ಕೆಳಗಿನ ಇಂಗ್ಲಿಷ್ ಪಠ್ಯವೇ ಅಧಿಕೃತ.",
  hi: "नीचे दिया गया अंग्रेज़ी पाठ ही मान्य है।",
  kok: "सकयल दिल्लो इंग्लीश मजकूर आधिकारीक.",
};

export default function LegalSummary({ lang, points }: { lang: Language; points: Record<Language, string[]> }) {
  if (lang === "en") return null;
  const lines = points[lang];
  if (!lines?.length) return null;

  return (
    <aside lang={lang} className="panel panel-rel tier-0 space-y-2 p-4">
      <ul className="space-y-2 t-body ink-1">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <p className="t-footnote ink-3">{GOVERNS[lang]}</p>
    </aside>
  );
}
