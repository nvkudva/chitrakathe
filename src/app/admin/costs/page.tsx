import { costSummary, jobCosts } from "@/lib/cost/report";
import { rupees } from "@/lib/money";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Milestone 6. Per-job cost, per-job margin, and — the number that actually
 * decides whether this business works — blended margin including free
 * previews that never converted.
 */
export default async function CostDashboard({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const expected = config().ADMIN_TOKEN;
  if (!expected || token !== expected) {
    return <p className="text-white/60">Not available.</p>;
  }

  const [s, jobs] = await Promise.all([costSummary(30), jobCosts(50)]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Cost and margin — last {s.windowDays} days</h1>

      {s.pricesStale && (
        <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Price table last checked {s.pricesCheckedOn}. Re-verify provider pricing and update
          <code className="mx-1">src/lib/cost/prices.ts</code>.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Renders" value={String(s.jobs)} sub={`${s.paidJobs} paid`} />
        <Stat label="Preview → paid" value={`${s.conversionPct.toFixed(1)}%`} sub="the number that decides everything" />
        <Stat label="Ceiling refusals" value={String(s.breaches)} sub="jobs stopped rather than overrun" />
        <Stat label="Revenue" value={rupees(s.revenuePaise)} sub={`gateway ${rupees(s.gatewayPaise)}`} />
        <Stat label="Margin per paid render" value={`${s.perPaidMarginPct.toFixed(1)}%`} sub="ignores free previews" />
        <Stat
          label="Blended margin"
          value={`${s.blendedMarginPct.toFixed(1)}%`}
          sub="carries every free preview that never converted"
          highlight
        />
      </div>

      <section>
        <h2 className="mb-3 text-sm uppercase tracking-widest text-white/40">Spend by kind</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {Object.entries(s.byKind).map(([k, v]) => (
            <span key={k} className="rounded-lg border border-white/10 px-3 py-1.5">
              {k} <strong className="ml-1">{rupees(v)}</strong>
            </span>
          ))}
        </div>
      </section>

      <section className="overflow-x-auto">
        <h2 className="mb-3 text-sm uppercase tracking-widest text-white/40">Recent jobs</h2>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-white/40">
            <tr>
              <th className="py-2">Job</th>
              <th>Template</th>
              <th>Status</th>
              <th className="text-right">Cost</th>
              <th className="text-right">Ceiling</th>
              <th className="text-right">Revenue</th>
              <th className="text-right">Margin</th>
              <th className="text-right">Degraded</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.jobId} className="border-t border-white/5">
                <td className="py-2 font-mono text-xs text-white/50">{j.jobId.slice(0, 8)}</td>
                <td className="text-white/70">{j.templateId}</td>
                <td className={j.status === "refused_over_ceiling" ? "text-amber-300" : "text-white/70"}>{j.status}</td>
                <td className="text-right">{rupees(j.costPaise)}</td>
                <td className="text-right text-white/40">{rupees(j.ceilingPaise)}</td>
                <td className="text-right">{j.revenuePaise ? rupees(j.revenuePaise) : "—"}</td>
                <td className="text-right">{j.marginPct === null ? "—" : `${j.marginPct.toFixed(1)}%`}</td>
                <td className="text-right text-white/40">{j.degraded || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/5" : "border-white/10"}`}>
      <p className="text-xs uppercase tracking-widest text-white/40">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-xs text-white/40">{sub}</p>}
    </div>
  );
}
