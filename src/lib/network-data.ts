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
  created_at: string;
}

export interface NetworkData {
  vouchedFor: NetworkPerson[];
  vouchedBy: NetworkPerson[];
  pendingInvites: PendingInvite[];
  stats: {
    vouchPower: number;
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

  // Fetch pending invites
  const { data: invites } = await supabase
    .from("invites")
    .select("id, invitee_name, invitee_email, invitee_phone, status, created_at")
    .eq("inviter_id", user.id)
    .neq("status", "joined")
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    vouchedFor,
    vouchedBy,
    pendingInvites: (invites ?? []) as PendingInvite[],
    stats: {
      vouchPower: user.vouch_power ?? 1.0,
      vouchesGiven: user.vouch_count_given ?? 0,
      vouchesReceived: user.vouch_count_received ?? 0,
    },
  };
}
