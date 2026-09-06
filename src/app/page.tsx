import Link from "next/link";
import { listTemplates, totalDuration } from "@/lib/templates";
import { config } from "@/lib/config";
import { rupees } from "@/lib/money";

export default function Gallery() {
  const templates = listTemplates();
  const price = rupees(config().PRICE_LAUNCH_PAISE);

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-4xl font-semibold">A trailer for your family function.</h1>
        <p className="text-white/70 max-w-2xl">
          Not a video editor. Not a prompt box. Pick a storyboard built for the occasion, fill six fields,
          add your photos. Watermarked preview free, {price} to download it clean.
        </p>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        {templates.map((t) => (
          <Link
            key={t.id}
            href={`/create/${t.id}`}
            className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[var(--color-accent)]/60"
          >
            <div
              className="mb-4 h-40 rounded-lg"
              style={{ background: `radial-gradient(120% 80% at 30% 20%, ${t.palette.muted}, ${t.palette.bg})` }}
            />
            <h2 className="text-xl font-semibold" style={{ color: t.palette.ink }}>
              {t.name.en}
            </h2>
            <p className="mt-1 text-sm text-white/60">{t.blurb.en}</p>
            <p className="mt-3 text-xs uppercase tracking-widest text-white/40">
              {t.shots.length} shots · {totalDuration(t)}s · {t.photosRequired.min}–{t.photosRequired.max} photos · {t.region}
            </p>
            <span className="mt-4 inline-block text-sm text-[var(--color-accent)] group-hover:underline">
              Make this one →
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
