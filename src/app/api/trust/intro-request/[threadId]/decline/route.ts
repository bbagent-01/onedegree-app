export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { INTRO_DECLINED_PREFIX } from "@/lib/structured-messages";

/**
 * POST /api/trust/intro-request/[threadId]/decline
 *
 * Recipient-only action. Transitions the intro thread to declined,
 * sets intro_decided_at (powers the 30-day re-request block), posts
 * a soft system message, and ensures the thread leaves the recipient's
 * Intros tab by unsetting is_intro_request.
 *
 * Note: we DON'T tell the sender any reason. Copy is intentionally
 * neutral ("isn't able to engage right now") so declines never feel
 * like rejections.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ threadId: string }> }
) {
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { threadId } = await ctx.params;
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
    .select("id, intro_recipient_id, intro_status, is_intro_request")
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }
  if (!thread.is_intro_request) {
    return Response.json({ error: "Not an intro thread" }, { status: 400 });
  }
  if (thread.intro_recipient_id !== viewer.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (thread.intro_status === "declined") {
    return Response.json({ ok: true, alreadyDeclined: true });
  }

  const now = new Date().toISOString();
  // Keep is_intro_request=true so the thread stays in the recipient's
  // Intros tab — declines aren't permanent. The recipient can reopen
  // the intro from the same card, and in the meantime the sender is
  // blocked from posting new messages (enforced in the messages POST
  // route by intro_status).
  await supabase
    .from("message_threads")
    .update({
      intro_status: "declined",
      intro_decided_at: now,
    })
    .eq("id", threadId);

  await supabase.from("messages").insert({
    thread_id: threadId,
    sender_id: null,
    content: INTRO_DECLINED_PREFIX,
    is_system: true,
  });
  await supabase
    .from("message_threads")
    .update({
      last_message_at: now,
      last_message_preview: "Intro declined",
      guest_unread_count: 1,
    })
    .eq("id", threadId);

  return Response.json({ ok: true });
}
