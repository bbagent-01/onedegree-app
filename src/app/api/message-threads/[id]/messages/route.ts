export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { emailNewMessage } from "@/lib/email";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * POST /api/message-threads/[id]/messages
 * Body: { content: string }
 * Sends a message into the thread. Verifies the current user is a participant.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: threadId } = await params;
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

  const { data: thread } = await supabase
    .from("message_threads")
    .select(
      "id, guest_id, host_id, listing_id, is_intro_request, intro_promoted_at"
    )
    .eq("id", threadId)
    .single();
  if (!thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }
  if (thread.guest_id !== currentUser.id && thread.host_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  // Promotion: when the recipient (host-slot) replies to a pending
  // intro request, the thread graduates to a normal conversation and
  // the sender's identity is revealed.
  const isRecipientReply =
    thread.is_intro_request &&
    !thread.intro_promoted_at &&
    thread.host_id === currentUser.id;

  const body = (await req.json().catch(() => null)) as {
    content?: string;
  } | null;
  const content = body?.content?.trim();
  if (!content) {
    return Response.json({ error: "Empty message" }, { status: 400 });
  }
  if (content.length > 2000) {
    return Response.json({ error: "Message too long" }, { status: 400 });
  }

  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      thread_id: threadId,
      sender_id: currentUser.id,
      content,
      is_system: false,
    })
    .select("id, thread_id, sender_id, content, is_system, created_at")
    .single();

  if (error) {
    console.error("Message insert error:", error);
    return Response.json({ error: "Failed to send" }, { status: 500 });
  }

  if (isRecipientReply) {
    await supabase
      .from("message_threads")
      .update({ intro_promoted_at: new Date().toISOString() })
      .eq("id", threadId);
  }

  // Fire-and-forget transactional email to the other participant
  const recipientId =
    thread.guest_id === currentUser.id ? thread.host_id : thread.guest_id;
  const [{ data: senderRow }, { data: listingRow }] = await Promise.all([
    supabase.from("users").select("name").eq("id", currentUser.id).maybeSingle(),
    supabase
      .from("listings")
      .select("title")
      .eq("id", thread.listing_id)
      .maybeSingle(),
  ]);
  await emailNewMessage({
    recipientId,
    senderName: senderRow?.name || "Someone",
    threadId,
    preview: content.slice(0, 240),
    listingTitle: listingRow?.title || "your conversation",
  });

  return Response.json({ message: inserted });
}
