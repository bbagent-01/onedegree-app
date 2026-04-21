export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { emailBookingConfirmed, emailBookingDeclined } from "@/lib/email";
import { effectiveAuth } from "@/lib/impersonation/session";
import {
  buildPolicyFromPreset,
  resolveEffectivePolicy,
  type CancellationApproach,
  type CancellationPreset,
} from "@/lib/cancellation";
import { TERMS_OFFERED_PREFIX } from "@/components/booking/ThreadTermsCards";

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
    .select(
      "id, host_id, guest_id, listing_id, check_in, check_out, status, total_estimate"
    )
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

  const body = (await req.json()) as {
    status?: string;
    hostResponseMessage?: string;
    /** Host's final price. Overrides the original total_estimate
     *  snapshot. Only applied on accept. */
    total_price?: number;
    /** Host's edited approach (installments | refunds). Optional
     *  — defaults to the listing→host inheritance chain. */
    cancellation_approach?: CancellationApproach;
    /** Host's edited preset (flexible | moderate | strict). When
     *  present with cancellation_approach, builds a fresh policy
     *  via buildPolicyFromPreset instead of resolving from
     *  defaults. */
    cancellation_preset?: Exclude<CancellationPreset, "custom">;
    /** Host-edited trip dates. Treated as a counter-offer — the
     *  original request's dates get overwritten on the same row.
     *  Only applied on accept. */
    check_in?: string;
    check_out?: string;
    /** Host-edited guest count. */
    guest_count?: number;
  };
  const { status, hostResponseMessage } = body;

  if (!status || !["accepted", "declined"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  // On accept, snapshot the effective cancellation policy onto the
  // contact_request so the terms are locked in at approval time.
  // Future edits to the host default or listing override won't move
  // the goalposts on an already-approved reservation.
  //
  // Host can also edit the approach + preset in the Review & send
  // modal; when those are provided, we build a fresh policy from the
  // preset template instead of walking the inheritance chain.
  let cancellationSnapshot: ReturnType<typeof resolveEffectivePolicy> | null =
    null;
  if (status === "accepted") {
    const hostEditedPolicy =
      body.cancellation_approach &&
      body.cancellation_preset &&
      (body.cancellation_approach === "installments" ||
        body.cancellation_approach === "refunds") &&
      (body.cancellation_preset === "flexible" ||
        body.cancellation_preset === "moderate" ||
        body.cancellation_preset === "strict");

    if (hostEditedPolicy) {
      cancellationSnapshot = buildPolicyFromPreset(
        body.cancellation_approach!,
        body.cancellation_preset!
      );
    } else {
      const { data: hostRow } = await supabase
        .from("users")
        .select("cancellation_policy")
        .eq("id", request.host_id)
        .maybeSingle();
      const { data: listingRow } = await supabase
        .from("listings")
        .select("cancellation_policy_override")
        .eq("id", request.listing_id)
        .maybeSingle();
      cancellationSnapshot = resolveEffectivePolicy({
        hostDefault: hostRow?.cancellation_policy,
        listingOverride: listingRow?.cancellation_policy_override,
        reservationSnapshot: null,
      });
    }
  }

  // Host's final price replaces the original total_estimate. This
  // is the value the guest will confirm when they accept terms.
  const totalPriceEdit =
    status === "accepted" &&
    typeof body.total_price === "number" &&
    Number.isFinite(body.total_price) &&
    body.total_price >= 0
      ? Math.round(body.total_price)
      : null;

  // Host can counter-offer on dates + guest count during Review &
  // send. Only applied on accept. Basic validation: dates must be
  // YYYY-MM-DD strings and check_out must be after check_in.
  const isDateStr = (s: unknown): s is string =>
    typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  let checkInEdit: string | null = null;
  let checkOutEdit: string | null = null;
  if (
    status === "accepted" &&
    isDateStr(body.check_in) &&
    isDateStr(body.check_out) &&
    body.check_out > body.check_in
  ) {
    checkInEdit = body.check_in;
    checkOutEdit = body.check_out;
  }
  const guestCountEdit =
    status === "accepted" &&
    typeof body.guest_count === "number" &&
    Number.isFinite(body.guest_count) &&
    body.guest_count >= 1
      ? Math.floor(body.guest_count)
      : null;

  const { error } = await supabase
    .from("contact_requests")
    .update({
      status,
      host_response_message: hostResponseMessage || null,
      responded_at: new Date().toISOString(),
      ...(cancellationSnapshot
        ? { cancellation_policy: cancellationSnapshot }
        : {}),
      ...(totalPriceEdit !== null ? { total_estimate: totalPriceEdit } : {}),
      ...(checkInEdit && checkOutEdit
        ? { check_in: checkInEdit, check_out: checkOutEdit }
        : {}),
      ...(guestCountEdit !== null ? { guest_count: guestCountEdit } : {}),
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
    const { data: hostRow } = await supabase
      .from("users")
      .select("name")
      .eq("id", request.host_id)
      .maybeSingle();
    const hostFirst = (hostRow?.name ?? "Host").split(" ")[0];

    if (status === "accepted") {
      // Structured terms_offered message — the thread renderer
      // reads live policy + price from thread.booking and draws a
      // rich card with an Accept button for the guest.
      await supabase.from("messages").insert({
        thread_id: thread.id,
        sender_id: null,
        content: TERMS_OFFERED_PREFIX,
        is_system: true,
      });
    } else {
      await supabase.from("messages").insert({
        thread_id: thread.id,
        sender_id: null,
        content: `${hostFirst} declined the reservation request.`,
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
