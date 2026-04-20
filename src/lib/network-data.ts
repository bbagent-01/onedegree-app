import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "./supabase";
import { getEffectiveUserId } from "./impersonation/session";

export interface NetworkPerson {
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  vouch_type: string;
  vouch_score: number | null;
  years_known_bucket: string;
  created_at: string;
  /** Vouchee's guest_rating average if they've received any reviews. */
  guest_rating: number | null;
  guest_review_count: number;
}

export interface PendingInvite {
  id: string;
  invitee_name: string | null;
  invitee_email: string | null;
  invitee_phone: string | null;
  status: string;
  delivery_method: string | null;
  created_at: string;
}

export interface NetworkData {
  vouchedFor: NetworkPerson[];
  vouchedBy: NetworkPerson[];
  pendingInvites: PendingInvite[];
  stats: {
    vouchPower: number;
    avgGuestRatingOfVouchees: number | null;
    vouchesGiven: number;
    vouchesReceived: number;
  };
}

export async function getNetworkData(): Promise<NetworkData | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = getSupabaseAdmin();

  // ALPHA ONLY: resolve via the impersonation-aware helper so network
  // data follows the impersonated user when active.
  const effectiveId = await getEffectiveUserId(userId);
  if (!effectiveId) return null;

  const { data: user } = await supabase
    .from("users")
    .select("id, vouch_power, vouch_count_given, vouch_count_received")
    .eq("id", effectiveId)
    .single();

  if (!user) return null;

  // Fetch network via RPC
  const { data: network } = await supabase.rpc("get_user_network", {
    p_user_id: user.id,
  });

  const vouchedFor: NetworkPerson[] = [];
  const vouchedBy: NetworkPerson[] = [];

  // Look up guest_rating + review count for everyone in the network
  // so vouchees' scores can be displayed alongside the vouch itself.
  const networkIds = new Set<string>();
  if (network) {
    for (const row of network) networkIds.add(row.user_id as string);
  }
  const ratingsByUser = new Map<
    string,
    { guest_rating: number | null; guest_review_count: number }
  >();
  if (networkIds.size > 0) {
    const { data: ratedUsers } = await supabase
      .from("users")
      .select("id, guest_rating, guest_review_count")
      .in("id", Array.from(networkIds));
    for (const u of ratedUsers ?? []) {
      ratingsByUser.set(u.id as string, {
        guest_rating: (u.guest_rating as number | null) ?? null,
        guest_review_count: (u.guest_review_count as number | null) ?? 0,
      });
    }
  }

  if (network) {
    for (const row of network) {
      const ratings = ratingsByUser.get(row.user_id as string);
      const person: NetworkPerson = {
        user_id: row.user_id,
        user_name: row.user_name,
        user_avatar: row.user_avatar,
        vouch_type: row.vouch_type,
        vouch_score: row.vouch_score,
        years_known_bucket: row.years_known_bucket,
        created_at: row.created_at,
        guest_rating: ratings?.guest_rating ?? null,
        guest_review_count: ratings?.guest_review_count ?? 0,
      };
      if (row.relationship === "vouched_for") {
        vouchedFor.push(person);
      } else {
        vouchedBy.push(person);
      }
    }
  }

  // Compute the actual avg guest rating of vouchees for the math display
  // (input to vouch_power formula: avg_rating / 4.0, clamped [0.5, 1.5]).
  // Reuses the already-fetched ratings rather than a second query.
  let avgGuestRatingOfVouchees: number | null = null;
  if (vouchedFor.length > 0) {
    const ratedVouchees = vouchedFor
      .map((p) => p.guest_rating)
      .filter((r): r is number => typeof r === "number" && r > 0);
    if (ratedVouchees.length > 0) {
      const sum = ratedVouchees.reduce((acc, r) => acc + r, 0);
      avgGuestRatingOfVouchees =
        Math.round((sum / ratedVouchees.length) * 100) / 100;
    }
  }

  // Recompute vouch power from the actual avg to ensure display accuracy
  let correctVouchPower = 1.0;
  if (avgGuestRatingOfVouchees !== null) {
    correctVouchPower = Math.min(
      1.5,
      Math.max(0.5, avgGuestRatingOfVouchees / 4.0)
    );
    correctVouchPower = Math.round(correctVouchPower * 100) / 100;
  }

  // Fetch pending invites
  const { data: invites } = await supabase
    .from("invites")
    .select("id, invitee_name, invitee_email, invitee_phone, status, delivery_method, created_at")
    .eq("inviter_id", user.id)
    .neq("status", "joined")
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    vouchedFor,
    vouchedBy,
    pendingInvites: (invites ?? []) as PendingInvite[],
    stats: {
      vouchPower: correctVouchPower,
      avgGuestRatingOfVouchees,
      vouchesGiven: user.vouch_count_given ?? 0,
      vouchesReceived: user.vouch_count_received ?? 0,
    },
  };
}
