export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { INTRO_REVOKED_PREFIX } from "@/lib/structured-messages";

/**
 * POST /api/trust/intro-request/[threadId]/revoke
 * Body: { reason?: string }
 *
 * Recipient-only action. Flips revoked_at on BOTH grant rows tied to
 * this intro thread — tearing down the bidirectional access in one
 * shot — and posts an "Access ended" system message so both sides
 * see the state change in the thread timeline.
 *
 * The optional `reason` is stored on both rows for audit. It's not
 * exposed to the sender in UI (recipient-private), but keeping the
 * field attached to both directions keeps the history symmetric.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ threadId: string }> }
) {
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { threadId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    reason?: string;
  } | null;
  const reason = body?.reason?.trim() || null;

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
      "id, intro_sender_id, intro_recipient_id, intro_status, is_intro_request"
    )
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }
  if (thread.intro_recipient_id !== viewer.id) {
    return Response.json(
      { error: "Only the recipient can revoke this access." },
      { status: 403 }
    );
  }
  if (thread.intro_status !== "accepted") {
    return Response.json(
      { error: "This intro isn't currently accepted." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { error: revokeErr } = await supabase
    .from("listing_access_grants")
    .update({ revoked_at: now, revoked_reason: reason })
    .eq("intro_thread_id", threadId)
    .is("revoked_at", null);
  if (revokeErr) {
    console.error("revoke error", revokeErr);
    return Response.json(
      { error: "Couldn't revoke access." },
      { status: 500 }
    );
  }

  // Keep the thread flagged as an intro (recipient's Intros tab)
  // so they can see the historical card, but flip status so the
  // sender's pill reads "Access ended" and re-request UI isn't
  // offered until the grants are definitively gone.
  await supabase
    .from("message_threads")
    .update({ intro_status: "declined", intro_decided_at: now })
    .eq("id", threadId);

  await supabase.from("messages").insert({
    thread_id: threadId,
    sender_id: null,
    content: INTRO_REVOKED_PREFIX,
    is_system: true,
  });
  await supabase
    .from("message_threads")
    .update({
      last_message_at: now,
      last_message_preview: "Access ended",
      guest_unread_count: 1,
    })
    .eq("id", threadId);

  return Response.json({ ok: true });
}
