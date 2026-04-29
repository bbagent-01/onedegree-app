export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { emailNewMessage } from "@/lib/email";
import { effectiveAuth } from "@/lib/impersonation/session";
import { rateLimitOr429 } from "@/lib/rate-limit";
import { blockIfDemoMix } from "@/lib/demo-guard";

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

  const blocked = await rateLimitOr429("dmMessage", userId);
  if (blocked) return blocked;

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
      "id, guest_id, host_id, listing_id, intro_sender_id, intro_status"
    )
    .eq("id", threadId)
    .single();
  if (!thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }
  if (thread.guest_id !== currentUser.id && thread.host_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const otherParticipantId =
    thread.guest_id === currentUser.id ? thread.host_id : thread.guest_id;
  const demoBlock = await blockIfDemoMix(currentUser.id, otherParticipantId);
  if (demoBlock) return demoBlock;

  // Sender-side message gate: once an intro has been declined, the
  // sender can't keep posting. Only the recipient can keep the
  // conversation going (or reopen the intro from the card). This
  // stops a sender from lobbying through the thread after a no.
  if (
    thread.intro_status === "declined" &&
    thread.intro_sender_id === currentUser.id
  ) {
    return Response.json(
      {
        error:
          "This intro was declined. Only the recipient can continue the conversation.",
      },
      { status: 403 }
    );
  }

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
