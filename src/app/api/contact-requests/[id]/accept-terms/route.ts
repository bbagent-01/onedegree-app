export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { TERMS_ACCEPTED_PREFIX } from "@/components/booking/ThreadTermsCards";

/**
 * POST /api/contact-requests/[id]/accept-terms
 *
 * Guest-only endpoint that stamps `terms_accepted_at` on an
 * accepted reservation. Reservation must already be in "accepted"
 * state — before that there's no snapshot to accept. Idempotent:
 * if already accepted, we don't overwrite the timestamp.
 *
 * Not a legal gate — the platform never enforces contracts — but
 * it lets both sides share a common timestamp for when the terms
 * were acknowledged.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

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
    .select("id, guest_id, listing_id, status, terms_accepted_at")
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
      { error: "Only accepted reservations can have terms acknowledged" },
      { status: 400 }
    );
  }
  if (request.terms_accepted_at) {
    return Response.json({
      ok: true,
      terms_accepted_at: request.terms_accepted_at,
      already: true,
    });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("contact_requests")
    .update({ terms_accepted_at: now })
    .eq("id", id);
  if (error) {
    return Response.json(
      { error: "Failed to save", detail: error.message },
      { status: 500 }
    );
  }

  // Post a structured terms_accepted system message so the thread
  // has a permanent record of the confirmation — and the renderer
  // can show the locked terms spelled out inline.
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
      content: TERMS_ACCEPTED_PREFIX,
      is_system: true,
    });
  }

  return Response.json({ ok: true, terms_accepted_at: now });
}
