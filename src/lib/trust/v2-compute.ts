/**
 * Trust v2 compute layer (S10.7, mig 046, spec §03 + §08).
 * Server-side only.
 *
 * Phase 1 ships compute + storage only. The display layer still
 * reads compute1DegreeScore (legacy connection_score) — switching
 * TrustTag etc. to read users.vouch_score is deferred to Alpha 1
 * Cluster 4.5. See PROJECT_PLAN + TRACK_B_SCHEMA_CHANGES §S10.7.
 *
 * Formulas (spec §03):
 *
 *   weight(j → i) = vouch_power(j) × log(1 + vouch_signal(j) + 1)
 *                 = vouch_power(j) × log(2 + vouch_signal(j))
 *   vouch_signal(i) = Σ weight(j → i)               (over inbound vouches)
 *   vouch_score(i)  = 10 × (1 − e^(−vouch_signal(i) / K))   K = TRUST_VOUCH_K
 *   vouch_power(i)  = avg(rating_avg of users i has vouched for)
 *                     clamped [TRUST_VOUCH_POWER_MIN, MAX]; 1.0 default
 *
 * The +1 inside the log is the bootstrap floor (spec §04): every
 * vouch produces non-zero weight even when the voucher's own signal
 * is 0 (log(2) ≈ 0.69).
 */

import { getSupabaseAdmin } from "../supabase";
import {
  TRUST_VOUCH_K,
  TRUST_RECOMPUTE_MAX_PASSES,
  TRUST_RECOMPUTE_DELTA_EPSILON,
  TRUST_VOUCH_POWER_MIN,
  TRUST_VOUCH_POWER_MAX,
  TRUST_VOUCH_POWER_DEFAULT,
} from "./config";

// ── Types ──

interface UserRow {
  id: string;
  vouch_power: number | string | null;
  rating_avg: number | string | null;
}

interface VouchEdge {
  voucher_id: string;
  vouchee_id: string;
}

export interface RecomputeAllResult {
  users: number;
  passes_run: number;
  converged: boolean;
  final_max_delta: number;
  computed_at: string;
}

// ── Single-user helpers (exported for inspection / spot-checks) ──

/**
 * Apply the §03 Step 3 transform: signal → 0–10 score.
 * Pure, idempotent, no DB I/O.
 */
export function computeVouchScoreFromSignal(signal: number): number {
  if (!Number.isFinite(signal) || signal <= 0) return 0;
  const score = 10 * (1 - Math.exp(-signal / TRUST_VOUCH_K));
  return roundTo(score, 1);
}

/**
 * Compute a single user's raw vouch_signal from current DB state.
 * Reads inbound vouches once and uses each voucher's currently
 * stored vouch_power and vouch_signal — does NOT iterate. Useful
 * for spot-checks; the orchestrator below does the iteration.
 */
export async function computeVouchSignalForUser(
  userId: string
): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data: vouches } = await supabase
    .from("vouches")
    .select("voucher_id")
    .eq("vouchee_id", userId);
  if (!vouches || vouches.length === 0) return 0;

  const voucherIds = vouches.map((v) => v.voucher_id as string);
  const { data: vouchers } = await supabase
    .from("users")
    .select("id, vouch_power, vouch_signal")
    .in("id", voucherIds);
  const byId = new Map(
    (vouchers ?? []).map((u: { id: string; vouch_power: unknown; vouch_signal: unknown }) => [
      u.id,
      {
        power: numericOr(u.vouch_power, TRUST_VOUCH_POWER_DEFAULT),
        signal: numericOr(u.vouch_signal, 0),
      },
    ])
  );

  let signal = 0;
  for (const vid of voucherIds) {
    const row = byId.get(vid);
    const p = row?.power ?? TRUST_VOUCH_POWER_DEFAULT;
    const s = row?.signal ?? 0;
    signal += p * Math.log(2 + s);
  }
  return roundTo(signal, 4);
}

/**
 * Compute (don't persist) a user's vouch_power = avg(rating_avg of
 * vouchees), clamped. 1.0 if no vouchees or no rated vouchees.
 */
export async function computeVouchPowerForUser(
  userId: string
): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data: vouchees } = await supabase
    .from("vouches")
    .select("vouchee_id")
    .eq("voucher_id", userId);
  if (!vouchees || vouchees.length === 0) return TRUST_VOUCH_POWER_DEFAULT;

  const voucheeIds = vouchees.map((v) => v.vouchee_id as string);
  const { data: ratedUsers } = await supabase
    .from("users")
    .select("rating_avg")
    .in("id", voucheeIds)
    .not("rating_avg", "is", null);
  if (!ratedUsers || ratedUsers.length === 0) return TRUST_VOUCH_POWER_DEFAULT;

  const ratings = ratedUsers
    .map((u: { rating_avg: unknown }) => numericOr(u.rating_avg, NaN))
    .filter((r: number) => Number.isFinite(r));
  if (ratings.length === 0) return TRUST_VOUCH_POWER_DEFAULT;

  const avg = ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length;
  return clampPower(avg / 4.0);
}

// ── Orchestrator ──

