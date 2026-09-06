"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGE_NAMES, t as tr } from "@/lib/i18n/ui";
import type { Language } from "@/lib/templates/schema";

type Props = {
  initialLang?: Language;
  template: {
    id: string;
    fields: { key: string; labelKey: string; type: string; required: boolean; maxLength: number }[];
    photosRequired: { min: number; max: number };
    languages: string[];
  };
};

export default function BriefForm({ template, initialLang = "en" }: Props) {
  const router = useRouter();
  const [lang, setLang] = useState<Language>(initialLang);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [contact, setContact] = useState({ email: "", phone: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { min, max } = template.photosRequired;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (files.length < min || files.length > max) {
      setError(`Please add between ${min} and ${max} photos. You have ${files.length}.`);
      return;
    }

    try {
      setBusy("Creating your event");
      const ev = await post("/api/events", {
        templateId: template.id,
        language: lang,
        fields,
        aspects: ["9:16", "1:1"],
        email: contact.email || undefined,
        phone: contact.phone || undefined,
      });

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

      setBusy("Queueing your render");
      const job = await post(`/api/events/${ev.eventId}/render`, {});
      router.push(`/t/${job.jobId}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-7 max-w-xl">
      <div>
        <label className="block text-sm text-white/60 mb-2">{tr(lang, "form.language")}</label>
        <div className="flex flex-wrap gap-2">
          {(template.languages as Language[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                lang === l ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-white/15 text-white/60"
              }`}
            >
              {LANGUAGE_NAMES[l]}
            </button>
          ))}
        </div>
      </div>

      {template.fields.map((f) => (
        <div key={f.key}>
          <label className="block text-sm text-white/60 mb-1.5">
            {tr(lang, f.labelKey)}
            {!f.required && <span className="text-white/30"> (optional)</span>}
          </label>
          {f.type === "textarea" ? (
            <textarea
              rows={2}
              maxLength={f.maxLength}
              required={f.required}
              value={fields[f.key] ?? ""}
              onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 outline-none focus:border-[var(--color-accent)]"
            />
          ) : (
            <input
              type={f.type === "date" ? "date" : "text"}
              maxLength={f.maxLength}
              required={f.required}
              value={fields[f.key] ?? ""}
              onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 outline-none focus:border-[var(--color-accent)]"
            />
          )}
        </div>
      ))}

      <div>
        <label className="block text-sm text-white/60 mb-1.5">{tr(lang, "form.photos")}</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          onChange={(e) => setFiles([...(e.target.files ?? [])].slice(0, max))}
          className="w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white"
        />
        <p className="mt-1.5 text-xs text-white/40">{tr(lang, "form.photosHint")}</p>
        {files.length > 0 && (
          <p className="mt-1 text-xs text-[var(--color-accent)]">
            {files.length} selected (need {min}–{max})
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="email"
          placeholder={tr(lang, "form.email")}
          value={contact.email}
          onChange={(e) => setContact({ ...contact, email: e.target.value })}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 outline-none focus:border-[var(--color-accent)]"
        />
        <input
          type="tel"
          placeholder={tr(lang, "form.phone")}
          value={contact.phone}
          onChange={(e) => setContact({ ...contact, phone: e.target.value })}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

      <button
        type="submit"
        disabled={Boolean(busy)}
        className="rounded-lg bg-[var(--color-accent)] px-6 py-3 font-medium text-black disabled:opacity-50"
      >
        {busy ?? tr(lang, "form.submit")}
      </button>

      <p className="text-xs text-white/40">{tr(lang, "form.retention")}</p>
    </form>
  );
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : JSON.stringify(json.error));
  return json;
}
