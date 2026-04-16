export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { emailNewMessage } from "@/lib/email";

/**
 * POST /api/trust/request-intro
 * Body: { listingId, connectorId, hostName, listingTitle }
 *
 * Opens an "introduction request" conversation between the viewer and
 * one of their mutual connections. The connector is not the listing's
 * actual host, but the thread is pinned to the listing so both parties
 * have clear context. Pre-fills a polite intro request as the first
 * message. Returns the thread id.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    listingId?: string;
    connectorId?: string;
    hostName?: string;
    listingTitle?: string;
  } | null;

  if (!body?.listingId || !body?.connectorId) {
    return Response.json(
      { error: "listingId and connectorId required" },
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
  if (viewer.id === body.connectorId) {
    return Response.json({ error: "Can't intro yourself" }, { status: 400 });
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, host_id")
    .eq("id", body.listingId)
    .maybeSingle();
  if (!listing) {
    return Response.json({ error: "Listing not found" }, { status: 404 });
  }

  // Reuse existing thread between viewer and connector pinned to this
  // listing, otherwise create one. host_id holds the connector here —
  // the thread is the conversation surface, not a hosting claim.
  const { data: existing } = await supabase
    .from("message_threads")
    .select("id")
    .eq("listing_id", body.listingId)
    .eq("guest_id", viewer.id)
    .eq("host_id", body.connectorId)
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
        host_id: body.connectorId,
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

  const host = body.hostName || "the host";
  const title = body.listingTitle || listing.title;
  const content = `Hi! I'm interested in "${title}" on 1° B&B, hosted by ${host}. Since you know them, could you introduce us?`;

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

  // Bump the host_unread_count so the connector sees the request.
  await supabase
    .from("message_threads")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: content.slice(0, 240),
      host_unread_count: 1,
    })
    .eq("id", threadId);

  // Best-effort email notification.
  await emailNewMessage({
    recipientId: body.connectorId,
    senderName: viewer.name || "Someone",
    threadId,
    preview: content.slice(0, 240),
    listingTitle: `Introduction request · ${title}`,
  });

  return Response.json({ threadId });
}
