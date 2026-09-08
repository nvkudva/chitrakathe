"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { t as tr } from "@/lib/i18n/ui";
import type { Language, PhotoRole, Template } from "@/lib/templates/schema";
import { GoogleMark } from "./AccountChip";
import StoryboardPreview, { type PreviewFocus } from "./StoryboardPreview";

type Props = {
  initialLang?: Language;
  priceLabel: string;
  /**
   * The whole template, not a projection of it. The live preview needs the
   * palette, the typography and the storyboard itself, and a second narrower
   * shape here would drift from the one the renderer reads.
   */
  template: Template;
};

type Slot = { file: File | null; url: string | null; error: string | null };

/** Photos below this look soft once the compositor crops and pushes in on them. */
const MIN_LONG_EDGE = 1080;

export default function BriefForm({ template, initialLang = "en", priceLabel }: Props) {
  const router = useRouter();
  const [lang, setLang] = useState<Language>(initialLang);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [slots, setSlots] = useState<Slot[]>(() => template.photoSlots.map(() => ({ file: null, url: null, error: null })));
  const [contact, setContact] = useState({ phone: "", email: "" });
  const [showEmail, setShowEmail] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  /** Which field or photo the family last touched; the preview follows it. */
  const [focus, setFocus] = useState<PreviewFocus | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setSignedIn(Boolean(d.signedIn)))
      .catch(() => setSignedIn(false));
  }, []);

  /*
   * Revoke on unmount only.
   *
   * This used to depend on [slots], so the previous render's cleanup fired on
   * every pick and revoked the object URLs of every photo already chosen —
   * leaving one live thumbnail and seven broken images. Replacement is handled
   * where it happens, in pick().
   */
  const live = useRef<string[]>([]);
  live.current = slots.map((s) => s.url).filter((u): u is string => Boolean(u));
  useEffect(() => () => live.current.forEach(URL.revokeObjectURL), []);

  const filled = slots.filter((s) => s.file).length;
  const missingRequired = template.fields.filter((f) => f.required && !fields[f.key]?.trim());
  const ready = filled >= template.photoSlots.length && missingRequired.length === 0;

  async function pick(i: number, file: File | undefined) {
    if (!file) return;
    const problem = await inspect(file);
    if (!problem) setFocus({ kind: "photo", index: i });
    setSlots((prev) => {
      const next = [...prev];
      const old = next[i]!;
      if (old.url) URL.revokeObjectURL(old.url);
      next[i] = problem
        ? { file: null, url: null, error: problem }
        : { file, url: URL.createObjectURL(file), error: null };
      return next;
    });
  }

  /** Client-side gate, so a WhatsApp forward never costs a full render. */
  async function inspect(file: File): Promise<string | null> {
    if (!["image/jpeg", "image/png", "image/webp", "image/heic"].includes(file.type)) {
      return "That file type will not work — use a photo from your gallery.";
    }
    if (file.size > 12 * 1024 * 1024) return "That photo is larger than 12 MB.";
    if (file.type === "image/heic") return null; // cannot decode here; the server checks it
    try {
      const bmp = await createImageBitmap(file);
      const longEdge = Math.max(bmp.width, bmp.height);
      bmp.close?.();
      if (longEdge < MIN_LONG_EDGE) {
        return `This one is only ${longEdge}px and will look blurry. Pick it from your gallery, not from WhatsApp.`;
      }
    } catch {
      return null;
    }
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (filled < template.photoSlots.length) {
      setError(
        tr(lang, "form.needPhotos")
          .replace("{n}", String(template.photoSlots.length))
          .replace("{have}", String(filled))
      );
      return;
    }
    if (!signedIn && !contact.phone.trim() && !contact.email.trim()) {
      setError(tr(lang, "form.contactHeading"));
      return;
    }

    try {
      setBusy(tr(lang, "busy.creating"));
      const ev = await post("/api/events", {
        templateId: template.id,
        language: lang,
        fields,
        aspects: ["9:16", "1:1"],
        email: contact.email || undefined,
        phone: contact.phone || undefined,
      });

      // The event's access token. Holding the event id is not authorisation:
      // ids travel in URLs and the upload keys derived from them are
      // deterministic, so every later call presents this.
      const token: string = ev.eventToken;
      const files = slots.filter((s): s is Slot & { file: File } => Boolean(s.file)).map((s) => s.file);
      setBusy(tr(lang, "busy.links"));
      const { uploads } = await post(
        `/api/events/${ev.eventId}/uploads`,
        { files: files.map((f) => ({ contentType: f.type, bytes: f.size })) },
        token
      );

      for (const [i, u] of uploads.entries()) {
        setBusy(tr(lang, "busy.uploading").replace("{i}", String(i + 1)).replace("{n}", String(uploads.length)));
        const res = await fetch(u.url, { method: "PUT", headers: u.headers, body: files[i]! });
        if (!res.ok) throw new Error(`Upload ${i + 1} failed`);
      }

      setBusy(tr(lang, "busy.checking"));
      await post(
        `/api/events/${ev.eventId}/assets`,
        {
          assets: uploads.map((u: { position: number; key: string }, i: number) => ({
            position: u.position,
            key: u.key,
            contentType: files[i]!.type,
            bytes: files[i]!.size,
          })),
        },
        token
      );

      setBusy(tr(lang, "busy.starting"));
      const job = await post(`/api/events/${ev.eventId}/render`, {}, token);
      router.push(`/t/${job.jobId}`);
    } catch (err) {
      const e = err as Error & { needsAuth?: boolean; returnTo?: string };
      if (e.needsAuth) {
        window.location.href = `/api/auth/signin?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }
      setError(e.message);
      setBusy(null);
    }
  }

  const label = useMemo(
    () => (role: PhotoRole, i: number) => {
      const base = tr(lang, `photo.${role}`);
      if (role !== "montage") return base;
      const n = template.photoSlots.slice(0, i + 1).filter((r) => r === "montage").length;
      return `${base} (${n})`;
    },
    [lang, template.photoSlots]
  );

  return (
    /*
     * One grid, two placements. On a phone the preview is first in the DOM and
     * sticks under the header; at >=1024px it moves to the right column, which
     * is dead space today. Explicit row/column starts, so the DOM order that
     * mobile needs does not decide the desktop layout.
     */
    <form onSubmit={submit} className="lg:grid lg:grid-cols-[minmax(0,1fr)_292px] lg:gap-8">
      <StoryboardPreview
        className="mb-7 lg:col-start-2 lg:row-start-1 lg:mb-0"
        template={template}
        lang={lang}
        fields={fields}
        photos={slots.map((s) => s.url)}
        focus={focus}
      />

      <div className="space-y-8 lg:col-start-1 lg:row-start-1">
      {/* ---- video language ---- */}
      <section className="space-y-3">
        <h2 className="t-subhead ink-2">{tr(lang, "form.language")}</h2>
        <div className="panel panel-rel seg-track tier-0 inline-flex gap-1 p-1" style={{ ["--r" as string]: "999px" }}>
          {(Object.keys(template.name) as Language[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              lang={l}
              aria-pressed={lang === l}
              className={`focus-ring rounded-full px-4 t-subhead ${lang === l ? "ink-1" : "ink-3"}`}
              style={{
                minHeight: 44,
                letterSpacing: 0,
                ...(lang === l
                  ? {
                      background: "var(--color-paper)",
                      boxShadow: "0 1px 2px rgb(28 21 18 / .10), inset 0 0 0 1px var(--hairline)",
                    }
                  : {}),
              }}
            >
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
      </section>

      {/* ---- brief fields ---- */}
      <section className="panel panel-rel tier-2 space-y-5 p-5">
        {template.fields.map((f) => (
          <div key={f.key} className="space-y-2">
            <label htmlFor={f.key} className="block t-subhead ink-2">
              {tr(lang, f.labelKey)}
              {!f.required && <span className="ink-3"> · {tr(lang, "field.optional")}</span>}
            </label>
            <div className="panel panel-rel tier-0">
              {f.type === "textarea" ? (
                <textarea
                  id={f.key}
                  maxLength={f.maxLength}
                  required={f.required}
                  value={fields[f.key] ?? ""}
                  onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })}
                  onFocus={() => setFocus({ kind: "field", key: f.key })}
                  className="field"
                  style={{ minHeight: 84, resize: "vertical", maxHeight: "40vh", overflow: "hidden" }}
                  ref={(el) => {
                    if (el) {
                      el.style.height = "auto";
                      el.style.height = `${Math.max(84, el.scrollHeight)}px`;
                    }
                  }}
                />
              ) : (
                <input
                  id={f.key}
                  type={f.type === "date" ? "date" : "text"}
                  lang={lang}
                  maxLength={f.maxLength}
                  required={f.required}
                  value={fields[f.key] ?? ""}
                  onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })}
                  onFocus={() => setFocus({ kind: "field", key: f.key })}
                  className="field"
                />
              )}
            </div>
          </div>
        ))}
      </section>

      {/* ---- photo slots ---- */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="t-title-3 ink-1">{tr(lang, "form.slotsHeading")}</h2>
          <span className="t-caption ink-3">
            {filled}/{template.photoSlots.length}
          </span>
        </div>
        <p className="t-footnote ink-3">{tr(lang, "form.photosHint")}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          {template.photoSlots.map((role, i) => {
            const slot = slots[i]!;
            return (
              <div key={i} className="panel panel-rel tier-0 overflow-hidden p-3">
                <input
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  id={`photo-${i}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  className="sr-only"
                  onChange={(e) => pick(i, e.target.files?.[0])}
                />
                <label htmlFor={`photo-${i}`} className="flex cursor-pointer items-center gap-3">
                  <span
                    className="grid shrink-0 place-items-center overflow-hidden rounded-xl"
                    style={{ width: 64, height: 64, background: "rgb(255 255 255 / 0.06)" }}
                  >
                    {slot.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={slot.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="t-title-3 ink-3">{i + 1}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block t-callout ink-1">{label(role, i)}</span>
                    <span className="block t-footnote" style={{ color: slot.error ? "var(--color-danger)" : "var(--ink-3)" }}>
                      {slot.error ?? (slot.file ? tr(lang, "photo.replace") : tr(lang, "photo.add"))}
                    </span>
                  </span>
                </label>
              </div>
            );
          })}
        </div>

        {/* The strongest trust claim, where the parent is handing over the face. */}
        <p className="panel panel-rel tier-0 t-footnote ink-2 p-3">{tr(lang, "photo.noFaces")}</p>
      </section>

      {/* ---- delivery ---- */}
      {signedIn === false && (
        <section className="panel panel-rel tier-2 space-y-3 p-5">
          <h2 className="t-subhead ink-2">{tr(lang, "form.contactHeading")}</h2>
          <div className="panel panel-rel tier-0">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              aria-label={tr(lang, "form.phone")}
              placeholder={tr(lang, "form.phone")}
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              className="field"
            />
          </div>
          {showEmail ? (
            <div className="panel panel-rel tier-0">
              <input
                type="email"
                autoComplete="email"
                aria-label={tr(lang, "form.email")}
                placeholder={tr(lang, "form.email")}
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
                className="field"
              />
            </div>
          ) : (
            <button type="button" onClick={() => setShowEmail(true)} className="t-footnote ink-2 underline focus-ring rounded inline-flex items-center"
              style={{ minHeight: 44 }}>
              {tr(lang, "form.emailInstead")}
            </button>
          )}
        </section>
      )}

      {error && (
        <p role="alert" className="panel panel-rel tier-2 t-callout p-4" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}

      <div className="space-y-3">
        <button type="submit" disabled={Boolean(busy) || !ready} className="btn btn-primary press focus-ring w-full">
          {busy ?? tr(lang, "form.submit")}
        </button>
        {signedIn === false && (
          <p className="flex items-center justify-center gap-2 t-footnote ink-3">
            <GoogleMark size={14} />
            {tr(lang, "form.signInNote")}
          </p>
        )}
        <p className="text-center t-footnote ink-3">
          {tr(lang, "gallery.priceNote").replace("{price}", priceLabel)}
        </p>
      </div>
      </div>
    </form>
  );
}

const LANG_LABEL: Record<Language, string> = { kn: "ಕನ್ನಡ", kok: "कोंकणी", hi: "हिंदी", en: "English" };

async function post(url: string, body: unknown, eventToken?: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(eventToken ? { "x-event-token": eventToken } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      typeof json.error === "string" ? json.error : "Something went wrong. Please try again."
    ) as Error & { needsAuth?: boolean };
    err.needsAuth = Boolean(json.needsAuth) || res.status === 401;
    throw err;
  }
  return json;
}
