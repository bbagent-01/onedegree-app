export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getOrCreateThread } from "@/lib/messaging-data";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * POST /api/message-threads
 * Body: { listingId, otherUserId? }
 * Get-or-create a thread between the current user and the listing's host
 * (if current user is a guest), or between the host and the given otherUserId
 * (if current user is the listing's host messaging a guest).
 */
export async function POST(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as {
    listingId?: string;
    otherUserId?: string;
    contactRequestId?: string;
    /** S9d: opaque pass-through to getOrCreateThread so a thread
     *  opened from /proposals/[id] stamps origin_proposal_id on
     *  first insert. */
    proposalId?: string;
  } | null;

  if (!body?.listingId) {
    return Response.json({ error: "listingId required" }, { status: 400 });
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, host_id")
    .eq("id", body.listingId)
    .single();
  if (!listing) {
    return Response.json({ error: "Listing not found" }, { status: 404 });
  }

  let guestId: string;
  const hostId = listing.host_id;

  if (currentUser.id === hostId) {
    if (!body.otherUserId) {
      return Response.json(
        { error: "otherUserId required when host opens a thread" },
        { status: 400 }
      );
    }
    guestId = body.otherUserId;
  } else {
    guestId = currentUser.id;
  }

  try {
    const threadId = await getOrCreateThread({
      listingId: body.listingId,
      guestId,
      hostId,
      contactRequestId: body.contactRequestId ?? null,
      originProposalId: body.proposalId ?? null,
    });
    return Response.json({ threadId });
  } catch (e) {
    console.error("Thread create error:", e);
    return Response.json({ error: "Failed to create thread" }, { status: 500 });
  }
}