/**
 * Recompute Trust v2 columns (vouch_signal, vouch_score, vouch_power,
 * last_score_computed_at) for every user. Fixed-point iteration:
 * vouch_signal depends on inbound vouchers' vouch_power *and*
 * inbound vouchers' vouch_signal — so we re-evaluate until the max
 * delta across all users falls below TRUST_RECOMPUTE_DELTA_EPSILON
 * (typically 2–3 passes at alpha scale).
 *
 * rating_avg is *not* recomputed here — the mig 046 trigger keeps
 * it current on every stay_confirmations write.
 */
export async function recomputeAllTrustV2(): Promise<RecomputeAllResult> {
  const supabase = getSupabaseAdmin();

  // Pull users + the whole vouch graph in two queries.
  const { data: usersRaw, error: uErr } = await supabase
    .from("users")
    .select("id, vouch_power, rating_avg");
  if (uErr) throw uErr;
  const users = (usersRaw ?? []) as UserRow[];

  const { data: vouchesRaw, error: vErr } = await supabase
    .from("vouches")
    .select("voucher_id, vouchee_id");
  if (vErr) throw vErr;
  const vouches = (vouchesRaw ?? []) as VouchEdge[];

  // Adjacency maps.
  const inbound = new Map<string, string[]>();
  const outbound = new Map<string, string[]>();
  for (const v of vouches) {
    pushInto(inbound, v.vouchee_id, v.voucher_id);
    pushInto(outbound, v.voucher_id, v.vouchee_id);
  }

  // Working state. vouch_power initialized to existing column (so
  // first pass sees a sane value); rating_avg is read-only here.
  const power = new Map<string, number>();
  const signal = new Map<string, number>();
  const ratingAvg = new Map<string, number | null>();
  for (const u of users) {
    power.set(u.id, numericOr(u.vouch_power, TRUST_VOUCH_POWER_DEFAULT));
    signal.set(u.id, 0);
    const ra = numericOr(u.rating_avg, NaN);
    ratingAvg.set(u.id, Number.isFinite(ra) ? ra : null);
  }

  // Fixed-point iteration.
  let pass = 0;
  let maxDelta = Infinity;
  let converged = false;
  for (; pass < TRUST_RECOMPUTE_MAX_PASSES; pass++) {
    maxDelta = 0;

    // Step A: refresh vouch_power from current rating_avg of vouchees.
    for (const u of users) {
      const targets = outbound.get(u.id) ?? [];
      let newPower = TRUST_VOUCH_POWER_DEFAULT;
      if (targets.length > 0) {
        const ratings: number[] = [];
        for (const tid of targets) {
          const r = ratingAvg.get(tid);
          if (r != null) ratings.push(r);
        }
        if (ratings.length > 0) {
          const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
          newPower = clampPower(avg / 4.0);
        }
      }
      const old = power.get(u.id) ?? TRUST_VOUCH_POWER_DEFAULT;
      if (Math.abs(newPower - old) > maxDelta) maxDelta = Math.abs(newPower - old);
      power.set(u.id, newPower);
    }

    // Step B: refresh vouch_signal using updated power + previous-pass signal.
    const next = new Map<string, number>();
    for (const u of users) {
      const sources = inbound.get(u.id) ?? [];
      let s = 0;
      for (const sid of sources) {
        const p = power.get(sid) ?? TRUST_VOUCH_POWER_DEFAULT;
        const sj = signal.get(sid) ?? 0;
        s += p * Math.log(2 + sj);
      }
      next.set(u.id, s);
      const old = signal.get(u.id) ?? 0;
      if (Math.abs(s - old) > maxDelta) maxDelta = Math.abs(s - old);
    }
    for (const [id, s] of next) signal.set(id, s);

    if (maxDelta < TRUST_RECOMPUTE_DELTA_EPSILON) {
      converged = true;
      pass++;
      break;
    }
  }

  // Persist. Single column write per user — small at alpha scale
  // (~60 users); batch with Promise.all to keep total time under
  // a couple of seconds.
  const computedAt = new Date().toISOString();
  await Promise.all(
    users.map((u) => {
      const sig = roundTo(signal.get(u.id) ?? 0, 4);
      const sc = computeVouchScoreFromSignal(sig);
      const pw = roundTo(power.get(u.id) ?? TRUST_VOUCH_POWER_DEFAULT, 3);
      return supabase
        .from("users")
        .update({
          vouch_signal: sig,
          vouch_score: sc,
          vouch_power: pw,
          last_score_computed_at: computedAt,
        })
        .eq("id", u.id);
    })
  );

  return {
    users: users.length,
    passes_run: pass,
    converged,
    final_max_delta: roundTo(maxDelta, 4),
    computed_at: computedAt,
  };
}

// ── Internal helpers ──

function pushInto(m: Map<string, string[]>, k: string, v: string): void {
  const list = m.get(k);
  if (list) list.push(v);
  else m.set(k, [v]);
}

function numericOr(value: unknown, fallback: number): number {
  if (value == null) return fallback;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampPower(raw: number): number {
  if (!Number.isFinite(raw)) return TRUST_VOUCH_POWER_DEFAULT;
  return roundTo(
    Math.min(TRUST_VOUCH_POWER_MAX, Math.max(TRUST_VOUCH_POWER_MIN, raw)),
    3
  );
}

function roundTo(n: number, digits: number): number {
  const m = 10 ** digits;
  return Math.round(n * m) / m;
}
