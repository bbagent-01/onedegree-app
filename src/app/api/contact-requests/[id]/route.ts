export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { emailBookingConfirmed, emailBookingDeclined } from "@/lib/email";
import { effectiveAuth } from "@/lib/impersonation/session";

// PATCH: host responds to a contact request (accept/decline)
export async function PATCH(
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
    .single();
  if (!currentUser) return new Response("User not found", { status: 404 });

  // Verify this request belongs to the current user as host
  const { data: request } = await supabase
    .from("contact_requests")
    .select("id, host_id, guest_id, listing_id, check_in, check_out, status")
    .eq("id", id)
    .single();

  if (!request) {
    return Response.json({ error: "Request not found" }, { status: 404 });
  }

  if (request.host_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  if (request.status !== "pending") {
    return Response.json({ error: "Request already responded to" }, { status: 400 });
  }

  const body = await req.json();
  const { status, hostResponseMessage } = body;

  if (!status || !["accepted", "declined"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const { error } = await supabase
    .from("contact_requests")
    .update({
      status,
      host_response_message: hostResponseMessage || null,
      responded_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Contact request update error:", error);
    return new Response("Failed to update", { status: 500 });
  }

  // Post a system message into the thread (if one exists) so both sides see
  // the host's response in their inbox.
  const { data: thread } = await supabase
    .from("message_threads")
    .select("id")
    .eq("listing_id", request.listing_id)
    .eq("guest_id", request.guest_id)
    .maybeSingle();

  if (thread) {
    const verb = status === "accepted" ? "accepted" : "declined";
    const { data: hostRow } = await supabase
      .from("users")
      .select("name")
      .eq("id", request.host_id)
      .maybeSingle();
    const hostFirst = (hostRow?.name ?? "Host").split(" ")[0];

    await supabase.from("messages").insert({
      thread_id: thread.id,
      sender_id: null,
      content:
        status === "accepted"
          ? `Great news! ${hostFirst} accepted your request${request.check_in && request.check_out ? ` for ${request.check_in} to ${request.check_out}` : ""}.`
          : `${hostFirst} declined the reservation request.`,
      is_system: true,
    });

    if (status === "accepted") {
      // Off-platform payment follow-up. Purely informational — 1DB
      // never handles money, so the reminder lives in the thread
      // where the two parties are already coordinating.
      await supabase.from("messages").insert({
        thread_id: thread.id,
        sender_id: null,
        content:
          "💳 Arrange payment directly with your host. Most members use Venmo or Zelle. 1° B&B doesn't process payments.",
        is_system: true,
      });
    }

    if (hostResponseMessage && hostResponseMessage.trim()) {
      await supabase.from("messages").insert({
        thread_id: thread.id,
        sender_id: currentUser.id,
        content: hostResponseMessage.trim(),
        is_system: false,
      });
    }
  }

  // Auto-create a stay_confirmation row for accepted bookings so the guest
  // can leave a review after checkout. Idempotent — does nothing if a row
  // already exists for this contact_request.
  if (status === "accepted") {
    const { data: existingStay } = await supabase
      .from("stay_confirmations")
      .select("id")
      .eq("contact_request_id", id)
      .maybeSingle();
    if (!existingStay) {
      await supabase.from("stay_confirmations").insert({
        contact_request_id: id,
        listing_id: request.listing_id,
        host_id: request.host_id,
        guest_id: request.guest_id,
        check_in: request.check_in,
        check_out: request.check_out,
        host_confirmed: false,
        guest_confirmed: false,
      });
    }
  }

  // Fire-and-forget transactional email to the guest
  const { data: listingRow } = await supabase
    .from("listings")
    .select("id, title")
    .eq("id", request.listing_id)
    .maybeSingle();
  const { data: hostUser } = await supabase
    .from("users")
    .select("id, name")
    .eq("id", request.host_id)
    .maybeSingle();

  const emailPayload = {
    hostId: request.host_id,
    guestId: request.guest_id,
    guestName: "Guest",
    hostName: hostUser?.name || "Host",
    listingTitle: listingRow?.title || "Your trip",
    checkIn: request.check_in,
    checkOut: request.check_out,
    guestCount: 1,
    bookingId: id,
    hostResponseMessage: hostResponseMessage || null,
  };

  if (status === "accepted") {
    await emailBookingConfirmed(emailPayload);
  } else if (status === "declined") {
    await emailBookingDeclined(emailPayload);
  }

  return Response.json({ ok: true });
}
