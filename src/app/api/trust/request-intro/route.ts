export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { emailNewMessage } from "@/lib/email";
import { effectiveAuth } from "@/lib/impersonation/session";
import { INTRO_REQUEST_PREFIX } from "@/lib/structured-messages";

/**
 * POST /api/trust/request-intro
 * Body: {
 *   listingId: string,
 *   message: string,              // required, 20+ chars
 *   startDate?: string,           // ISO date, non-binding
 *   endDate?: string              // ISO date, non-binding
 * }
 *
 * S2a direct-intro model — NO connector middleman.
 *   Sender initiates → Recipient (listing host) decides. The recipient
 *   is always the gatekeeper: they see the sender's full profile,
 *   decide whether to Accept / Reply / Decline / Ignore, and on Accept
 *   the app issues a bidirectional listing_access_grants pair.
 *
 *   The thread is an intro thread while intro_status is pending /
 *   accepted / declined / ignored. Accepted intros stay flagged so the
 *   recipient can later revoke access from the same IntroRequestCard.
 *
 * Guards:
 *   - Sender ≠ recipient
 *   - 30-day re-request block after a decline (same sender/recipient)
 *   - One active pending intro per (listing, sender) — returns the
 *     existing thread id so the client can nav to the pending state
 *     instead of creating a duplicate.
 */
export async function POST(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    listingId?: string;
    message?: string;
    startDate?: string;
    endDate?: string;
  } | null;

  if (!body?.listingId) {
    return Response.json({ error: "listingId required" }, { status: 400 });
  }
  const message = (body.message ?? "").trim();
  if (message.length < 20) {
    return Response.json(
      { error: "Please write at least 20 characters." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: viewer } = await supabase
    .from("users")
    .select("id, name")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!viewer) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, host_id")
    .eq("id", body.listingId)
    .maybeSingle();
  if (!listing) {
    return Response.json({ error: "Listing not found" }, { status: 404 });
  }
  const recipientId = listing.host_id as string;
  if (viewer.id === recipientId) {
    return Response.json({ error: "Can't intro yourself" }, { status: 400 });
  }

  // 30-day re-request block: if the same sender→recipient pair has a
  // declined intro within the last 30 days, refuse. Listing-agnostic
  // — a decline on one listing blocks re-requests across the host's
  // listings too (the decision is about the person, not the property).
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentDecline } = await supabase
    .from("message_threads")
    .select("id, intro_decided_at")
    .eq("intro_sender_id", viewer.id)
    .eq("intro_recipient_id", recipientId)
    .eq("intro_status", "declined")
    .gte("intro_decided_at", cutoff)
    .order("intro_decided_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recentDecline) {
    return Response.json(
      {
        error:
          "This person isn't available to new intros right now. Try again in a few weeks.",
      },
      { status: 429 }
    );
  }

  // Reuse a still-pending intro thread for the same (listing, sender)
  // pair so the client flips into the existing pending state instead
  // of creating a duplicate.
  const { data: existing } = await supabase
    .from("message_threads")
    .select("id, intro_status")
    .eq("listing_id", body.listingId)
    .eq("guest_id", viewer.id)
    .eq("host_id", recipientId)
    .maybeSingle();

  let threadId: string;
  if (existing) {
    threadId = existing.id;
    // If the existing thread is an intro that's still pending, just
    // return it — no new card, no duplicate notification.
    if (existing.intro_status === "pending") {
      return Response.json({ threadId, alreadyPending: true });
    }
    // Otherwise repoint the thread into a new intro request.
    await supabase
      .from("message_threads")
      .update({
        is_intro_request: true,
        intro_sender_id: viewer.id,
        intro_recipient_id: recipientId,
        intro_status: "pending",
        intro_message: message,
        intro_start_date: body.startDate ?? null,
        intro_end_date: body.endDate ?? null,
        intro_decided_at: null,
      })
      .eq("id", threadId);
  } else {
    const { data: created, error: createErr } = await supabase
      .from("message_threads")
      .insert({
        listing_id: body.listingId,
        guest_id: viewer.id,
        host_id: recipientId,
        is_intro_request: true,
        intro_sender_id: viewer.id,
        intro_recipient_id: recipientId,
        intro_status: "pending",
        intro_message: message,
        intro_start_date: body.startDate ?? null,
        intro_end_date: body.endDate ?? null,
      })
      .select("id")
      .single();
    if (createErr || !created) {
      console.error("request-intro thread create error", createErr);
      return Response.json(
        { error: "Couldn't start conversation" },
        { status: 500 }
      );
    }
    threadId = created.id;
  }

  // Post the IntroRequestCard anchor message. The card itself reads
  // intro_message / intro_start_date / intro_end_date off the thread
  // row, so this content is just the prefix.
  const { error: cardErr } = await supabase.from("messages").insert({
    thread_id: threadId,
    sender_id: null,
    content: INTRO_REQUEST_PREFIX,
    is_system: true,
  });
  if (cardErr) {
    console.error("request-intro card insert error", cardErr);
    return Response.json({ error: "Couldn't send request" }, { status: 500 });
  }

  const previewText = `Intro request · ${listing.title}`;
  await supabase
    .from("message_threads")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: previewText,
      host_unread_count: 1,
    })
    .eq("id", threadId);

  await emailNewMessage({
    recipientId,
    senderName: viewer.name || "Someone",
    threadId,
    preview: message.slice(0, 200),
    listingTitle: `Intro request · ${listing.title}`,
  });

  return Response.json({ threadId });
}
