export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * POST /api/trust/intro-request/[threadId]/ignore
 *
 * Recipient-only action. Marks the intro as ignored — the thread
 * stays in the recipient's Intros tab (they can come back to it later)
 * but the sender's pill state now treats the request as a dead-end
 * "no decision" (same UI as pending, no pressure to re-request).
 *
 * No system message is posted — ignoring is a private non-action.
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
  if (thread.intro_status === "ignored") {
    return Response.json({ ok: true, alreadyIgnored: true });
  }

  const now = new Date().toISOString();
  await supabase
    .from("message_threads")
    .update({
      intro_status: "ignored",
      intro_decided_at: now,
    })
    .eq("id", threadId);

  return Response.json({ ok: true });
}
