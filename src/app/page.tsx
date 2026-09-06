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
    <div className="space-y-10">
      <section className="space-y-4">
        <LanguageBar current={lang} basePath="/" />
        <h1 className="text-4xl font-semibold">{t(lang, "app.tagline")}</h1>
        <p className="max-w-2xl text-white/70">
          {t(lang, "gallery.sub")} {t(lang, "gallery.priceNote").replace("{price}", price)}
        </p>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        {templates.map((tpl) => (
          <Link
            key={tpl.id}
            href={`/create/${tpl.id}?lang=${lang}`}
            className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[var(--color-accent)]/60"
          >
            <div
              className="mb-4 h-40 rounded-lg"
              style={{ background: `radial-gradient(120% 80% at 30% 20%, ${tpl.palette.muted}, ${tpl.palette.bg})` }}
            />
            <h2 className="text-xl font-semibold" style={{ color: tpl.palette.ink }}>
              {tpl.name[lang]}
            </h2>
            <p className="mt-1 text-sm text-white/60">{tpl.blurb[lang]}</p>
            <p className="mt-3 text-xs uppercase tracking-widest text-white/40">
              {tpl.shots.length} · {totalDuration(tpl)}s · {tpl.photosRequired.min}–{tpl.photosRequired.max} · {tpl.region}
            </p>
            <span className="mt-4 inline-block text-sm text-[var(--color-accent)] group-hover:underline">
              {t(lang, "gallery.cta")} →
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
