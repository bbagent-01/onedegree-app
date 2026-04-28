export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * POST /api/trust/intro-request/[threadId]/reopen
 *
 * Recipient-only action. Undoes a prior decline — flips
 * intro_status back to 'pending' and clears intro_decided_at so the
 * 30-day re-request block also clears (the block keys off
 * status='declined' + decided_at).
 *
 * The sender doesn't see a reopen system message; this is intended
 * as a quiet "changed my mind" action from the recipient's side.
 * When the recipient next posts a message the sender will see the
 * thread light up as if a normal reply arrived.
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
    .select("id, intro_recipient_id, intro_status")
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }
  if (thread.intro_recipient_id !== viewer.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (thread.intro_status !== "declined") {
    return Response.json(
      { error: "This intro isn't currently declined." },
      { status: 400 }
    );
  }

  await supabase
    .from("message_threads")
    .update({
      intro_status: "pending",
      intro_decided_at: null,
    })
    .eq("id", threadId);

  return Response.json({ ok: true });
}
