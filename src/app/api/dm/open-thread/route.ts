export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * POST /api/dm/open-thread
 * Body: { otherUserId: string }
 *
 * Person-to-person direct messaging without a listing context.
 * Find-or-create a listing-less thread (migration 034 made
 * message_threads.listing_id nullable) between the current user and
 * otherUserId. Canonicalizes the pair so the lower UUID always sits
 * in the guest_id slot — this keeps the partial unique index on
 * (guest_id, host_id) WHERE listing_id IS NULL effective regardless
 * of which side initiated.
 *
 * Returns the thread id so the client can router.push(`/inbox/${id}`).
 */
export async function POST(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    otherUserId?: string;
    /** S9d: when this DM was opened from /proposals/[id] (e.g. a TW
     *  with no listing), stamp origin_proposal_id on insert so the
     *  thread surface can render the OriginProposalCard + Send-stay-
     *  terms bridge. Backfilled (not overwritten) on existing rows. */
    proposalId?: string;
  } | null;
  if (!body?.otherUserId) {
    return Response.json(
      { error: "otherUserId required" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: viewer } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!viewer) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }
  if (viewer.id === body.otherUserId) {
    return Response.json(
      { error: "Can't message yourself" },
      { status: 400 }
    );
  }

  // Confirm the other user exists before creating a thread that
  // would dangle without a real counterparty.
  const { data: other } = await supabase
    .from("users")
    .select("id")
    .eq("id", body.otherUserId)
    .maybeSingle();
  if (!other) {
    return Response.json({ error: "Recipient not found" }, { status: 404 });
  }

  // Canonicalize so the same pair always produces the same row
  // regardless of which direction opens the DM first.
  const [guestId, hostId] =
    viewer.id < body.otherUserId
      ? [viewer.id, body.otherUserId]
      : [body.otherUserId, viewer.id];

  const { data: existing } = await supabase
    .from("message_threads")
    .select("id, origin_proposal_id")
    .eq("guest_id", guestId)
    .eq("host_id", hostId)
    .is("listing_id", null)
    .maybeSingle();

  if (existing) {
    // Backfill origin_proposal_id when this re-open arrives from a
    // proposal AND the row doesn't already carry one. Don't overwrite
    // a different existing origin — first-contact reason wins.
    if (body.proposalId && !existing.origin_proposal_id) {
      await supabase
        .from("message_threads")
        .update({ origin_proposal_id: body.proposalId })
        .eq("id", existing.id);
    }
    return Response.json({ threadId: existing.id });
  }

  const { data: created, error } = await supabase
    .from("message_threads")
    .insert({
      listing_id: null,
      guest_id: guestId,
      host_id: hostId,
      origin_proposal_id: body.proposalId ?? null,
    })
    .select("id")
    .single();
  if (error || !created) {
    console.error("dm open-thread insert error", error);
    return Response.json(
      { error: "Couldn't open conversation" },
      { status: 500 }
    );
  }

  return Response.json({ threadId: created.id });
}
