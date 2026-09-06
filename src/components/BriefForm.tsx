"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { t as tr } from "@/lib/i18n/ui";
import type { Language, PhotoRole } from "@/lib/templates/schema";
import { GoogleMark } from "./AccountChip";

type Props = {
  initialLang?: Language;
  priceLabel: string;
  template: {
    id: string;
    fields: { key: string; labelKey: string; type: string; required: boolean; maxLength: number }[];
    photosRequired: { min: number; max: number };
    photoSlots: PhotoRole[];
    languages: string[];
  };
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
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setSignedIn(Boolean(d.signedIn)))
      .catch(() => setSignedIn(false));
  }, []);

  // Object URLs are revoked on replace and unmount; 8 leaked blobs of a 4 MB
  // photo each is 32 MB held on a phone.
  useEffect(() => () => slots.forEach((s) => s.url && URL.revokeObjectURL(s.url)), [slots]);

  const filled = slots.filter((s) => s.file).length;
  const ready = filled >= template.photosRequired.min && Object.entries(fields).length > 0;

  async function pick(i: number, file: File | undefined) {
    if (!file) return;
    const problem = await inspect(file);
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

    if (filled < template.photosRequired.min) {
      setError(`Please add all ${template.photosRequired.min} photos. You have ${filled}.`);
      return;
    }
    if (!signedIn && !contact.phone.trim() && !contact.email.trim()) {
      setError(tr(lang, "form.contactHeading"));
      return;
    }

    try {
      setBusy("Creating your event");
      const ev = await post("/api/events", {
        templateId: template.id,
        language: lang,
        fields,
        aspects: ["9:16"],
        email: contact.email || undefined,
        phone: contact.phone || undefined,
      });

      const files = slots.filter((s): s is Slot & { file: File } => Boolean(s.file)).map((s) => s.file);
      setBusy("Getting upload links");
      const { uploads } = await post(`/api/events/${ev.eventId}/uploads`, {
        files: files.map((f) => ({ contentType: f.type, bytes: f.size })),
      });

      for (const [i, u] of uploads.entries()) {
        setBusy(`Uploading photo ${i + 1} of ${uploads.length}`);
        const res = await fetch(u.url, { method: "PUT", headers: u.headers, body: files[i]! });
        if (!res.ok) throw new Error(`Upload ${i + 1} failed`);
      }

      setBusy("Checking your photos");
      await post(`/api/events/${ev.eventId}/assets`, {
        assets: uploads.map((u: { position: number; key: string }, i: number) => ({
          position: u.position,
          key: u.key,
          contentType: files[i]!.type,
          bytes: files[i]!.size,
        })),
      });

      setBusy("Starting your trailer");
      const job = await post(`/api/events/${ev.eventId}/render`, {});
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
    <form onSubmit={submit} className="space-y-8">
      {/* ---- video language ---- */}
      <section className="space-y-3">
        <h2 className="t-subhead ink-2">{tr(lang, "form.language")}</h2>
        <div className="glass tier-0 inline-flex flex-wrap gap-1 p-1" style={{ ["--r" as string]: "999px" }}>
          {(template.languages as Language[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              lang={l}
              aria-pressed={lang === l}
              className={`focus-ring rounded-full px-4 t-subhead ${lang === l ? "glass tier-2 ink-1" : "ink-3"}`}
              style={{ minHeight: 44, letterSpacing: 0, ["--r" as string]: "999px" }}
            >
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
      </section>

      {/* ---- brief fields ---- */}
      <section className="glass tier-2 space-y-5 p-5">
        {template.fields.map((f) => (
          <div key={f.key} className="space-y-2">
            <label htmlFor={f.key} className="block t-subhead ink-2">
              {tr(lang, f.labelKey)}
              {!f.required && <span className="ink-4"> · optional</span>}
            </label>
            <div className="glass tier-0">
              {f.type === "textarea" ? (
                <textarea
                  id={f.key}
                  rows={2}
                  maxLength={f.maxLength}
                  required={f.required}
                  value={fields[f.key] ?? ""}
                  onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })}
                  className="field resize-none"
                />
              ) : (
                <input
                  id={f.key}
                  type={f.type === "date" ? "date" : "text"}
                  maxLength={f.maxLength}
                  required={f.required}
                  value={fields[f.key] ?? ""}
                  onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })}
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
              <div key={i} className="glass tier-0 overflow-hidden p-3">
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
                      <span className="t-title-3 ink-4">{i + 1}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block t-callout ink-1">{label(role, i)}</span>
                    <span className="block t-footnote" style={{ color: slot.error ? "#ffb3a7" : "var(--ink-4)" }}>
                      {slot.error ?? (slot.file ? tr(lang, "photo.replace") : tr(lang, "photo.add"))}
                    </span>
                  </span>
                </label>
              </div>
            );
          })}
        </div>

        {/* The strongest trust claim, where the parent is handing over the face. */}
        <p className="glass tier-0 t-footnote ink-2 p-3">{tr(lang, "photo.noFaces")}</p>
      </section>

      {/* ---- delivery ---- */}
      {signedIn === false && (
        <section className="glass tier-2 space-y-3 p-5">
          <h2 className="t-subhead ink-2">{tr(lang, "form.contactHeading")}</h2>
          <div className="glass tier-0">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={tr(lang, "form.phone")}
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              className="field"
            />
          </div>
          {showEmail ? (
            <div className="glass tier-0">
              <input
                type="email"
                autoComplete="email"
                placeholder={tr(lang, "form.email")}
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
                className="field"
              />
            </div>
          ) : (
            <button type="button" onClick={() => setShowEmail(true)} className="t-footnote ink-3 underline focus-ring rounded">
              or send it by email instead
            </button>
          )}
        </section>
      )}

      {error && (
        <p role="alert" className="glass tier-2 t-callout p-4" style={{ color: "#ffb3a7" }}>
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
            You&apos;ll sign in with Google before we start — it keeps your trailer if this page closes.
          </p>
        )}
        <p className="text-center t-footnote ink-4">
          {tr(lang, "gallery.priceNote").replace("{price}", priceLabel)}
        </p>
        <p className="text-center t-footnote ink-4">{tr(lang, "form.retention")}</p>
      </div>
    </form>
  );
}

const LANG_LABEL: Record<Language, string> = { kn: "ಕನ್ನಡ", kok: "कोंकणी", hi: "हिंदी", en: "English" };

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
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
