export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getOrCreateThread } from "@/lib/messaging-data";
import { emailNewBookingRequest } from "@/lib/email";
import { effectiveAuth } from "@/lib/impersonation/session";
import { resolveEffectivePolicy } from "@/lib/cancellation";
import { RESERVATION_REQUEST_PREFIX } from "@/lib/structured-messages";

/**
 * Track B reservation endpoint.
 * Creates a pending contact_request, opens (or reuses) a message thread,
 * inserts a system message + the guest's optional intro message.
 * No payment processing — host reviews and responds via the dashboard.
 */
export async function POST(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) {
    return Response.json(
      { error: "Sign in to reserve this place." },
      { status: 401 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: currentUser } = await supabase
    .from("users")
    .select("id, name")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as {
    listingId?: string;
    checkIn?: string | null;
    checkOut?: string | null;
    guests?: number;
    total?: number;
    message?: string | null;
  } | null;

  if (!body?.listingId || !body.checkIn || !body.checkOut) {
    return Response.json(
      { error: "Missing listing or dates." },
      { status: 400 }
    );
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, host_id, title, cancellation_policy_override")
    .eq("id", body.listingId)
    .single();
  if (!listing) {
    return Response.json({ error: "Listing not found" }, { status: 404 });
  }
  const { data: hostUser } = await supabase
    .from("users")
    .select("id, name, cancellation_policy")
    .eq("id", listing.host_id)
    .maybeSingle();

  // Snapshot the effective cancellation policy at this exact
  // moment so the terms_offered card can diff it later if the
  // host counter-offers. Listing override > host default >
  // platform default.
  const originalPolicy = resolveEffectivePolicy({
    hostDefault: (hostUser as { cancellation_policy?: unknown } | null)
      ?.cancellation_policy ?? null,
    listingOverride: (listing as { cancellation_policy_override?: unknown })
      .cancellation_policy_override ?? null,
    reservationSnapshot: null,
  });
  if (listing.host_id === currentUser.id) {
    return Response.json(
      { error: "You can't reserve your own listing." },
      { status: 400 }
    );
  }

  // The guest's typed message is what the host should see in the preview
  // card. Fall back to a short placeholder if empty so the column is never
  // NULL (contact_requests.message is NOT NULL).
  const guestTyped = (body.message || "").trim();
  const storedMessage = guestTyped || "(No message included)";
  const totalEstimate = Math.round(body.total ?? 0);

  // Idempotency guard: if a pending or accepted request already exists for
  // this exact listing + guest + dates, reuse it instead of creating a
  // duplicate row. Prevents the "user clicks Reserve twice" failure mode.
  const { data: existing } = await supabase
    .from("contact_requests")
    .select("id")
    .eq("listing_id", body.listingId)
    .eq("guest_id", currentUser.id)
    .eq("check_in", body.checkIn)
    .eq("check_out", body.checkOut)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let request: { id: string } | null = null;
  let isExisting = false;
  if (existing) {
    request = existing;
    isExisting = true;
  } else {
    const { data: created, error } = await supabase
      .from("contact_requests")
      .insert({
        listing_id: body.listingId,
        guest_id: currentUser.id,
        host_id: listing.host_id,
        message: storedMessage,
        check_in: body.checkIn,
        check_out: body.checkOut,
        guest_count: body.guests ?? 1,
        total_estimate: totalEstimate,
        // Snapshot the original request so the guest's
        // terms_offered card can diff against it when the host
        // counter-offers. Immutable after insert.
        original_check_in: body.checkIn,
        original_check_out: body.checkOut,
        original_guest_count: body.guests ?? 1,
        original_total_estimate: totalEstimate,
        original_cancellation_policy: originalPolicy,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !created) {
      console.error("Booking insert error:", error);
      return Response.json(
        { error: "Couldn't send reservation request." },
        { status: 500 }
      );
    }
    request = created;
  }

  // Open or reuse a thread for this listing/guest.
  let threadId: string;
  try {
    threadId = await getOrCreateThread({
      listingId: body.listingId,
      guestId: currentUser.id,
      hostId: listing.host_id,
      contactRequestId: request.id,
    });
  } catch (e) {
    console.error("Thread create error:", e);
    return Response.json({ id: request.id });
  }

  // If this was a duplicate click, don't spam the thread with another
  // system message + intro + email. Just hand back the existing booking
  // and thread so the UI lands the user back where they already were.
  if (isExisting) {
    return Response.json({ id: request.id, threadId, deduped: true });
  }

  // System message — reservation request created. Structured prefix
  // so the thread view swaps in SystemMilestoneCard (icon + guest
  // name + date range + guest count) instead of rendering a plain
  // sentence. Card reads live data from thread.booking.
  await supabase.from("messages").insert({
    thread_id: threadId,
    sender_id: null,
    content: RESERVATION_REQUEST_PREFIX,
    is_system: true,
  });

  // Only post an intro message if the guest actually typed one — no more
  // canned fallback that pollutes the thread with boilerplate.
  if (guestTyped) {
    await supabase.from("messages").insert({
      thread_id: threadId,
      sender_id: currentUser.id,
      content: guestTyped,
      is_system: false,
    });
  }

  // Fire-and-forget transactional email to the host
  await emailNewBookingRequest({
    hostId: listing.host_id,
    guestId: currentUser.id,
    guestName: currentUser.name || "A guest",
    hostName: hostUser?.name || "Host",
    listingTitle: listing.title,
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    guestCount: body.guests ?? 1,
    threadId,
    bookingId: request.id,
    message: guestTyped || null,
  });

  return Response.json({ id: request.id, threadId });
}
