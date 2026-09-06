import { Template, type Language, type Script, type Brief, totalDuration, generativeShots } from "./schema";
import namakarana from "./namakarana-udupi.json" with { type: "json" };
import saveTheDate from "./save-the-date-coastal.json" with { type: "json" };
import firstBirthday from "./first-birthday-storybook.json" with { type: "json" };
import grihaPravesha from "./griha-pravesha-classic.json" with { type: "json" };

const RAW = [namakarana, saveTheDate, firstBirthday, grihaPravesha];

/**
 * Templates are authored as JSON and validated at load. A malformed or
 * over-budget template fails the process at boot rather than at render time,
 * when a family is waiting.
 */
function loadAll(): Map<string, Template> {
  const out = new Map<string, Template>();
  for (const raw of RAW) {
    const parsed = Template.safeParse(raw);
    if (!parsed.success) {
      const id = (raw as { id?: string }).id ?? "<unknown>";
      throw new Error(`Invalid template ${id}:\n${JSON.stringify(parsed.error.issues, null, 2)}`);
    }
    out.set(parsed.data.id, parsed.data);
  }
  return out;
}

let registry: Map<string, Template> | null = null;

export function templates(): Map<string, Template> {
  if (!registry) registry = loadAll();
  return registry;
}

export function listTemplates(): Template[] {
  return [...templates().values()];
}

export function getTemplate(id: string, version?: number): Template {
  const t = templates().get(id);
  if (!t) throw new Error(`Unknown template: ${id}`);
  if (version !== undefined && version !== t.version) {
    throw new Error(
      `Template ${id} is at version ${t.version}; job asked for ${version}. ` +
        `Old versions are not re-renderable in v1 — re-render against the current version.`
    );
  }
  return t;
}

/** Script to render a language in, honouring the template's regional default. */
export function scriptFor(t: Template, lang: Language, override?: Script): Script {
  return override ?? t.defaultScript[lang] ?? "latin";
}

/**
 * Photo references in a storyboard are indices. A family may upload fewer
 * photos than the highest index the template names, so indices wrap. This is
 * deliberate: a 6-photo brief reuses photos rather than rendering black.
 */
export function photoAt(brief: Brief, index: number): string {
  const key = brief.photos[index % brief.photos.length];
  if (!key) throw new Error(`Brief has no photos`);
  return key;
}

export { Template, totalDuration, generativeShots };
export type { Language, Script, Brief };
