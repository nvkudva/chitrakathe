import Link from "next/link";
import { listTemplates, totalDuration } from "@/lib/templates";
import { config } from "@/lib/config";
import { rupees } from "@/lib/money";
import { t, isLanguage } from "@/lib/i18n/ui";
import LanguageBar from "@/components/LanguageBar";

export default async function Gallery({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang: raw } = await searchParams;
  const lang = isLanguage(raw) ? raw : "en";
  const templates = listTemplates();
  const price = rupees(config().PRICE_LAUNCH_PAISE);

  return (
    <div lang={lang} className="rise space-y-9">
      <section className="space-y-5">
        <LanguageBar current={lang} basePath="/" />
        <h1 className="t-display ink-1 max-w-[18ch]">{t(lang, "app.tagline")}</h1>
        <p className="t-body-lg ink-2 max-w-[46ch]">{t(lang, "gallery.sub")}</p>
        <p className="t-callout" style={{ color: "var(--color-accent-text)" }}>
          {t(lang, "gallery.priceNote").replace("{price}", price)}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {templates.map((tpl) => (
          <Link
            key={tpl.id}
            href={`/create/${tpl.id}?lang=${lang}`}
            className="glass tier-2 card-press focus-ring block overflow-hidden p-4"
          >
            <div
              className="mb-4 aspect-[4/3] w-full rounded-2xl"
              style={{
                background: `radial-gradient(120% 90% at 30% 10%, ${tpl.palette.muted}, ${tpl.palette.bg} 70%)`,
                boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.12), inset 0 0 0 1px rgb(255 255 255 / 0.06)",
              }}
            />
            <h2 className="t-title-3 ink-1">{tpl.name[lang]}</h2>
            <p className="mt-1.5 t-subhead ink-3">{tpl.blurb[lang]}</p>
            <p className="mt-4 t-caption ink-4">
              {totalDuration(tpl)}s · {tpl.region}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
