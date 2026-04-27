/**
 * One-off Trust v2 recompute (S10.7, mig 046).
 *
 * Runs `recomputeAllTrustV2()` directly against the configured
 * Supabase project. Use it for the post-mig backfill, after
 * tuning TRUST_VOUCH_K, or any time you want fresh values without
 * waiting for the hourly cron-worker.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/recompute-trust-v2-now.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

import { recomputeAllTrustV2 } from "../src/lib/trust/v2-compute";
import { TRUST_VOUCH_K } from "../src/lib/trust/config";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required."
  );
  process.exit(1);
}

async function main() {
  console.log(`▶ Trust v2 recompute · K=${TRUST_VOUCH_K}`);
  const t0 = Date.now();
  const result = await recomputeAllTrustV2();
  const ms = Date.now() - t0;
  console.log(
    `✓ ${result.users} users · ${result.passes_run} pass(es) · converged=${result.converged} · maxΔ=${result.final_max_delta} · ${ms}ms`
  );
  console.log(`  computed_at = ${result.computed_at}`);
}

main().catch((err) => {
  console.error("✗ recompute failed:", err);
  process.exit(1);
});
