import { notFound } from "next/navigation";
import { getTemplate, totalDuration } from "@/lib/templates";
import { isLanguage, t } from "@/lib/i18n/ui";
import { templateStyle } from "@/lib/theme";
import { config } from "@/lib/config";
import { rupees } from "@/lib/money";
import BriefForm from "@/components/BriefForm";

export default async function CreatePage({
  params,
  searchParams,
}: {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { templateId } = await params;
  const { lang: raw } = await searchParams;
  const lang = isLanguage(raw) ? raw : "en";

  let template;
  try {
    template = getTemplate(templateId);
  } catch {
    notFound();
  }

  return (
    <div lang={lang} className="rise space-y-7" style={templateStyle(template)}>
      <header className="space-y-2">
        <h1 className="t-title-1 ink-1">{template.name[lang]}</h1>
        <p className="t-body ink-2 max-w-[44ch]">{template.blurb[lang]}</p>
        <p className="t-callout ink-3">
          {totalDuration(template)}s ·{" "}
          {t(lang, "form.photoCount").replace("{n}", String(template.photoSlots.length))}
        </p>
      </header>

      {/*
        The whole template crosses to the client: the live storyboard preview
        renders the real reveal card, so it needs the palette, the typography
        and the shots. It is authored JSON and already fully serialisable.
      */}
      <BriefForm initialLang={lang} priceLabel={rupees(config().PRICE_LAUNCH_PAISE)} template={template} />
    </div>
  );
}
