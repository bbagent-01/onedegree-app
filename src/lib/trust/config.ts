/**
 * Trust v2 tunable constants (S10.7, mig 046).
 *
 * Kept in a small dedicated module so retuning K only requires a
 * code edit + a recompute pass — no schema change.
 */

/**
 * Vouch-score normalization constant — the K in
 *   vouch_score = 10 × (1 − e^(−vouch_signal / K))
 * Higher K → more signal needed to approach 10. Spec §03 sets K=30
 * for alpha. Tunable via TRUST_VOUCH_K env var (string → number).
 */
export const TRUST_VOUCH_K: number = (() => {
  const raw = process.env.TRUST_VOUCH_K;
  if (!raw) return 30;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
})();

/**
 * Max passes the fixed-point recompute will run. The signal-update
 * step uses log(2 + signal) which is sublinear, so the iteration
 * always contracts — but for densely connected graphs the contraction
 * is slow (per-pass deltas around 1.0 for the first few passes when
 * starting from signal=0). 12 passes gets the alpha graph to
 * Δ < 0.01 with plenty of headroom; bumping the cap is essentially
 * free at alpha scale.
 */
export const TRUST_RECOMPUTE_MAX_PASSES = 12;

/**
 * Convergence threshold. If no user's vouch_signal or vouch_power
 * moved by more than this in a pass, we stop.
 */
export const TRUST_RECOMPUTE_DELTA_EPSILON = 0.01;

/**
 * Vouch-power bounds. Kept compatible with the legacy column type
 * DECIMAL(3,2) and the legacy trg_vouch_power formula (mig 014b)
 * so the cron's writes and the trigger's writes always agree.
 *
 * Spec §03 leaves the range to implementation ("0.0–2.0 or whatever
 * range the cron produces"); we picked [0.5, 1.5] to match the
 * existing column.
 */
export const TRUST_VOUCH_POWER_MIN = 0.5;
export const TRUST_VOUCH_POWER_MAX = 1.5;
export const TRUST_VOUCH_POWER_DEFAULT = 1.0;

/**
 * Stale window for the cron. The /api/cron/recompute-trust-v2 route
 * is a no-op if the most recent last_score_computed_at is younger
 * than this. Lets the existing hourly cron-worker fan-out call this
 * route every hour while only doing real work once a day.
 */
export const TRUST_RECOMPUTE_STALE_HOURS = 20;
