import Link from "next/link";
import type { Route } from "next";
import { currentSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";
import { getTemplate } from "@/lib/templates";
import { t, isLanguage } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

/**
 * The answer to "I closed the tab". A render costs us money whether or not the
 * family ever comes back, so every one of them needs a way back.
 */
export default async function MyTrailers({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang: raw } = await searchParams;
  const lang = isLanguage(raw) ? raw : "en";
  const session = await currentSession();
  if (!session) {
    return (
      <div lang={lang} className="glass glass-rel tier-2 space-y-4 p-6 rise">
        <h1 className="t-title-2 ink-1">{t(lang, "mine.title")}</h1>
        <p className="t-body ink-2">{t(lang, "mine.signedOut")}</p>
        <a href="/api/auth/signin?returnTo=/mine" className="btn btn-primary press focus-ring inline-flex">
          {t(lang, "mine.signIn")}
        </a>
      </div>
    );
  }

  const rows = await sql()`
    select j.id, j.status, j.queued_at, j.paid, e.template_id, e.language, e.fields
    from render_jobs j join events e on e.id = j.event_id
    where e.user_id = ${session.userId}
    order by j.queued_at desc limit 50`;

  return (
    <div lang={lang} className="space-y-5 rise">
      <h1 className="t-title-1 ink-1">{t(lang, "mine.title")}</h1>
      {rows.length === 0 && (
        <div className="glass glass-rel tier-2 space-y-3 p-6">
          <p className="t-body ink-2">{t(lang, "mine.empty")}</p>
          <Link href="/" className="btn btn-primary press focus-ring inline-flex">
            {t(lang, "mine.pick")}
          </Link>
        </div>
      )}
      <ul className="space-y-3">
        {rows.map((r) => {
          let title = r.template_id as string;
          try {
            title = getTemplate(r.template_id as string).name[r.language as "en"] ?? title;
          } catch {
            /* a retired template still deserves a row */
          }
          const named = Object.values((r.fields ?? {}) as Record<string, string>)[0];
          return (
            <li key={r.id as string}>
              <Link
                href={`/t/${r.id}?lang=${r.language}` as Route}
                className="glass glass-rel tier-2 card-press focus-ring flex items-center justify-between gap-4 p-4"
              >
                <span className="min-w-0">
                  <span className="block t-callout ink-1 truncate">{named || title}</span>
                  <span className="block t-caption ink-4">
                    {title} · {new Date(r.queued_at as string).toLocaleDateString("en-IN")}
                  </span>
                </span>
                <span className="t-caption ink-3 shrink-0">
                  {r.paid ? "Paid" : r.status === "succeeded" ? "Preview ready" : String(r.status)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
