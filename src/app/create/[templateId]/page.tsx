import { notFound } from "next/navigation";
import { getTemplate, totalDuration } from "@/lib/templates";
import BriefForm from "@/components/BriefForm";

export default async function CreatePage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  let template;
  try {
    template = getTemplate(templateId);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{template.name.en}</h1>
        <p className="text-white/60">{template.blurb.en}</p>
        <p className="text-xs uppercase tracking-widest text-white/40">
          {template.shots.length} shots · {totalDuration(template)}s · {template.photosRequired.min}–
          {template.photosRequired.max} photos
        </p>
      </header>
      <BriefForm
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
