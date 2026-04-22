export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { RESERVATION_DECLINED_PREFIX } from "@/lib/structured-messages";

/**
 * POST /api/contact-requests/[id]/decline-reservation
 *
 * Host-only endpoint for withdrawing an already-approved reservation
 * before the guest has accepted the terms. A host-side analogue of
 * decline-terms — same "cancelled + terms_declined_{at,by}" stamp
 * pattern so the thread card and timeline render a consistent
 * declined state regardless of which party pulled the plug.
 *
 * Once the guest has accepted terms the reservation is locked in
 * and this endpoint 400s — use the cancel flow instead.
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
  if (request.host_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }
  if (request.status !== "accepted") {
    return Response.json(
      { error: "Only accepted reservations can be withdrawn" },
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
      terms_declined_by: "host",
      terms_decline_reason: reason,
      cancelled_at: now,
      cancelled_by: currentUser.id,
    })
    .eq("id", id);
  if (error) {
    console.error("[decline-reservation] update failed:", error);
    return Response.json(
      { error: "Failed to save", detail: error.message },
      { status: 500 }
    );
  }

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
      content: RESERVATION_DECLINED_PREFIX,
      is_system: true,
    });
  }

  return Response.json({ ok: true, terms_declined_at: now });
}
