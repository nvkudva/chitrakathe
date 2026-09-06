import { notFound } from "next/navigation";
import { getTemplate, totalDuration } from "@/lib/templates";
import { isLanguage } from "@/lib/i18n/ui";
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
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{template.name[lang]}</h1>
        <p className="text-white/60">{template.blurb[lang]}</p>
        <p className="text-xs uppercase tracking-widest text-white/40">
          {template.shots.length} · {totalDuration(template)}s · {template.photosRequired.min}–
          {template.photosRequired.max}
        </p>
      </header>
      <BriefForm
        initialLang={lang}
        template={{
          id: template.id,
          fields: template.fields,
          photosRequired: template.photosRequired,
          languages: Object.keys(template.name),
        }}
      />
    </div>
  );
}
