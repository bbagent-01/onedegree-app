export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { TERMS_DECLINED_PREFIX } from "@/lib/structured-messages";

/**
 * POST /api/contact-requests/[id]/decline-terms
 *
 * Guest-only endpoint invoked from TermsOfferedCard when the guest
 * decides not to accept the host's offered terms. Transitions status
 * from 'accepted' → 'cancelled' (so the row drops out of the host's
 * upcoming pile) and stamps terms_declined_at / terms_declined_by
 * so the card and timeline can distinguish this from a pre-terms
 * host decline.
 *
 * Not idempotent safe on double-click: a second call against an
 * already-cancelled row 400s. The UI debounces via submitting state.
 *
 * Parties can still message each other — declining terms doesn't
 * archive the thread. Either side may re-negotiate by the guest
 * sending a new reservation request (separate row).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    reason?: string | null;
  };
  const reason =
    typeof body.reason === "string" && body.reason.trim().length
      ? body.reason.trim().slice(0, 500)
      : null;

  const supabase = getSupabaseAdmin();
  const { data: currentUser } = await supabase
    .from("users")
    .select("id, name")
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
  if (request.status !== "accepted") {
    return Response.json(
      { error: "Only accepted reservations can have terms declined" },
      { status: 400 }
    );
  }
  if (request.terms_accepted_at) {
    return Response.json(
      { error: "Terms already accepted — cancel the reservation instead" },
      { status: 400 }
    );
  }
  if (request.terms_declined_at) {
    return Response.json(
      { error: "Already declined" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("contact_requests")
    .update({
      status: "cancelled",
      terms_declined_at: now,
      terms_declined_by: "guest",
      terms_decline_reason: reason,
      cancelled_at: now,
      cancelled_by: currentUser.id,
    })
    .eq("id", id);
  if (error) {
    console.error("[decline-terms] update failed:", error);
    return Response.json(
      { error: "Failed to save", detail: error.message },
      { status: 500 }
    );
  }

  // System message so both sides see the decline in the thread.
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
      content: TERMS_DECLINED_PREFIX,
      is_system: true,
    });
  }

  return Response.json({ ok: true, terms_declined_at: now });
}
