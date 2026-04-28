export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { TERMS_EDITS_REQUESTED_PREFIX } from "@/lib/structured-messages";

/**
 * POST /api/contact-requests/[id]/request-edits (S7, Task 4)
 *
 * Guest-only action on a pending terms card. Does NOT change status
 * — the card stays offered/pending. Stamps edits_requested_at +
 * edits_requested_by and posts a structured anchor message so the
 * thread timeline flags "edits requested" in line with the guest's
 * follow-up reply.
 *
 * The host's Edit path (PATCH in edit mode) clears edits_requested_*
 * automatically, closing the loop.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!currentUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const { data: request } = await supabase
    .from("contact_requests")
    .select(
      "id, guest_id, host_id, listing_id, status, terms_accepted_at, terms_declined_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (!request) {
    return Response.json({ error: "Request not found" }, { status: 404 });
  }
  if (request.guest_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }
  // Gate on the pending-offer lifecycle state only. Once terms are
  // accepted or declined the card is settled and edit-request has no
  // meaning.
  if (
    request.status !== "accepted" ||
    request.terms_accepted_at ||
    request.terms_declined_at
  ) {
    return Response.json(
      { error: "Terms are no longer pending" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("contact_requests")
    .update({
      edits_requested_at: now,
      edits_requested_by: currentUser.id,
    })
    .eq("id", id);
  if (error) {
    console.error("[request-edits] update failed:", error);
    return Response.json(
      { error: "Failed to save", detail: error.message },
      { status: 500 }
    );
  }

  // Anchor the ask in the thread timeline. The host's card sprouts
  // an amber chip + accented Edit button via the new booking fields;
  // this message gives the guest's reply a logical "start-of-ask"
  // cursor alongside the free-text message they're about to send.
  const { data: thread } = await supabase
    .from("message_threads")
    .select("id")
    .eq("listing_id", request.listing_id)
    .eq("guest_id", request.guest_id)
    .maybeSingle();
  if (thread) {
    await supabase.from("messages").insert({
      thread_id: thread.id,
      sender_id: null,
      content: TERMS_EDITS_REQUESTED_PREFIX,
      is_system: true,
    });
  }

  return Response.json({ ok: true, edits_requested_at: now });
}
