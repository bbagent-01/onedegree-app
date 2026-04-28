/**
 * Vouch power computation.
 * Server-side only.
 *
 * vouch_power = avg(guest_rating of all vouchees) / 4.0
 * Clamped to [0.5, 1.5]. No data = 1.0 (benefit of doubt).
 */

import { getSupabaseAdmin } from "../supabase";
import type { VouchPowerResult } from "./types";

/**
 * Compute (and optionally persist) a user's vouch power.
 * Linear scale: avg_guest_rating / 4.0, clamped [0.5, 1.5].
 * No rated vouchees = 1.0 (benefit of doubt).
 */
export async function computeVouchPower(
  userId: string
): Promise<VouchPowerResult> {
  const supabase = getSupabaseAdmin();

  // Get all vouchees with guest ratings
  const { data: vouchees } = await supabase
    .from("vouches")
    .select("vouchee_id")
    .eq("voucher_id", userId);

  if (!vouchees || vouchees.length === 0) {
    return { vouch_power: 1.0, vouchee_count: 0, avg_guest_rating: null };
  }

  const voucheeIds = vouchees.map(
    (v: { vouchee_id: string }) => v.vouchee_id
  );

  const { data: ratedUsers } = await supabase
    .from("users")
    .select("guest_rating")
    .in("id", voucheeIds)
    .not("guest_rating", "is", null);

  if (!ratedUsers || ratedUsers.length === 0) {
    return {
      vouch_power: 1.0,
      vouchee_count: voucheeIds.length,
      avg_guest_rating: null,
    };
  }

  const ratings = ratedUsers.map(
    (u: { guest_rating: number }) => u.guest_rating
  );
  const avgRating = ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length;
  const rawPower = avgRating / 4.0;
  const vouch_power = Math.min(1.5, Math.max(0.5, rawPower));

  return {
    vouch_power: Math.round(vouch_power * 100) / 100,
    vouchee_count: voucheeIds.length,
    avg_guest_rating: Math.round(avgRating * 100) / 100,
  };
}

/**
 * Compute and persist vouch_power to the database via RPC.
 * Prefer this when you want to update the stored value.
 */
export async function persistVouchPower(userId: string): Promise<number> {
  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase.rpc(
      "recalculate_vouch_power_for_user",
      { p_user_id: userId }
    );
    if (error) throw error;
    return (data as number) ?? 1.0;
  } catch {
    // Fallback: compute in JS and update directly
    const result = await computeVouchPower(userId);
    await supabase
      .from("users")
      .update({ vouch_power: result.vouch_power })
      .eq("id", userId);
    return result.vouch_power;
  }
}
