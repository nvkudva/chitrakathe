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
    return <p className="t-body ink-3">Not available.</p>;
  }

  const [s, jobs] = await Promise.all([costSummary(30), jobCosts(50)]);

  return (
    <div className="space-y-8">
      <h1 className="t-title-1 ink-1">Cost and margin — last {s.windowDays} days</h1>

      {s.pricesStale && (
        <p className="glass tier-2 px-4 py-3 t-callout" style={{ color: "#ffd98a" }}>
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
        <h2 className="mb-3 t-overline ink-3">Spend by kind</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {Object.entries(s.byKind).map(([k, v]) => (
            <span key={k} className="glass tier-0 px-3 py-1.5 t-subhead ink-2">
              {k} <strong className="ml-1">{rupees(v)}</strong>
            </span>
          ))}
        </div>
      </section>

      <section className="overflow-x-auto">
        <h2 className="mb-3 t-overline ink-3">Recent jobs</h2>
        <table className="w-full min-w-[720px] t-subhead">
          <thead className="text-left t-overline ink-3">
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
              <tr key={j.jobId} className="border-t border-white/[0.06]">
                <td className="py-2 font-mono t-caption ink-3">{j.jobId.slice(0, 8)}</td>
                <td className="ink-2">{j.templateId}</td>
                <td className={j.status === "refused_over_ceiling" ? "text-[#ffd98a]" : "text-white/70"}>{j.status}</td>
                <td className="text-right">{rupees(j.costPaise)}</td>
                <td className="text-right ink-4">{rupees(j.ceilingPaise)}</td>
                <td className="text-right">{j.revenuePaise ? rupees(j.revenuePaise) : "—"}</td>
                <td className="text-right">{j.marginPct === null ? "—" : `${j.marginPct.toFixed(1)}%`}</td>
                <td className="text-right ink-4">{j.degraded || "—"}</td>
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
    <div className="glass tier-2 p-4" style={highlight ? { boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--color-accent) 45%, transparent)" } : undefined}>
      <p className="t-overline ink-3">{label}</p>
      <p className="mt-1 t-title-2 ink-1">{value}</p>
      {sub && <p className="mt-1 t-caption ink-4">{sub}</p>}
    </div>
  );
}
