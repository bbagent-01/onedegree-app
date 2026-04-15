export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getOrCreateThread } from "@/lib/messaging-data";

/**
 * Track B reservation endpoint.
 * Creates a pending contact_request, opens (or reuses) a message thread,
 * inserts a system message + the guest's optional intro message.
 * No payment processing — host reviews and responds via the dashboard.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
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
    .select("id, host_id, title")
    .eq("id", body.listingId)
    .single();
  if (!listing) {
    return Response.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.host_id === currentUser.id) {
    return Response.json(
      { error: "You can't reserve your own listing." },
      { status: 400 }
    );
  }

  const summaryMessage = `Hi! I'd like to reserve your place from ${body.checkIn} to ${body.checkOut} for ${body.guests ?? 1} guest(s). Estimated total: $${(body.total ?? 0).toLocaleString()}.`;

  const { data: request, error } = await supabase
    .from("contact_requests")
    .insert({
      listing_id: body.listingId,
      guest_id: currentUser.id,
      host_id: listing.host_id,
      message: summaryMessage,
      check_in: body.checkIn,
      check_out: body.checkOut,
      guest_count: body.guests ?? 1,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !request) {
    console.error("Booking insert error:", error);
    return Response.json(
      { error: "Couldn't send reservation request." },
      { status: 500 }
    );
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

  // System message — reservation request created
  const guestLabel = currentUser.name?.split(" ")[0] || "Guest";
  await supabase.from("messages").insert({
    thread_id: threadId,
    sender_id: null,
    content: `${guestLabel} requested to reserve from ${body.checkIn} to ${body.checkOut} · ${body.guests ?? 1} guest${(body.guests ?? 1) === 1 ? "" : "s"}.`,
    is_system: true,
  });

  // Optional intro message from the guest (otherwise the canned summary)
  const guestText = (body.message || "").trim();
  if (guestText) {
    await supabase.from("messages").insert({
      thread_id: threadId,
      sender_id: currentUser.id,
      content: guestText,
      is_system: false,
    });
  } else {
    await supabase.from("messages").insert({
      thread_id: threadId,
      sender_id: currentUser.id,
      content: summaryMessage,
      is_system: false,
    });
  }

  return Response.json({ id: request.id, threadId });
}
