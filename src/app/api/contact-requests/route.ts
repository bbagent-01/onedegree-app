export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET: fetch contact requests for current user (as host or guest)
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) return new Response("User not found", { status: 404 });

  const url = new URL(req.url);
  const role = url.searchParams.get("role") || "guest";
  const status = url.searchParams.get("status");

  let query = supabase.from("contact_requests").select("*");

  if (role === "host") {
    query = query.eq("host_id", currentUser.id);
  } else {
    query = query.eq("guest_id", currentUser.id);
  }

  if (status) {
    query = query.eq("status", status);
  }

  query = query.order("created_at", { ascending: false });

  const { data: requests, error } = await query;
  if (error) return new Response("Failed to fetch", { status: 500 });

  // Enrich with user + listing info
  const listingIds = [...new Set((requests || []).map((r) => r.listing_id))];
  const userIds = [
    ...new Set(
      (requests || []).flatMap((r) => [r.guest_id, r.host_id])
    ),
  ];

  const [{ data: listings }, { data: users }] = await Promise.all([
    supabase
      .from("listings")
      .select("id, title, area_name")
      .in("id", listingIds.length ? listingIds : ["_"]),
    supabase
      .from("users")
      .select("id, name, avatar_url, guest_rating, guest_review_count, host_rating, host_review_count, vouch_power")
      .in("id", userIds.length ? userIds : ["_"]),
  ]);

  const listingMap = new Map((listings || []).map((l) => [l.id, l]));
  const userMap = new Map((users || []).map((u) => [u.id, u]));

  const enriched = (requests || []).map((r) => ({
    ...r,
    listing: listingMap.get(r.listing_id) || null,
    guest: userMap.get(r.guest_id) || null,
    host: userMap.get(r.host_id) || null,
  }));

  return Response.json({ requests: enriched, currentUserId: currentUser.id });
}

// POST: guest creates a contact request
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) return new Response("User not found", { status: 404 });

  const body = await req.json();
  const { listingId, checkIn, checkOut, guestCount, message } = body;

  if (!listingId || !message) {
    return Response.json({ error: "Listing and message are required" }, { status: 400 });
  }

  // Look up the listing to get host_id
  const { data: listing } = await supabase
    .from("listings")
    .select("id, host_id")
    .eq("id", listingId)
    .single();

  if (!listing) {
    return Response.json({ error: "Listing not found" }, { status: 404 });
  }

  if (listing.host_id === currentUser.id) {
    return Response.json({ error: "You can't request your own listing" }, { status: 400 });
  }

  const { data: request, error } = await supabase
    .from("contact_requests")
    .insert({
      listing_id: listingId,
      guest_id: currentUser.id,
      host_id: listing.host_id,
      message,
      check_in: checkIn || null,
      check_out: checkOut || null,
      guest_count: guestCount || 1,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Contact request insert error:", error);
    return new Response("Failed to create request", { status: 500 });
  }

  return Response.json({ id: request.id });
}
