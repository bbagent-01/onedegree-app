export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import {
  PAYMENT_CLAIMED_PREFIX,
  paymentClaimedMessage,
} from "@/lib/structured-messages";

/**
 * POST /api/payment-events/[id]/unmark-paid
 *
 * Guest-only. Reverts a payment_events row from `claimed` back to
 * `scheduled` — escape hatch for an accidental "Mark as paid".
 * Allowed ONLY when the host hasn't confirmed yet; once the host
 * clicks Confirm received, the payment is locked and the guest
 * has to coordinate directly.
 *
 * Also deletes the payment_claimed system message from the thread
 * so the timeline doesn't carry a stale "I paid X" entry — the
 * original payment_due message is still in the thread and will
 * re-render its due card once the status flips back to scheduled.
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
    .select("id, guest_id, listing_id")
    .eq("id", event.contact_request_id)
    .maybeSingle();
  if (!request) {
    return Response.json({ error: "Reservation not found" }, { status: 404 });
  }
  if (request.guest_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  if (event.status !== "claimed") {
    return Response.json(
      {
        error:
          event.status === "confirmed"
            ? "Host already confirmed — can't unmark"
            : `Cannot unmark — payment is ${event.status}`,
        status: event.status,
      },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("payment_events")
    .update({ status: "scheduled", claimed_at: null, method: null })
    .eq("id", id)
    .eq("status", "claimed"); // concurrency guard
  if (error) {
    return Response.json(
      { error: "Failed to save", detail: error.message },
      { status: 500 }
    );
  }

  // Delete the payment_claimed message so the thread renders the
  // original payment_due card again instead of a phantom "I paid"
  // marker. Uses the known content string for a targeted delete.
  try {
    const { data: thread } = await supabase
      .from("message_threads")
      .select("id")
      .eq("listing_id", request.listing_id)
      .eq("guest_id", request.guest_id)
      .maybeSingle();
    if (thread) {
      const claimedContent = paymentClaimedMessage(event.id);
      await supabase
        .from("messages")
        .delete()
        .eq("thread_id", thread.id)
        .eq("content", claimedContent);
      // Defensive: also sweep any other payment_claimed messages
      // for this event (shouldn't exist, but cheap insurance).
      await supabase
        .from("messages")
        .delete()
        .eq("thread_id", thread.id)
        .like("content", `${PAYMENT_CLAIMED_PREFIX}${event.id}%`);
    }
  } catch (e) {
    console.error("[unmark-paid] thread message delete failed:", e);
  }

  return Response.json({ ok: true, status: "scheduled" });
}
