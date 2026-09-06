import { notFound } from "next/navigation";
import { getTemplate, totalDuration } from "@/lib/templates";
import { isLanguage, t } from "@/lib/i18n/ui";
import { sceneStyle } from "@/lib/theme";
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
    <div lang={lang} className="rise space-y-7">
      {/* The template's own palette drives the scene from here on, so the page
          feels like the film it is about to make. */}
      <style>{`.scene{${Object.entries(sceneStyle(template))
        .map(([k, v]) => `${k}:${v}`)
        .join(";")}}`}</style>

      <header className="space-y-2">
        <h1 className="t-title-1 ink-1">{template.name[lang]}</h1>
        <p className="t-body ink-2 max-w-[44ch]">{template.blurb[lang]}</p>
        <p className="t-caption ink-4">
          {totalDuration(template)}s ·{" "}
          {t(lang, "form.photoCount").replace("{n}", String(template.photoSlots.length))}
        </p>
      </header>

      <BriefForm
        initialLang={lang}
        priceLabel={rupees(config().PRICE_LAUNCH_PAISE)}
        template={{
          id: template.id,
          fields: template.fields,
          photosRequired: template.photosRequired,
          photoSlots: template.photoSlots,
          languages: Object.keys(template.name),
        }}
      />
    </div>
  );
}
