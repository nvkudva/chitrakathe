import { sql } from "../db";
import { config } from "../config";
import { gatewayFeePaise, marginPct, type Paise } from "../money";
import { PRICES_CHECKED_ON } from "./prices";

export type JobCostRow = {
  jobId: string;
  templateId: string;
  status: string;
  paid: boolean;
  costPaise: Paise;
  ceilingPaise: Paise;
  revenuePaise: Paise;
  marginPct: number | null;
  degraded: number;
  finishedAt: string | null;
};

export type CostSummary = {
  pricesCheckedOn: string;
  pricesStale: boolean;
  windowDays: number;
  jobs: number;
  paidJobs: number;
  conversionPct: number;
  /** Direct render cost across every job, converting or not. */
  renderCostPaise: Paise;
  revenuePaise: Paise;
  gatewayPaise: Paise;
  /** Margin on a job that converted. */
  perPaidMarginPct: number;
  /** Margin once free previews that never converted are carried. */
  blendedMarginPct: number;
  breaches: number;
  byKind: Record<string, Paise>;
};

/** The prices table is a claim about the outside world; stale is a defect. */
const STALE_AFTER_DAYS = 45;

export async function costSummary(windowDays = 30): Promise<CostSummary> {
  const db = sql();
  const since = new Date(Date.now() - windowDays * 86400_000);

  const [totals] = await db`
    select
      count(*)::int                                          as jobs,
      count(*) filter (where paid)::int                      as paid_jobs,
      coalesce(sum(cost_paise), 0)::int                      as render_cost
    from render_jobs
    where queued_at >= ${since} and status in ('succeeded','refused_over_ceiling','failed')`;

  const kinds = await db`
    select kind, sum(amount_paise)::int as total from cost_entries
    where created_at >= ${since} group by kind`;

  const [paid] = await db`
    select coalesce(sum(amount_paise), 0)::int as revenue from payments
    where status = 'paid' and paid_at >= ${since}`;

  const [breach] = await db`select count(*)::int as n from ceiling_breaches
    where created_at >= ${since} and action = 'refused'`;

  const jobs = Number(totals?.jobs ?? 0);
  const paidJobs = Number(totals?.paid_jobs ?? 0);
  const renderCost = Number(totals?.render_cost ?? 0);
  const revenue = Number(paid?.revenue ?? 0);
  const gateway = gatewayFeePaise(revenue);

  const conversion = jobs === 0 ? 0 : (paidJobs / jobs) * 100;
  const perPaidCost = paidJobs === 0 ? 0 : renderCost / Math.max(paidJobs, 1);

  const price = config().PRICE_LAUNCH_PAISE;
  const perPaid = paidJobs === 0 ? 0 : marginPct(price, perPaidCost + gatewayFeePaise(price));
  // Blended: every free preview's render cost is carried by the ones that pay.
  const blended = revenue === 0 ? 0 : marginPct(revenue, renderCost + gateway);

  const checked = new Date(PRICES_CHECKED_ON);
  const stale = Date.now() - checked.getTime() > STALE_AFTER_DAYS * 86400_000;

  return {
    pricesCheckedOn: PRICES_CHECKED_ON,
    pricesStale: stale,
    windowDays,
    jobs,
    paidJobs,
    conversionPct: conversion,
    renderCostPaise: renderCost,
    revenuePaise: revenue,
    gatewayPaise: gateway,
    perPaidMarginPct: perPaid,
    blendedMarginPct: blended,
    breaches: Number(breach?.n ?? 0),
    byKind: Object.fromEntries(kinds.map((k) => [k.kind as string, Number(k.total)])),
  };
}

export async function jobCosts(limit = 50): Promise<JobCostRow[]> {
  const rows = await sql()`
    select j.id, j.status, j.paid, j.cost_paise, j.ceiling_paise, j.finished_at,
           e.template_id, cardinality(j.degraded_shots) as degraded,
           coalesce((select sum(p.amount_paise) from payments p
                     where p.event_id = j.event_id and p.status = 'paid'), 0)::int as revenue
    from render_jobs j join events e on e.id = j.event_id
    order by j.queued_at desc limit ${limit}`;

  return rows.map((r) => {
    const revenue = Number(r.revenue);
    const cost = Number(r.cost_paise) + (revenue > 0 ? gatewayFeePaise(revenue) : 0);
    return {
      jobId: r.id as string,
      templateId: r.template_id as string,
      status: r.status as string,
      paid: Boolean(r.paid),
      costPaise: cost,
      ceilingPaise: Number(r.ceiling_paise),
      revenuePaise: revenue,
      marginPct: revenue > 0 ? marginPct(revenue, cost) : null,
      degraded: Number(r.degraded ?? 0),
      finishedAt: r.finished_at ? new Date(r.finished_at as string).toISOString() : null,
    };
  });
}
