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
  /** B2: true when this vouch landed via an open invite link (Mode B
   *  or Mode C). Drives the "from open link — review?" badge in the
   *  network section so the sender can quickly revoke if the wrong
   *  person claimed their link. Only meaningful on the vouchedFor side. */
  from_open_link?: boolean;
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

export interface VouchBackCandidate {
  voucher_id: string;
  voucher_name: string;
  voucher_avatar: string | null;
  created_at: string;
}

export interface NetworkData {
  vouchedFor: NetworkPerson[];
  vouchedBy: NetworkPerson[];
  pendingInvites: PendingInvite[];
  /** Incoming vouches that the current user has NOT reciprocated and
   *  has NOT dismissed (or whose dismissal has expired). Surfaces as
   *  the "People who vouched for you" vouch-back section. */
  vouchBackCandidates: VouchBackCandidate[];
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

  // Tag vouches that came from open invite links (Mode B / Mode C)
  // so the network section can show a "from open link — review?"
  // badge — the safety valve for the auto-vouch trust model. Done
  // as two queries (vouches → pending_vouches) instead of a PostgREST
  // join because the from_pending_vouch_id FK was added in 048 and
  // hasn't necessarily been reloaded by PostgREST's schema cache.
  if (vouchedFor.length > 0) {
    const voucheeIds = vouchedFor.map((p) => p.user_id);
    const { data: openVouches } = await supabase
      .from("vouches")
      .select("vouchee_id, from_pending_vouch_id")
      .eq("voucher_id", user.id)
      .in("vouchee_id", voucheeIds)
      .not("from_pending_vouch_id", "is", null)
      .eq("is_demo_origin", false);

    const pvIds = Array.from(
      new Set(
        (openVouches ?? [])
          .map((v) => v.from_pending_vouch_id as string | null)
          .filter((id): id is string => !!id)
      )
    );
    if (pvIds.length > 0) {
      const { data: pvRows } = await supabase
        .from("pending_vouches")
        .select("id, mode")
        .in("id", pvIds);
      const openModeIds = new Set(
        (pvRows ?? [])
          .filter((r) => {
            const m = r.mode as string;
            return m === "open_individual" || m === "open_group";
          })
          .map((r) => r.id as string)
      );
      const fromOpen = new Set<string>();
      for (const v of openVouches ?? []) {
        if (openModeIds.has(v.from_pending_vouch_id as string)) {
          fromOpen.add(v.vouchee_id as string);
        }
      }
      for (const p of vouchedFor) {
        if (fromOpen.has(p.user_id)) p.from_open_link = true;
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

  const vouchBackCandidates = await getVouchBackCandidates(user.id);

  return {
    vouchedFor,
    vouchedBy,
    pendingInvites: (invites ?? []) as PendingInvite[],
    vouchBackCandidates,
    stats: {
      vouchPower: correctVouchPower,
      avgGuestRatingOfVouchees,
      vouchesGiven: user.vouch_count_given ?? 0,
      vouchesReceived: user.vouch_count_received ?? 0,
    },
  };
}

/**
 * Returns the list of users who have vouched for `userId` but whom
 * `userId` has NOT yet vouched back AND has NOT dismissed (or whose
 * dismissal is expired). Drives the "People who vouched for you"
 * section + the Network nav count badge.
 *
 * `minAgeDays` filters to incoming vouches at least N days old — used
 * by the nav badge so freshly-received vouches don't nag the user.
 * Default 0 (no age filter) → full list for the section UI.
 */
export async function getVouchBackCandidates(
  userId: string,
  opts: { minAgeDays?: number } = {}
): Promise<VouchBackCandidate[]> {
  const supabase = getSupabaseAdmin();
  const { minAgeDays = 0 } = opts;

  // Incoming vouches targeted at userId. Demo-origin (B8) excluded
  // — auto-vouches must never trigger a "vouch back?" prompt.
  let incomingQuery = supabase
    .from("vouches")
    .select("voucher_id, created_at")
    .eq("vouchee_id", userId)
    .eq("is_demo_origin", false)
    .order("created_at", { ascending: false });
  if (minAgeDays > 0) {
    const cutoff = new Date(Date.now() - minAgeDays * 24 * 60 * 60 * 1000);
    incomingQuery = incomingQuery.lte("created_at", cutoff.toISOString());
  }
  const { data: incoming } = await incomingQuery;
  if (!incoming || incoming.length === 0) return [];

  const incomingVoucherIds = (incoming as Array<{
    voucher_id: string;
    created_at: string;
  }>).map((v) => v.voucher_id);

  // Outgoing vouches from userId — we'll skip anyone already vouched.
  const { data: outgoing } = await supabase
    .from("vouches")
    .select("vouchee_id")
    .eq("voucher_id", userId)
    .in("vouchee_id", incomingVoucherIds)
    .eq("is_demo_origin", false);
  const alreadyReciprocated = new Set(
    (outgoing ?? []).map((v) => v.vouchee_id as string)
  );

  // Active dismissals (expires_at in the future).
  const nowIso = new Date().toISOString();
  const { data: dismissals } = await supabase
    .from("vouch_back_dismissals")
    .select("voucher_id")
    .eq("user_id", userId)
    .in("voucher_id", incomingVoucherIds)
    .gt("expires_at", nowIso);
  const dismissed = new Set(
    (dismissals ?? []).map((d) => d.voucher_id as string)
  );

  const candidateIds = incomingVoucherIds.filter(
    (id) => !alreadyReciprocated.has(id) && !dismissed.has(id)
  );
  if (candidateIds.length === 0) return [];

  // Fetch display data for the candidates.
  const { data: voucherRows } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .in("id", candidateIds);
  const voucherById = new Map(
    (voucherRows ?? []).map((u) => [
      u.id as string,
      {
        name: (u.name as string | null) ?? "",
        avatar_url: (u.avatar_url as string | null) ?? null,
      },
    ])
  );

  return (incoming as Array<{ voucher_id: string; created_at: string }>)
    .filter((v) => candidateIds.includes(v.voucher_id))
    .map((v) => {
      const details = voucherById.get(v.voucher_id);
      return {
        voucher_id: v.voucher_id,
        voucher_name: details?.name ?? "",
        voucher_avatar: details?.avatar_url ?? null,
        created_at: v.created_at,
      };
    });
}
