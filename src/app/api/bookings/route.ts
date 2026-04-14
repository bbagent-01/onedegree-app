export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Track B reservation endpoint.
 * Creates a pending contact_request (Airbnb-style "request to book").
 * No payment processing — host reviews and responds via their dashboard.
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
    .select("id")
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
  } | null;

  if (!body?.listingId || !body.checkIn || !body.checkOut) {
    return Response.json(
      { error: "Missing listing or dates." },
      { status: 400 }
    );
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, host_id")
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

  const message = `Hi! I'd like to reserve your place from ${body.checkIn} to ${body.checkOut} for ${body.guests ?? 1} guest(s). Estimated total: $${(body.total ?? 0).toLocaleString()}.`;

  const { data: request, error } = await supabase
    .from("contact_requests")
    .insert({
      listing_id: body.listingId,
      guest_id: currentUser.id,
      host_id: listing.host_id,
      message,
      check_in: body.checkIn,
      check_out: body.checkOut,
      guest_count: body.guests ?? 1,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Booking insert error:", error);
    return Response.json(
      { error: "Couldn't send reservation request." },
      { status: 500 }
    );
  }

  return Response.json({ id: request.id });
}
