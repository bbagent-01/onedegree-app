export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/stay-confirmations/[id]/guest-review
 *
 * Track B simplified review flow: a guest can leave a review after checkout
 * without requiring mutual confirmation. Updates running averages on
 * users.host_rating and listings.avg_listing_rating.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const { data: stay } = await supabase
    .from("stay_confirmations")
    .select("*")
    .eq("id", id)
    .single();
  if (!stay) return Response.json({ error: "Stay not found" }, { status: 404 });
  if (stay.guest_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  // Block reviews before checkout
  if (stay.check_out) {
    const today = new Date().toISOString().split("T")[0];
    if (stay.check_out > today) {
      return Response.json(
        { error: "You can review after checkout" },
        { status: 400 }
      );
    }
  }
  if (stay.host_rating !== null) {
    return Response.json({ error: "You already reviewed this stay" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    hostRating?: number;
    listingRating?: number;
    hostReviewText?: string | null;
    listingReviewText?: string | null;
  } | null;

  const hostRating = body?.hostRating;
  const listingRating = body?.listingRating;
  if (!hostRating || hostRating < 1 || hostRating > 5) {
    return Response.json({ error: "Host rating (1-5) required" }, { status: 400 });
  }
  if (!listingRating || listingRating < 1 || listingRating > 5) {
    return Response.json({ error: "Listing rating (1-5) required" }, { status: 400 });
  }

  const { error: stayError } = await supabase
    .from("stay_confirmations")
    .update({
      host_rating: hostRating,
      listing_rating: listingRating,
      host_review_text: body?.hostReviewText || null,
      listing_review_text: body?.listingReviewText || null,
      guest_confirmed: true,
    })
    .eq("id", id);
  if (stayError) {
    console.error("Guest review error:", stayError);
    return Response.json({ error: "Failed to save review" }, { status: 500 });
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
