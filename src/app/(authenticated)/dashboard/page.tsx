import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DashboardClient } from "./dashboard-client";

export const runtime = "edge";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const supabase = getSupabaseAdmin();
  const { data: currentUser } = await supabase
    .from("users")
    .select("id, name")
    .eq("clerk_id", userId)
    .single();

  if (!currentUser) redirect("/");

  // Fetch all data in parallel
  const [
    { count: activeListingCount },
    { data: pendingRequests },
    { data: allRequests },
    { data: stays },
    { data: listings },
  ] = await Promise.all([
    supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("host_id", currentUser.id)
      .eq("is_active", true),
    supabase
      .from("contact_requests")
      .select("*")
      .eq("host_id", currentUser.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("contact_requests")
      .select("*")
      .eq("host_id", currentUser.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("stay_confirmations")
      .select("*")
      .eq("host_id", currentUser.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("listings")
      .select("id, title, area_name, avg_listing_rating, listing_review_count, is_active")
      .eq("host_id", currentUser.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

  // Enrich requests with user data
  const guestIds = [
    ...new Set([
      ...(pendingRequests || []).map((r) => r.guest_id),
      ...(stays || []).map((s) => s.guest_id),
    ]),
  ];
  const listingIds = [
    ...new Set([
      ...(pendingRequests || []).map((r) => r.listing_id),
      ...(stays || []).map((s) => s.listing_id),
    ]),
  ];

  const [{ data: guests }, { data: listingData }] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, avatar_url, guest_rating, guest_review_count, vouch_power")
      .in("id", guestIds.length ? guestIds : ["_"]),
    supabase
      .from("listings")
      .select("id, title, area_name")
      .in("id", listingIds.length ? listingIds : ["_"]),
  ]);

  const guestMap = Object.fromEntries((guests || []).map((g) => [g.id, g]));
  const listingMap = Object.fromEntries((listingData || []).map((l) => [l.id, l]));

  const enrichedPending = (pendingRequests || []).map((r) => ({
    ...r,
    guest: guestMap[r.guest_id] || null,
    host: null,
    listing: listingMap[r.listing_id] || null,
  }));

  const enrichedStays = (stays || []).map((s) => ({
    ...s,
    guest: guestMap[s.guest_id] || null,
    listing: listingMap[s.listing_id] || null,
  }));

  // Stats
  const completedStays = (stays || []).filter(
    (s) => s.host_confirmed && s.guest_confirmed
  );
  const avgRating =
    (listings || []).reduce((sum, l) => sum + (Number(l.avg_listing_rating) || 0), 0) /
      Math.max((listings || []).filter((l) => l.avg_listing_rating).length, 1) || null;

  return (
    <DashboardClient
      stats={{
        activeListings: activeListingCount ?? 0,
        totalRequests: (allRequests || []).length,
        pendingRequests: (pendingRequests || []).length,
        completedStays: completedStays.length,
        avgListingRating: avgRating,
      }}
      pendingRequests={enrichedPending}
      stays={enrichedStays}
      listings={listings || []}
    />
  );
}
