/**
 * POST /api/cron/recompute-trust-v2
 *
 * Trust v2 nightly recompute (S10.7, mig 046, spec §03 + §09).
 *
 * Wired into the existing hourly cron-worker. Because the worker
 * fires every hour, this route is a cheap no-op until the most
 * recent users.last_score_computed_at is older than
 * TRUST_RECOMPUTE_STALE_HOURS — that turns the hourly trigger into
 * an effectively-once-a-day recompute with zero new infra.
 *
 * Override the staleness check with `?force=1` (or `force` in the
 * JSON body) for one-off invocations / testing.
 */

import { getSupabaseAdmin } from "@/lib/supabase";
import { recomputeAllTrustV2 } from "@/lib/trust/v2-compute";
import { TRUST_RECOMPUTE_STALE_HOURS } from "@/lib/trust/config";

export const runtime = "nodejs"; // Math.exp + Map heavy; not edge-critical

async function handle(req: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[cron:recompute-trust-v2] CRON_SECRET not configured");
    return Response.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 }
    );
  }
  if (req.headers.get("x-cron-secret") !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let force = false;
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("force") != null) force = true;
  } catch {
    // ignore
  }
  if (!force) {
    try {
      const body = (await req.clone().json().catch(() => null)) as
        | { force?: boolean }
        | null;
      if (body?.force === true) force = true;
    } catch {
      // ignore — body may not be JSON
    }
  }

  if (!force) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .select("last_score_computed_at")
      .order("last_score_computed_at", {
        ascending: false,
        nullsFirst: false,
      })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("[cron:recompute-trust-v2] freshness probe failed:", error);
    }
    const last = data?.last_score_computed_at
      ? new Date(data.last_score_computed_at as string)
      : null;
    if (last) {
      const hoursAgo = (Date.now() - last.getTime()) / (1000 * 60 * 60);
      if (hoursAgo < TRUST_RECOMPUTE_STALE_HOURS) {
        console.log(
          `[cron:recompute-trust-v2] skipped — last run ${hoursAgo.toFixed(1)}h ago (< ${TRUST_RECOMPUTE_STALE_HOURS}h)`
        );
        return Response.json({
          skipped: true,
          reason: "fresh",
          last_score_computed_at: last.toISOString(),
          hours_since: roundTo(hoursAgo, 2),
        });
      }
    }
  }

  try {
    const result = await recomputeAllTrustV2();
    console.log(
      `[cron:recompute-trust-v2] recomputed ${result.users} users in ${result.passes_run} pass(es), converged=${result.converged}, maxΔ=${result.final_max_delta}`
    );
    return Response.json({ ok: true, force, ...result });
  } catch (err) {
    console.error("[cron:recompute-trust-v2] recompute failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "recompute failed", message }, { status: 500 });
  }
}

function roundTo(n: number, digits: number): number {
  const m = 10 ** digits;
  return Math.round(n * m) / m;
}

export async function POST(req: Request) {
  return handle(req);
}
export async function GET(req: Request) {
  return handle(req);
}
