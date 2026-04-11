import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { MyTripsClient } from "./my-trips-client";

export default async function MyTripsPage() {
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
  const [{ data: requests }, { data: stays }] = await Promise.all([
    supabase
      .from("contact_requests")
      .select("*")
      .eq("guest_id", currentUser.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("stay_confirmations")
      .select("*")
      .eq("guest_id", currentUser.id)
      .order("created_at", { ascending: false }),
  ]);

  // Enrich with user + listing info
  const hostIds = [
    ...new Set([
      ...(requests || []).map((r) => r.host_id),
      ...(stays || []).map((s) => s.host_id),
    ]),
  ];
  const listingIds = [
    ...new Set([
      ...(requests || []).map((r) => r.listing_id),
      ...(stays || []).map((s) => s.listing_id),
    ]),
  ];

  const [{ data: hosts }, { data: listings }] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, avatar_url, host_rating, host_review_count")
      .in("id", hostIds.length ? hostIds : ["_"]),
    supabase
      .from("listings")
      .select("id, title, area_name")
      .in("id", listingIds.length ? listingIds : ["_"]),
  ]);

  const hostMap = Object.fromEntries((hosts || []).map((h) => [h.id, h]));
  const listingMap = Object.fromEntries((listings || []).map((l) => [l.id, l]));

  const enrichedRequests = (requests || []).map((r) => ({
    ...r,
    host: hostMap[r.host_id] || null,
    guest: null,
    listing: listingMap[r.listing_id] || null,
  }));

  const enrichedStays = (stays || []).map((s) => ({
    ...s,
    host: hostMap[s.host_id] || null,
    listing: listingMap[s.listing_id] || null,
  }));

  return (
    <MyTripsClient
      requests={enrichedRequests}
      stays={enrichedStays}
    />
  );
}
