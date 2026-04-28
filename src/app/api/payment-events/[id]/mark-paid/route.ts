export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { paymentClaimedMessage } from "@/lib/structured-messages";

/**
 * POST /api/payment-events/[id]/mark-paid
 *
 * Guest-only. Transitions a payment_events row from `scheduled`
 * to `claimed`. Idempotent where it needs to be: calling on an
 * already-claimed row returns 409. Also posts a structured
 * `payment_claimed` system message into the thread so the host
 * sees a confirmation card.
 *
 * Request body:
 *   { method?: string }   // venmo | zelle | paypal | wise | offline_other
 */
export async function POST(
  req: Request,
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
    .select(
      "id, contact_request_id, status, amount_cents, schedule_index"
    )
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

  if (event.status !== "scheduled") {
    return Response.json(
      {
        error: `Cannot mark paid — payment is ${event.status}`,
        status: event.status,
      },
      { status: 409 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    method?: string;
  };
  const allowedMethods = new Set([
    "venmo",
    "zelle",
    "paypal",
    "wise",
    "offline_other",
  ]);
  const method =
    body.method && allowedMethods.has(body.method)
      ? body.method
      : null;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("payment_events")
    .update({
      status: "claimed",
      method,
      claimed_at: now,
    })
    .eq("id", id)
    .eq("status", "scheduled"); // concurrency guard
  if (error) {
    return Response.json(
      { error: "Failed to save", detail: error.message },
      { status: 500 }
    );
  }

  // Post the claimed card into the thread. Best-effort — don't
  // block the transition if the thread lookup or insert hiccups.
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
        content: paymentClaimedMessage(event.id),
        is_system: true,
      });
    }
  } catch (e) {
    console.error("[mark-paid] thread message insert failed:", e);
  }

  return Response.json({ ok: true, status: "claimed", claimed_at: now });
}
