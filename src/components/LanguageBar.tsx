"use client";

import Link from "next/link";
import type { Route } from "next";
import { useLayoutEffect, useRef, useState } from "react";
import { LANGUAGE_NAMES } from "@/lib/i18n/ui";
import { LANGUAGES, type Language } from "@/lib/templates/schema";

/**
 * Segmented control. The thumb animates its width as well as its position,
 * because ಕನ್ನಡ / कोंकणी / हिंदी / English are all different widths — a
 * fixed-width thumb either clips the Kannada or floats inside the English.
 *
 * The language lives in the URL rather than a cookie: a family shares the link
 * on WhatsApp and the recipient should see what the sender saw.
 */
export default function LanguageBar({ current, basePath }: { current: Language; basePath: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const el = track.current?.querySelector<HTMLElement>(`[data-lang="${current}"]`);
    if (!el || !track.current) return;
    const measure = () =>
      setThumb({ x: el.offsetLeft, w: el.offsetWidth });
    measure();
    // Indic web fonts land after first paint and change the label widths.
    const ro = new ResizeObserver(measure);
    ro.observe(track.current);
    return () => ro.disconnect();
  }, [current]);

  return (
    <div
      ref={track}
      className="glass tier-0 relative inline-flex gap-1 p-1"
      style={{ ["--r" as string]: "999px" }}
      role="group"
      aria-label="Language"
    >
      {thumb && (
        <span
          aria-hidden="true"
          className="seg-thumb glass tier-2 absolute inset-y-1 z-0"
          style={{
            ["--r" as string]: "999px",
            transform: `translateX(${thumb.x - 4}px)`,
            width: thumb.w,
          }}
        />
      )}
      {LANGUAGES.map((l) => (
        <Link
          key={l}
          href={`${basePath}?lang=${l}` as Route}
          data-lang={l}
          lang={l === "kok" ? "kok" : l}
          aria-current={current === l ? "true" : undefined}
          className={`focus-ring relative z-10 inline-flex items-center rounded-full px-4 t-subhead transition-colors ${
            current === l ? "ink-1" : "ink-3"
          }`}
          style={{ minHeight: 44, letterSpacing: 0 }}
        >
          {LANGUAGE_NAMES[l]}
        </Link>
      ))}
    </div>
  );
}
