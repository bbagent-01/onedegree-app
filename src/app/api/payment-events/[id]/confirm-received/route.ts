export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { paymentConfirmedMessage } from "@/components/booking/ThreadTermsCards";

/**
 * POST /api/payment-events/[id]/confirm-received
 *
 * Host-only. Transitions a payment_events row from `claimed` to
 * `confirmed`. Returns 409 if the row isn't in the expected state.
 * Posts a `payment_confirmed` system message once the transition
 * succeeds.
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

  const { data: event } = await supabase
    .from("payment_events")
    .select("id, contact_request_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!event) {
    return Response.json({ error: "Payment event not found" }, { status: 404 });
  }

  const { data: request } = await supabase
    .from("contact_requests")
    .select("id, host_id, guest_id, listing_id")
    .eq("id", event.contact_request_id)
    .maybeSingle();
  if (!request) {
    return Response.json({ error: "Reservation not found" }, { status: 404 });
  }
  if (request.host_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  if (event.status !== "claimed") {
    return Response.json(
      {
        error:
          event.status === "confirmed"
            ? "Already confirmed"
            : `Cannot confirm — payment is ${event.status}`,
        status: event.status,
      },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("payment_events")
    .update({ status: "confirmed", confirmed_at: now })
    .eq("id", id)
    .eq("status", "claimed"); // concurrency guard
  if (error) {
    return Response.json(
      { error: "Failed to save", detail: error.message },
      { status: 500 }
    );
  }

  try {
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
        content: paymentConfirmedMessage(event.id),
        is_system: true,
      });
    }
  } catch (e) {
    console.error("[confirm-received] thread message insert failed:", e);
  }

  return Response.json({ ok: true, status: "confirmed", confirmed_at: now });
}
