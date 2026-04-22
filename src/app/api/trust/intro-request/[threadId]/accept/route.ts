export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { INTRO_ACCEPTED_PREFIX } from "@/lib/structured-messages";

/**
 * POST /api/trust/intro-request/[threadId]/accept
 *
 * Recipient-only action. Transitions the intro thread from pending
 * (or replied / ignored) to accepted, issues two listing_access_grants
 * rows — one in each direction — and posts a confirmation system
 * message so both sides see "you can both now see each other's full
 * listings."
 *
 * Bidirectional grant is the whole point: the recipient said yes, so
 * the sender gets full-listing access to the recipient's places AND
 * the recipient gets full-listing access to the sender's. Scoped to
 * this pair only, revocable by the recipient via the same card.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ threadId: string }> }
) {
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { threadId } = await ctx.params;
  if (!threadId) {
    return Response.json({ error: "threadId required" }, { status: 400 });
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
  if (!thread.is_intro_request) {
    return Response.json(
      { error: "Not an intro thread" },
      { status: 400 }
    );
  }
  if (thread.intro_recipient_id !== viewer.id) {
    return Response.json(
      { error: "Only the recipient can accept this intro." },
      { status: 403 }
    );
  }
  if (thread.intro_status === "accepted") {
    return Response.json({ ok: true, alreadyAccepted: true });
  }

  const senderId = thread.intro_sender_id as string;
  const recipientId = thread.intro_recipient_id as string;
  const now = new Date().toISOString();

  // Flip the thread first so concurrent writes settle on a single
  // row state. The grants table has a UNIQUE (grantor, grantee)
  // WHERE revoked_at IS NULL constraint; upsert-ish via insert-on-
  // conflict-do-nothing keeps re-clicks safe.
  //
  // Accept also moves the thread OUT of the Intros tab into the main
  // inbox — once both sides have an active grant the thread is a
  // normal conversation for day-to-day messaging. The recipient can
  // still revoke access from the (persistent) IntroRequestCard.
  await supabase
    .from("message_threads")
    .update({
      intro_status: "accepted",
      intro_decided_at: now,
      is_intro_request: false,
    })
    .eq("id", threadId);

  const grantRows = [
    {
      grantor_id: recipientId,
      grantee_id: senderId,
      intro_thread_id: threadId,
      granted_at: now,
    },
    {
      grantor_id: senderId,
      grantee_id: recipientId,
      intro_thread_id: threadId,
      granted_at: now,
    },
  ];
  // `onConflict` would need a unique-constraint name; the partial
  // unique index (WHERE revoked_at IS NULL) isn't a named constraint,
  // so we do a pre-check instead. Any row that already exists as
  // active, we skip; anything revoked gets a fresh insert alongside.
  for (const row of grantRows) {
    const { data: active } = await supabase
      .from("listing_access_grants")
      .select("id")
      .eq("grantor_id", row.grantor_id)
      .eq("grantee_id", row.grantee_id)
      .is("revoked_at", null)
      .maybeSingle();
    if (active) continue;
    const { error } = await supabase
      .from("listing_access_grants")
      .insert(row);
    if (error) {
      console.error("grant insert error", error);
      return Response.json(
        { error: "Couldn't finalize intro." },
        { status: 500 }
      );
    }
  }

  // Post a confirmation system message. Both sides see the card; copy
  // is neutral (recipient_first accepted …).
  await supabase.from("messages").insert({
    thread_id: threadId,
    sender_id: null,
    content: INTRO_ACCEPTED_PREFIX,
    is_system: true,
  });
  await supabase
    .from("message_threads")
    .update({
      last_message_at: now,
      last_message_preview: "Intro accepted",
      guest_unread_count: 1,
    })
    .eq("id", threadId);

  return Response.json({ ok: true });
}
