"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

type Job = {
  id: string;
  eventId: string;
  status: "queued" | "running" | "succeeded" | "failed" | "refused_over_ceiling";
  stage: string | null;
  progress: number;
  error: string | null;
  degraded: string[];
  unlocked: boolean;
  outputs: { aspect: string; previewUrl: string; posterUrl: string | null }[];
};

const STAGE_COPY: Record<string, string> = {
  prepare: "Preparing your photos",
  voice: "Recording the voiceover",
  shots: "Shooting the scenes",
  assemble: "Cutting it together",
  derive: "Finishing",
};

export default function JobView({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const tick = async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) return;
      const j = (await res.json()) as Job;
      if (!live) return;
      setJob(j);
      if (j.status === "queued" || j.status === "running") setTimeout(tick, 2500);
    };
    void tick();
    return () => {
      live = false;
    };
  }, [jobId]);

  if (!job) return <p className="text-white/50">Loading…</p>;

  if (job.status === "refused_over_ceiling") {
    return (
      <Panel title="We stopped this render">
        <p className="text-white/70">
          It would have cost more than we allow ourselves to spend on one trailer, so we stopped instead of
          overrunning. You have not been charged. Write to us and we will render it by hand.
        </p>
      </Panel>
    );
  }

  if (job.status === "failed") {
    return (
      <Panel title="Something went wrong">
        <p className="text-white/70">{job.error ?? "The render failed."} You have not been charged.</p>
      </Panel>
    );
  }

  if (job.status !== "succeeded") {
    return (
      <Panel title="Making your trailer">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-[var(--color-accent)] transition-all duration-700"
            style={{ width: `${Math.max(4, job.progress)}%` }}
          />
        </div>
        <p className="mt-3 text-white/60">
          {STAGE_COPY[job.stage ?? ""] ?? "Queued"} · {job.progress}%
        </p>
        <p className="mt-1 text-xs text-white/40">Usually 4 to 8 minutes. This page updates itself.</p>
      </Panel>
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
      const data = await res.json();
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

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Ready</h1>

        {portrait && (
          <video
            src={portrait.previewUrl}
            poster={portrait.posterUrl ?? undefined}
            controls
            playsInline
            className="w-full max-w-sm rounded-xl border border-white/10"
          />
        )}

        {!job.unlocked ? (
          <div className="max-w-sm space-y-3 rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5 p-5">
            <p className="text-sm text-white/70">
              This preview is watermarked. Pay once to download it clean, in both sizes, as many times as you like.
            </p>
            <button
              onClick={pay}
              disabled={paying}
              className="w-full rounded-lg bg-[var(--color-accent)] px-6 py-3 font-medium text-black disabled:opacity-50"
            >
              {paying ? "Opening UPI…" : "Unlock and download"}
            </button>
            <p className="text-center text-xs text-white/40">UPI, cards, netbanking</p>
          </div>
        ) : (
          <div className="flex max-w-sm flex-col gap-2">
            {job.outputs.map((o) => (
              <a
                key={o.aspect}
                href={`/api/download/${job.id}?aspect=${encodeURIComponent(o.aspect)}`}
                className="rounded-lg border border-white/15 px-5 py-3 text-center hover:border-[var(--color-accent)]"
              >
                Download {o.aspect} {o.aspect === "9:16" ? "(WhatsApp Status)" : "(Instagram)"}
              </a>
            ))}
          </div>
        )}

        {job.degraded.length > 0 && (
          <p className="text-xs text-white/40">
            {job.degraded.length} shot{job.degraded.length > 1 ? "s" : ""} used your photos instead of a generated
            scene, so this render cost less than usual.
          </p>
        )}
        {error && <p className="text-sm text-red-300">{error}</p>}
      </div>
    </>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-xl space-y-3">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {children}
    </div>
  );
}
