export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// PATCH: confirm a stay or submit a review
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) return new Response("User not found", { status: 404 });

  // Fetch the stay confirmation
  const { data: stay } = await supabase
    .from("stay_confirmations")
    .select("*")
    .eq("id", id)
    .single();

  if (!stay) {
    return Response.json({ error: "Stay not found" }, { status: 404 });
  }

  const isHost = stay.host_id === currentUser.id;
  const isGuest = stay.guest_id === currentUser.id;

  if (!isHost && !isGuest) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === "confirm") {
    // Prevent confirming a stay whose checkout hasn't happened yet
    if (stay.check_out) {
      const today = new Date().toISOString().split("T")[0];
      if (stay.check_out > today) {
        return Response.json(
          { error: "This stay can't be confirmed until after the checkout date" },
          { status: 400 }
        );
      }
    }

    // Set the appropriate confirmed flag
    const update = isHost
      ? { host_confirmed: true }
      : { guest_confirmed: true };

    const { error } = await supabase
      .from("stay_confirmations")
      .update(update)
      .eq("id", id);

    if (error) {
      console.error("Confirm error:", error);
      return new Response("Failed to confirm", { status: 500 });
    }

    return Response.json({ ok: true });
  }

  if (action === "review") {
    // Both must be confirmed before reviews
    if (!stay.host_confirmed || !stay.guest_confirmed) {
      return Response.json(
        { error: "Both parties must confirm the stay before reviewing" },
        { status: 400 }
      );
    }

    if (isHost) {
      // Host reviews the guest
      const { guestRating, guestReviewText } = body;

      if (!guestRating || guestRating < 1 || guestRating > 5) {
        return Response.json({ error: "Guest rating (1-5) is required" }, { status: 400 });
      }

      if (stay.guest_rating !== null) {
        return Response.json({ error: "You already reviewed this stay" }, { status: 400 });
      }

      // Update stay confirmation
      const { error: stayError } = await supabase
        .from("stay_confirmations")
        .update({
          guest_rating: guestRating,
          guest_review_text: guestReviewText || null,
        })
        .eq("id", id);

      if (stayError) {
        console.error("Review error:", stayError);
        return new Response("Failed to save review", { status: 500 });
      }

      // Recalculate guest's running average
      const { data: guest } = await supabase
        .from("users")
        .select("guest_rating, guest_review_count")
        .eq("id", stay.guest_id)
        .single();

      if (guest) {
        const oldRating = Number(guest.guest_rating) || 0;
        const oldCount = guest.guest_review_count || 0;
        const newAvg = (oldRating * oldCount + guestRating) / (oldCount + 1);

        await supabase
          .from("users")
          .update({
            guest_rating: Math.round(newAvg * 100) / 100,
            guest_review_count: oldCount + 1,
          })
          .eq("id", stay.guest_id);
      }

      return Response.json({ ok: true });
    }

    if (isGuest) {
      // Guest reviews the host + listing
      const { hostRating, listingRating, hostReviewText, listingReviewText } = body;

      if (!hostRating || hostRating < 1 || hostRating > 5) {
        return Response.json({ error: "Host rating (1-5) is required" }, { status: 400 });
      }
      if (!listingRating || listingRating < 1 || listingRating > 5) {
        return Response.json({ error: "Listing rating (1-5) is required" }, { status: 400 });
      }

      if (stay.host_rating !== null) {
        return Response.json({ error: "You already reviewed this stay" }, { status: 400 });
      }

      // Update stay confirmation
      const { error: stayError } = await supabase
        .from("stay_confirmations")
        .update({
          host_rating: hostRating,
          listing_rating: listingRating,
          host_review_text: hostReviewText || null,
          listing_review_text: listingReviewText || null,
        })
        .eq("id", id);

      if (stayError) {
        console.error("Review error:", stayError);
        return new Response("Failed to save review", { status: 500 });
      }

      // Recalculate host's running average
      const { data: host } = await supabase
        .from("users")
        .select("host_rating, host_review_count")
        .eq("id", stay.host_id)
        .single();

      if (host) {
        const oldRating = Number(host.host_rating) || 0;
        const oldCount = host.host_review_count || 0;
        const newAvg = (oldRating * oldCount + hostRating) / (oldCount + 1);

        await supabase
          .from("users")
          .update({
            host_rating: Math.round(newAvg * 100) / 100,
            host_review_count: oldCount + 1,
          })
          .eq("id", stay.host_id);
      }

      // Recalculate listing's running average
      const { data: listing } = await supabase
        .from("listings")
        .select("avg_listing_rating, listing_review_count")
        .eq("id", stay.listing_id)
        .single();

      if (listing) {
        const oldRating = Number(listing.avg_listing_rating) || 0;
        const oldCount = listing.listing_review_count || 0;
        const newAvg = (oldRating * oldCount + listingRating) / (oldCount + 1);

        await supabase
          .from("listings")
          .update({
            avg_listing_rating: Math.round(newAvg * 100) / 100,
            listing_review_count: oldCount + 1,
          })
          .eq("id", stay.listing_id);
      }

      return Response.json({ ok: true });
    }
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
