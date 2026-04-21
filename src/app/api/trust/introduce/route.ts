export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { emailNewMessage } from "@/lib/email";
import { effectiveAuth } from "@/lib/impersonation/session";
import { introMadeMessage } from "@/lib/structured-messages";

/**
 * POST /api/trust/introduce
 * Body: { connectorThreadId }
 *
 * Called by a connector viewing an intro-request card in their
 * thread. Creates (or reuses) a guest ↔ host thread pinned to the
 * same listing, posts a structured intro_made card to that thread so
 * the host sees a notification-style card naming the connector, and
 * promotes the connector thread out of the intro-request pool.
 *
 * Guard: only the thread's recorded `intro_connector_id` — i.e. the
 * connector — can forward the intro.
 */
export async function POST(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    connectorThreadId?: string;
  } | null;
  if (!body?.connectorThreadId) {
    return Response.json(
      { error: "connectorThreadId required" },
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

  const { data: connectorThread } = await supabase
    .from("message_threads")
    .select(
      "id, listing_id, guest_id, host_id, intro_connector_id, is_intro_request, intro_promoted_at"
    )
    .eq("id", body.connectorThreadId)
    .maybeSingle();
  if (!connectorThread) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }
  if (connectorThread.intro_connector_id !== viewer.id) {
    return Response.json(
      { error: "Only the connector can forward this intro" },
      { status: 403 }
    );
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, host_id")
    .eq("id", connectorThread.listing_id)
    .maybeSingle();
  if (!listing) {
    return Response.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.host_id === connectorThread.guest_id) {
    return Response.json(
      { error: "Guest and host are the same user" },
      { status: 400 }
    );
  }

  // Find or create the guest ↔ host thread on this listing.
  let targetThreadId: string;
  const { data: existing } = await supabase
    .from("message_threads")
    .select("id, is_intro_request, intro_promoted_at, sender_anonymous")
    .eq("listing_id", listing.id)
    .eq("guest_id", connectorThread.guest_id)
    .eq("host_id", listing.host_id)
    .maybeSingle();

  if (existing) {
    targetThreadId = existing.id;
    // Promote out of intro-request mode now that the connector has
    // personally made the introduction.
    const patch: Record<string, unknown> = {};
    if (existing.is_intro_request && !existing.intro_promoted_at) {
      patch.intro_promoted_at = new Date().toISOString();
    }
    if (existing.sender_anonymous) patch.sender_anonymous = false;
    if (Object.keys(patch).length > 0) {
      await supabase
        .from("message_threads")
        .update(patch)
        .eq("id", existing.id);
    }
  } else {
    const { data: created, error: createErr } = await supabase
      .from("message_threads")
      .insert({
        listing_id: listing.id,
        guest_id: connectorThread.guest_id,
        host_id: listing.host_id,
        is_intro_request: false,
        sender_anonymous: false,
        intro_connector_id: viewer.id,
      })
      .select("id")
      .single();
    if (createErr || !created) {
      console.error("introduce thread create error", createErr);
      return Response.json(
        { error: "Couldn't open intro thread" },
        { status: 500 }
      );
    }
    targetThreadId = created.id;
  }

  // Drop the structured intro_made card into the new thread. Both
  // guest and host see the card with the connector's name; the card
  // itself handles role-specific copy.
  const cardContent = introMadeMessage(viewer.id);
  await supabase.from("messages").insert({
    thread_id: targetThreadId,
    sender_id: null,
    content: cardContent,
    is_system: true,
  });

  const preview = `${viewer.name || "A mutual connection"} introduced you`;
  await supabase
    .from("message_threads")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: preview,
      guest_unread_count: 1,
      host_unread_count: 1,
    })
    .eq("id", targetThreadId);

  // Promote the original connector thread so it leaves the Intro
  // Requests inbox.
  await supabase
    .from("message_threads")
    .update({ intro_promoted_at: new Date().toISOString() })
    .eq("id", connectorThread.id);

  await emailNewMessage({
    recipientId: listing.host_id,
    senderName: viewer.name || "A mutual connection",
    threadId: targetThreadId,
    preview,
    listingTitle: `Introduction · ${listing.title}`,
  });

  return Response.json({ threadId: targetThreadId });
}
