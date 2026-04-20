export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { emailNewMessage } from "@/lib/email";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * POST /api/trust/request-intro
 * Body: { listingId, connectorId?, hostName?, listingTitle?, message? }
 *
 * Two modes based on whether connectorId is provided:
 *
 *   Connector route  — opens a thread between viewer and the mutual
 *   connector, pinned to the listing. The connector decides to
 *   forward or decline. sender_anonymous = false (connector already
 *   knows the viewer — they vouched for them).
 *
 *   Anonymous route  — no mutual exists. Opens a thread directly to
 *   the host with sender_anonymous = true and is_intro_request = true.
 *   The host sees an anonymized sender label; viewer's identity is
 *   revealed once the host replies (thread then promotes to Messages).
 */
export async function POST(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    listingId?: string;
    connectorId?: string;
    hostName?: string;
    listingTitle?: string;
    message?: string;
  } | null;

  if (!body?.listingId) {
    return Response.json({ error: "listingId required" }, { status: 400 });
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
  if (viewer.id === listing.host_id) {
    return Response.json({ error: "Can't intro yourself" }, { status: 400 });
  }

  // Decide which side of the thread is guest vs. host slot.
  //
  // Connector route: thread is viewer ↔ connector (connector sits in
  //   the host_id slot by convention — it's the conversation surface).
  // Anonymous route: thread is viewer ↔ actual host. is_intro_request
  //   hides the sender identity until the host replies.
  const isAnonymous = !body.connectorId;
  const otherPartyId = body.connectorId ?? listing.host_id;
  if (viewer.id === otherPartyId) {
    return Response.json({ error: "Can't intro yourself" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("message_threads")
    .select("id, is_intro_request, intro_promoted_at")
    .eq("listing_id", body.listingId)
    .eq("guest_id", viewer.id)
    .eq("host_id", otherPartyId)
    .maybeSingle();

  let threadId: string;
  if (existing) {
    threadId = existing.id;
  } else {
    const { data: created, error: createErr } = await supabase
      .from("message_threads")
      .insert({
        listing_id: body.listingId,
        guest_id: viewer.id,
        host_id: otherPartyId,
        is_intro_request: true,
        sender_anonymous: isAnonymous,
        intro_connector_id: body.connectorId ?? null,
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

  const hostName = body.hostName || "the host";
  const title = body.listingTitle || listing.title;
  const content =
    body.message?.trim() ||
    (isAnonymous
      ? `Hi! I saw your listing "${title}" on 1° B&B and would love to connect. This is an introduction request — my identity stays private until you reply.`
      : `Hi! I'd like to be introduced to ${hostName} about their listing "${title}" on 1° B&B. Since you know them, could you pass this along?`);

  const { error: msgErr } = await supabase.from("messages").insert({
    thread_id: threadId,
    sender_id: viewer.id,
    content,
    is_system: false,
  });
  if (msgErr) {
    console.error("request-intro message insert error", msgErr);
    return Response.json({ error: "Couldn't send message" }, { status: 500 });
  }

  await supabase
    .from("message_threads")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: content.slice(0, 240),
      host_unread_count: 1,
    })
    .eq("id", threadId);

  await emailNewMessage({
    recipientId: otherPartyId,
    senderName: isAnonymous ? "Someone on 1° B&B" : viewer.name || "Someone",
    threadId,
    preview: content.slice(0, 240),
    listingTitle: `Introduction request · ${title}`,
  });

  return Response.json({ threadId });
}
