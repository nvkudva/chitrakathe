"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { t as tr } from "@/lib/i18n/ui";
import type { Language } from "@/lib/templates/schema";

type Job = {
  id: string;
  eventId: string;
  status: "queued" | "running" | "succeeded" | "failed" | "refused_over_ceiling";
  stage: string | null;
  progress: number;
  error: string | null;
  degraded: string[];
  unlocked: boolean;
  signedIn: boolean;
  owned: boolean;
  outputs: { aspect: string; previewUrl: string; posterUrl: string | null }[];
};

export default function JobView({ jobId, lang, priceLabel }: { jobId: string; lang: Language; priceLabel: string }) {
  const [job, setJob] = useState<Job | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failures = useRef(0);

  /**
   * Poll with backoff, and never stop on a single bad response.
   *
   * The previous version returned early when `res.ok` was false, before
   * rescheduling — so one 502, or a phone waking from sleep mid-request, froze
   * the page at whatever percentage it happened to be showing, forever.
   */
  const poll = useCallback(async () => {
    if (!alive.current) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const j = (await res.json()) as Job;
      failures.current = 0;
      if (!alive.current) return;
      setJob(j);
      if (j.status === "queued" || j.status === "running") {
        timer.current = setTimeout(poll, 2500);
      }
    } catch {
      failures.current += 1;
      if (!alive.current) return;
      // 3s, 6s, 12s, 24s, capped — a render takes minutes, so patience is free.
      const delay = Math.min(3000 * 2 ** (failures.current - 1), 30000);
      timer.current = setTimeout(poll, delay);
    }
  }, [jobId]);

  useEffect(() => {
    alive.current = true;
    void poll();
    // Phones suspend timers in a background tab; re-poll the moment they return.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        if (timer.current) clearTimeout(timer.current);
        void poll();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  if (!job) {
    return <div className="glass tier-2 h-40 animate-pulse p-6" aria-busy="true" />;
  }

  if (job.status === "refused_over_ceiling" || job.status === "failed") {
    return (
      <div className="glass tier-3 space-y-3 p-6">
        <h1 className="t-title-2 ink-1">{tr(lang, "job.failed")}</h1>
        <p className="t-body ink-2">{tr(lang, "job.failedBody")}</p>
      </div>
    );
  }

  if (job.status !== "succeeded") {
    const pct = Math.max(4, job.progress);
    return (
      <div className="glass tier-2 space-y-4 p-6">
        <h1 className="t-title-2 ink-1">{tr(lang, "job.rendering")}</h1>
        <div className="glass tier-0 h-2 overflow-hidden" style={{ ["--r" as string]: "999px" }}>
          <div
            className="progress-fill h-full rounded-full"
            style={{
              background: "var(--color-accent)",
              transform: `scaleX(${pct / 100})`,
              width: "100%",
            }}
          />
        </div>
        <p className="t-callout ink-2" aria-live="polite">
          {tr(lang, `job.stage.${job.stage ?? "prepare"}`)}
        </p>
        <p className="t-footnote ink-4">{tr(lang, "job.wait")}</p>
      </div>
    );
  }

  const portrait = job.outputs.find((o) => o.aspect === "9:16") ?? job.outputs[0];

  async function pay() {
    setPaying(true);
    setError(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId: job!.eventId, jobId: job!.id, purpose: "unlock" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || data.needsAuth) {
        window.location.href = `/api/auth/signin?returnTo=${encodeURIComponent(location.pathname)}`;
        return;
      }
      if (data.alreadyPaid) return void window.location.reload();
      if (!res.ok) throw new Error(data.error ?? "Could not start the payment");

      const rz = (window as unknown as { Razorpay: new (o: unknown) => { open(): void } }).Razorpay;
      new rz({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "Chitrakathe",
        description: "Unwatermarked download",
        handler: () => window.location.reload(),
        theme: { color: "#D4A017" },
      }).open();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPaying(false);
    }
  }

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="space-y-6">
        <h1 className="t-title-1 ink-1">{tr(lang, "job.done")}</h1>

        {portrait && (
          <div className="glass tier-2 mx-auto w-full max-w-sm overflow-hidden p-2">
            <video
              src={portrait.previewUrl}
              poster={portrait.posterUrl ?? undefined}
              controls
              playsInline
              preload="metadata"
              className="w-full rounded-2xl"
            />
          </div>
        )}

        {!job.unlocked ? (
          <div className="glass tier-3 mx-auto w-full max-w-sm space-y-4 p-5">
            <p className="t-callout ink-2">{tr(lang, "preview.watermarked")}</p>
            <button onClick={pay} disabled={paying} className="btn btn-primary press focus-ring w-full">
              {paying ? "…" : tr(lang, "pay.cta").replace("{price}", priceLabel)}
            </button>
            <p className="text-center t-footnote ink-4">{tr(lang, "pay.upi")}</p>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
            {job.outputs.map((o) => (
              <a
                key={o.aspect}
                href={`/api/download/${job.id}?aspect=${encodeURIComponent(o.aspect)}`}
                className="glass tier-2 press focus-ring block px-5 py-4 text-center t-callout ink-1"
              >
                {tr(lang, o.aspect === "9:16" ? "download.portrait" : "download.square")}
              </a>
            ))}
          </div>
        )}

        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noreferrer"
          className="glass tier-2 press focus-ring mx-auto flex w-full max-w-sm items-center justify-center gap-2 px-5 py-4 t-callout ink-1"
        >
          {tr(lang, "share.whatsapp")}
        </a>

        {error && (
          <p role="alert" className="t-callout" style={{ color: "#ffb3a7" }}>
            {error}
          </p>
        )}
      </div>
    </>
  );
}
