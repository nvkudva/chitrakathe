"use client";

import { useSearchParams } from "next/navigation";
import { t, isLanguage } from "@/lib/i18n/ui";

/**
 * The root layout does not receive searchParams, so the footer could never see
 * the chosen language and sat in English under an otherwise Kannada page.
 * Reading it here keeps the chrome in step with the content.
 */
export default function SiteFooter() {
  const raw = useSearchParams().get("lang") ?? undefined;
  const lang = isLanguage(raw) ? raw : "en";

  const links: [string, string][] = [
    ["/privacy", "nav.privacy"],
    ["/terms", "nav.terms"],
    ["/refunds", "nav.refunds"],
    ["/contact", "nav.contact"],
  ];

  return (
    <footer
      lang={lang}
      className="mx-auto w-full max-w-5xl px-5 py-10 t-footnote ink-3"
      style={{ paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom))" }}
    >
      <p className="mb-3">{t(lang, "footer.retention")}</p>
      <nav className="flex flex-wrap gap-x-5 gap-y-1">
        {links.map(([href, key]) => (
          <a
            key={href}
            href={`${href}?lang=${lang}`}
            className="underline focus-ring rounded inline-flex items-center"
            style={{ minHeight: 44, minWidth: 44, justifyContent: "center" }}
          >
            {t(lang, key)}
          </a>
        ))}
      </nav>
    </footer>
  );
}
