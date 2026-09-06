import Link from "next/link";
import type { Route } from "next";
import { LANGUAGE_NAMES } from "@/lib/i18n/ui";
import { LANGUAGES, type Language } from "@/lib/templates/schema";

/**
 * The site's own language, carried in the URL rather than a cookie: a family
 * shares the link on WhatsApp and whoever opens it should see the same
 * language the sender did.
 */
export default function LanguageBar({ current, basePath }: { current: Language; basePath: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {LANGUAGES.map((l) => (
        <Link
          key={l}
          href={`${basePath}?lang=${l}` as Route}
          className={`rounded-full border px-4 py-1.5 text-sm transition ${
            current === l
              ? "border-[var(--color-accent)] text-[var(--color-accent)]"
              : "border-white/15 text-white/60 hover:border-white/35"
          }`}
        >
          {LANGUAGE_NAMES[l]}
        </Link>
      ))}
    </div>
  );
}
