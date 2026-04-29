export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { getOrCreateThread } from "@/lib/messaging-data";
import { rateLimitOr429 } from "@/lib/rate-limit";

/**
 * POST /api/contact-requests/from-proposal/[threadId]
 *
 * S9d bridge from the proposal feed into the S7 terms flow.
 *
 * Two callers, one endpoint:
 *
 *   - Trip Wish (TW) host-side. The host sees a TW posted by a guest,
 *     opens a thread via "Message [name]" (listing-less DM, since a
 *     TW carries no listing), then clicks "Send stay terms" and
 *     picks one of their listings. The body is { listing_id, proposal_id }.
 *     Server: validates listing ownership, get-or-creates the
 *     canonical (listing, guest=TW author, host=viewer) thread,
 *     prefills a contact_request from the TW (dates → start/end or
 *     flexible_month + 7d, guest_count → TW value or 1), links the
 *     request to that listing-scoped thread, and returns its id.
 *     Client navigates there; HostReviewTermsInline auto-renders for
 *     the host because the row is `pending`.
 *
 *   - Host Offer (HO) guest-side. The guest sees an HO posted by a
 *     host, opens a thread via "Message [host]" (listing-scoped, since
 *     the HO already pins listing_id), then clicks "Request these
 *     terms" with body { listing_id, proposal_id }. Server: validates
 *     listing matches the HO, viewer is the guest, prefills a
 *     contact_request the same way as TW, and links it to the SAME
 *     thread. The host sees pending terms on their next refresh and
 *     the existing S7 review/edit/decline path takes over.
 *
 * Guards (both paths):
 *   - Viewer must be one of the thread's participants.
 *   - Proposal must exist, be 'active', match the thread's
 *     origin_proposal_id (no cross-thread spoofing), and be the
 *     `kind` consistent with the requested action.
 *   - Listing must exist and be active.
 *   - Target thread must not already have a contact_request_id —
 *     one terms flow per thread, like S7.
 *
 * Returns: { ok: true, threadId, contactRequestId }
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ threadId: string }> }
) {
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const blocked = await rateLimitOr429("contactRequest", userId);
  if (blocked) return blocked;

  const { threadId } = await ctx.params;
  if (!threadId) {
    return Response.json({ error: "threadId required" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    listing_id?: string;
    proposal_id?: string;
  } | null;
  if (!body?.listing_id || !body?.proposal_id) {
    return Response.json(
      { error: "listing_id and proposal_id required" },
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

  const { data: thread } = await supabase
    .from("message_threads")
    .select(
      "id, listing_id, guest_id, host_id, contact_request_id, origin_proposal_id"
    )
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }
  if (thread.guest_id !== viewer.id && thread.host_id !== viewer.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // No spoofing — the proposal_id in the body must match what the
  // thread carries. Belt + suspenders against a malicious client
  // posting an arbitrary proposal id with someone else's thread.
  if (
    !thread.origin_proposal_id ||
    thread.origin_proposal_id !== body.proposal_id
  ) {
    return Response.json(
      { error: "Proposal does not match this thread." },
      { status: 400 }
    );
  }

  const { data: proposal } = await supabase
    .from("proposals")
    .select(
      "id, kind, status, expires_at, author_id, listing_id, start_date, end_date, flexible_month, guest_count, title"
    )
    .eq("id", body.proposal_id)
    .maybeSingle();
  if (!proposal) {
    return Response.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (proposal.status !== "active") {
    return Response.json(
      { error: "This proposal is no longer active." },
      { status: 400 }
    );
  }
  if (
    proposal.expires_at &&
    new Date(proposal.expires_at).getTime() < Date.now()
  ) {
    return Response.json(
      { error: "This proposal has expired." },
      { status: 400 }
    );
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, host_id, is_active")
    .eq("id", body.listing_id)
    .maybeSingle();
  if (!listing) {
    return Response.json({ error: "Listing not found" }, { status: 404 });
  }
  if (!listing.is_active) {
    return Response.json(
      { error: "That listing isn't active." },
      { status: 400 }
    );
  }

  // Branch by proposal kind. Both paths converge on the same
  // contact_request shape, just with different role assignments and a
  // different target thread (TW may need a new listing-scoped one).
  let targetThreadId = thread.id;
  let targetThreadHostId = thread.host_id;
  let targetThreadGuestId = thread.guest_id;
  let targetThreadContactRequestId: string | null =
    thread.contact_request_id ?? null;

  if (proposal.kind === "trip_wish") {
    // TW author = the guest. Viewer must be the picked listing's host.
    if (listing.host_id !== viewer.id) {
      return Response.json(
        { error: "You can only send terms for your own listing." },
        { status: 403 }
      );
    }
    if (proposal.author_id === viewer.id) {
      return Response.json(
        { error: "You can't send terms for your own Trip Wish." },
        { status: 400 }
      );
    }

    // The TW thread is a listing-less DM. Get-or-create the canonical
    // (listing, guest=TW author, host=viewer) thread and reuse it
    // going forward — that's where HostReviewTermsInline + the
    // listing context card render correctly.
    const canonicalThreadId = await getOrCreateThread({
      listingId: listing.id,
      guestId: proposal.author_id,
      hostId: viewer.id,
    });

    // Carry the origin proposal forward so the canonical thread
    // shows the OriginProposalCard too. Only set if currently null —
    // the canonical thread may pre-date the bridge and we don't want
    // to clobber an unrelated origin.
    await supabase
      .from("message_threads")
      .update({ origin_proposal_id: proposal.id })
      .eq("id", canonicalThreadId)
      .is("origin_proposal_id", null);

    // Re-read the canonical thread's contact_request_id — if it's
    // already populated (an older booking with this guest), don't
    // overwrite. Just navigate the host there.
    const { data: canonical } = await supabase
      .from("message_threads")
      .select("id, host_id, guest_id, contact_request_id")
      .eq("id", canonicalThreadId)
      .single();
    targetThreadId = canonical!.id;
    targetThreadHostId = canonical!.host_id;
    targetThreadGuestId = canonical!.guest_id;
    targetThreadContactRequestId = canonical!.contact_request_id ?? null;
  } else if (proposal.kind === "host_offer") {
    // HO host = listing.host_id = thread.host_id. Viewer must be the
    // guest side of the thread.
    if (viewer.id !== thread.guest_id) {
      return Response.json(
        { error: "Only the guest can request these terms." },
        { status: 403 }
      );
    }
    // The HO already pins listing_id; reject mismatches so a guest
    // can't smuggle a different listing into the request.
    if (proposal.listing_id !== listing.id) {
      return Response.json(
        { error: "Listing does not match the Host Offer." },
        { status: 400 }
      );
    }
    if (thread.listing_id && thread.listing_id !== listing.id) {
      return Response.json(
        { error: "Thread is scoped to a different listing." },
        { status: 400 }
      );
    }
  } else {
    return Response.json(
      { error: "Unknown proposal kind." },
      { status: 400 }
    );
  }

  if (targetThreadContactRequestId) {
    // Already an active reservation/terms flow on the target thread —
    // just bounce the user there. Avoids the user thinking nothing
    // happened and clicking again.
    return Response.json({
      ok: true,
      threadId: targetThreadId,
      contactRequestId: targetThreadContactRequestId,
      info: "existing-flow",
    });
  }

  // Derive the prefill from the proposal. Dates fall back to a
  // 7-day window starting on the first of the flexible month so the
  // host (or guest) sees something concrete in the composer instead
  // of a blank Trip section. flexible_month is stored as 'YYYY-MM'.
  let checkIn: string | null = proposal.start_date ?? null;
  let checkOut: string | null = proposal.end_date ?? null;
  if (!checkIn && !checkOut && proposal.flexible_month) {
    const [yStr, mStr] = proposal.flexible_month.slice(0, 7).split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    if (y && m) {
      const start = new Date(Date.UTC(y, m - 1, 1));
      const end = new Date(Date.UTC(y, m - 1, 8));
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      checkIn = fmt(start);
      checkOut = fmt(end);
    }
  }
  const guestCount =
    typeof proposal.guest_count === "number" && proposal.guest_count > 0
      ? proposal.guest_count
      : 1;

  const { data: created, error: insertErr } = await supabase
    .from("contact_requests")
    .insert({
      listing_id: listing.id,
      guest_id: targetThreadGuestId,
      host_id: targetThreadHostId,
      status: "pending",
      message:
        proposal.kind === "trip_wish"
          ? "Stay terms from Trip Wish"
          : "Stay terms requested from Host Offer",
      check_in: checkIn,
      check_out: checkOut,
      guest_count: guestCount,
    })
    .select("id")
    .single();
  if (insertErr || !created) {
    console.error("[from-proposal] contact_request insert failed:", insertErr);
    return Response.json(
      { error: "Couldn't start stay terms." },
      { status: 500 }
    );
  }

  const { error: linkErr } = await supabase
    .from("message_threads")
    .update({ contact_request_id: created.id })
    .eq("id", targetThreadId);
  if (linkErr) {
    console.error("[from-proposal] thread link failed:", linkErr);
    return Response.json(
      { error: "Couldn't attach stay terms to thread." },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    threadId: targetThreadId,
    contactRequestId: created.id,
  });
}
