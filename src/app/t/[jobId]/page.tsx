import type { Metadata } from "next";
import { config } from "@/lib/config";
import { rupees } from "@/lib/money";
import { isLanguage } from "@/lib/i18n/ui";
import { storage } from "@/lib/storage";
import { getTemplate } from "@/lib/templates";
import { sql } from "@/lib/db";
import { isUuid } from "@/lib/auth/eventAccess";
import JobView from "@/components/JobView";

/**
 * A forwarded link is the whole growth loop, so it has to render as a card in
 * WhatsApp rather than a bare UUID. A naked UUID looks like phishing and gets
 * ignored.
 */
export async function generateMetadata({ params }: { params: Promise<{ jobId: string }> }): Promise<Metadata> {
  const { jobId } = await params;
  if (!isUuid(jobId)) return { title: "Chitrakathe" };
  try {
    const [row] = await sql()`
      select e.template_id, e.language, e.fields, o.poster_key
      from render_jobs j
      join events e on e.id = j.event_id
      left join render_outputs o on o.job_id = j.id
      where j.id = ${jobId} limit 1`;
    if (!row) return { title: "Chitrakathe" };

    const lang = isLanguage(row.language as string) ? (row.language as "en") : "en";
    let occasion = "a family function";
    try {
      occasion = getTemplate(row.template_id as string).name[lang];
    } catch {
      /* a retired template still gets a card */
    }
    const name = Object.values((row.fields ?? {}) as Record<string, string>)[0]?.trim();
    const title = name ? `${name} — ${occasion}` : occasion;
    const images = row.poster_key
      ? [await storage().signedDownload(row.poster_key as string, 60 * 60 * 24 * 7)]
      : [];

    return {
      title,
      description: "A trailer made with Chitrakathe.",
      openGraph: { title, description: "A trailer made with Chitrakathe.", images, type: "video.other" },
      twitter: { card: "summary_large_image", title, images },
    };
  } catch {
    return { title: "Chitrakathe" };
  }
}

export default async function JobPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { jobId } = await params;
  const { lang: raw } = await searchParams;
  const lang = isLanguage(raw) ? raw : "en";

  return (
    <div lang={lang} className="rise">
      <JobView jobId={jobId} lang={lang} priceLabel={rupees(config().PRICE_LAUNCH_PAISE)} />
    </div>
  );
}
