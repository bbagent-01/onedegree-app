import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "./supabase";

export interface NetworkPerson {
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  vouch_type: string;
  vouch_score: number | null;
  years_known_bucket: string;
  created_at: string;
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

  const { data: user } = await supabase
    .from("users")
    .select("id, vouch_power, vouch_count_given, vouch_count_received")
    .eq("clerk_id", userId)
    .single();

  if (!user) return null;

  // Fetch network via RPC
  const { data: network } = await supabase.rpc("get_user_network", {
    p_user_id: user.id,
  });

  const vouchedFor: NetworkPerson[] = [];
  const vouchedBy: NetworkPerson[] = [];

  if (network) {
    for (const row of network) {
      const person: NetworkPerson = {
        user_id: row.user_id,
        user_name: row.user_name,
        user_avatar: row.user_avatar,
        vouch_type: row.vouch_type,
        vouch_score: row.vouch_score,
        years_known_bucket: row.years_known_bucket,
        created_at: row.created_at,
      };
      if (row.relationship === "vouched_for") {
        vouchedFor.push(person);
      } else {
        vouchedBy.push(person);
      }
    }
  }

  // Compute the actual avg guest rating of vouchees for the math display
  // This is the input to the vouch power formula: avg_rating / 4.0, clamped [0.5, 1.5]
  let avgGuestRatingOfVouchees: number | null = null;
  if (vouchedFor.length > 0) {
    const voucheeIds = vouchedFor.map((p) => p.user_id);
    const { data: voucheeUsers } = await supabase
      .from("users")
      .select("guest_rating")
      .in("id", voucheeIds)
      .not("guest_rating", "is", null);

    if (voucheeUsers && voucheeUsers.length > 0) {
      const sum = voucheeUsers.reduce(
        (acc, u) => acc + (u.guest_rating ?? 0),
        0
      );
      avgGuestRatingOfVouchees =
        Math.round((sum / voucheeUsers.length) * 100) / 100;
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
