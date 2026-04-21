export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

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
    .select("id, guest_id, status, terms_accepted_at")
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

  return Response.json({ ok: true, terms_accepted_at: now });
}
