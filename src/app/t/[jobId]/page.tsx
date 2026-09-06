import { config } from "@/lib/config";
import { rupees } from "@/lib/money";
import { isLanguage } from "@/lib/i18n/ui";
import JobView from "@/components/JobView";

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
