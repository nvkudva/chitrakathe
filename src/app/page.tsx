import Link from "next/link";
import { listTemplates, totalDuration } from "@/lib/templates";
import { config } from "@/lib/config";
import { rupees } from "@/lib/money";
import { t, isLanguage } from "@/lib/i18n/ui";
import LanguageBar from "@/components/LanguageBar";
import SampleTile from "@/components/SampleTile";
import { templateStyle } from "@/lib/theme";

/**
 * The gallery shows the product.
 *
 * It used to show four CSS gradients — a video business whose shop window had
 * no video in it, so a family chose a template blind and only ever saw a
 * trailer after signing in, uploading eight photos and waiting six minutes.
 * Every card is now the real 9:16 sample rendered by
 * `scripts/render-samples.ts`, and one of them is playing before the first
 * scroll. SampleTile keeps exactly one decoder alive at a time.
 */
export default async function Gallery({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang: raw } = await searchParams;
  const lang = isLanguage(raw) ? raw : "en";
  const templates = listTemplates();
  const price = rupees(config().PRICE_LAUNCH_PAISE);

  // The hero is the namakarana sample: it is the busiest occasion in the
  // catalogue and the one whose sample carries the most faces.
  const hero = templates.find((x) => x.id === "namakarana-udupi") ?? templates[0]!;

  return (
    <div lang={lang} className="rise space-y-10">
      <LanguageBar current={lang} basePath="/" />

      <section className="grid items-center gap-7 lg:grid-cols-[1fr_auto] lg:gap-12">
        <div className="space-y-4 lg:order-1">
          <h1 className="t-display ink-1 max-w-[18ch]">{t(lang, "app.tagline")}</h1>
          <p className="t-body-lg ink-2 max-w-[46ch]">{t(lang, "gallery.sub")}</p>
          <p className="t-callout gold-ink">{t(lang, "gallery.priceNote").replace("{price}", price)}</p>
        </div>

        <div className="lg:order-2 space-y-2">
          <SampleTile
            templateId={hero.id}
            hero
            className="mx-auto w-full"
            /* 58svh keeps the hero at roughly 60% of the first screen on a
               phone without pushing the headline off it; the px cap stops it
               becoming a billboard on a desktop monitor. */
            style={{ height: "min(58svh, 520px)", aspectRatio: "9 / 16" }}
          />
          <p className="t-footnote ink-3 text-center">{t(lang, "gallery.sampleNote")}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="t-title-3 ink-1">{t(lang, "gallery.heading")}</h2>
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {templates.map((tpl) => (
            <li key={tpl.id} style={templateStyle(tpl)}>
              <Link
                href={`/create/${tpl.id}?lang=${lang}`}
                className="card-press focus-ring block rounded-[20px]"
              >
                <SampleTile templateId={tpl.id} label={tpl.name[lang]} className="w-full aspect-[9/16]" />
                <p className="mt-2.5 t-subhead ink-2">{tpl.blurb[lang]}</p>
                <p className="mt-1 t-caption" style={{ color: "var(--color-accent-text)" }}>
                  {t(lang, "gallery.watch").replace("{n}", String(totalDuration(tpl)))}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
