import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "./supabase";
import { computeTrustPaths } from "./trust-data";

export interface HostingListing {
  id: string;
  title: string;
  area_name: string;
  property_type: string;
  price_min: number | null;
  price_max: number | null;
  is_active: boolean;
  created_at: string;
  thumbnail_url: string | null;
  upcoming_bookings: number;
  avg_rating: number | null;
  review_count: number;
}

export interface HostingReservation {
  id: string;
  listing_id: string;
  listing_title: string;
  guest_id: string;
  guest_name: string;
  guest_avatar: string | null;
  check_in: string | null;
  check_out: string | null;
  guest_count: number;
  message: string;
  total_estimate: number | null;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
  responded_at: string | null;
  /** Host's 1° vouch score to this guest. 0 if none. */
  trust_score: number;
}

export type ReservationBucket = "upcoming" | "completed" | "cancelled";

export interface HostDashboardData {
  user: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  stats: {
    activeListings: number;
    upcomingStays: number;
    unreadMessages: number;
    avgRating: number | null;
    ratingCount: number;
  };
  reservations: {
    upcoming: HostingReservation[];
    completed: HostingReservation[];
    cancelled: HostingReservation[];
  };
  listings: HostingListing[];
  earnings: {
    total: number;
    thisMonth: number;
    pending: number;
  };
}

/**
 * Fetch everything the host dashboard needs in one pass.
 * Returns null if user is not signed in.
 */
export async function getHostDashboardData(): Promise<HostDashboardData | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = getSupabaseAdmin();

  // 1. Resolve current user
  const { data: currentUser } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) return null;

  const hostId = currentUser.id;

  // 2. All listings owned by this user (active + inactive)
  const { data: listingsData } = await supabase
    .from("listings")
    .select("id, title, area_name, property_type, price_min, price_max, is_active, created_at")
    .eq("host_id", hostId)
    .order("created_at", { ascending: false });

  const listingIds = (listingsData || []).map((l) => l.id);

  // 3. Thumbnails (first preview photo per listing)
  const { data: photos } = listingIds.length
    ? await supabase
        .from("listing_photos")
        .select("listing_id, public_url, is_preview, sort_order")
        .in("listing_id", listingIds)
        .order("sort_order", { ascending: true })
    : { data: [] as Array<{ listing_id: string; public_url: string; is_preview: boolean; sort_order: number }> };

  const thumbByListing = new Map<string, string>();
  for (const p of photos || []) {
    if (!thumbByListing.has(p.listing_id)) thumbByListing.set(p.listing_id, p.public_url);
  }

  // 4. Contact requests where this user is the host (all statuses)
  const { data: requests } = await supabase
    .from("contact_requests")
    .select(
      "id, listing_id, guest_id, check_in, check_out, guest_count, message, total_estimate, status, created_at, responded_at"
    )
    .eq("host_id", hostId)
    .order("created_at", { ascending: false });

  const guestIds = [...new Set((requests || []).map((r) => r.guest_id))];
  const { data: guestUsers } = guestIds.length
    ? await supabase.from("users").select("id, name, avatar_url").in("id", guestIds)
    : { data: [] as Array<{ id: string; name: string; avatar_url: string | null }> };

  const guestById = new Map((guestUsers || []).map((g) => [g.id, g]));
  const trustByGuest = guestIds.length
    ? await computeTrustPaths(hostId, guestIds)
    : {};
  const listingTitleById = new Map(
    (listingsData || []).map((l) => [l.id, l.title as string])
  );

  const todayIso = new Date().toISOString().split("T")[0];
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const in30Iso = in30.toISOString().split("T")[0];

  const upcoming: HostingReservation[] = [];
  const completed: HostingReservation[] = [];
  const cancelled: HostingReservation[] = [];
  let upcomingStays = 0;
  const upcomingBookingsByListing = new Map<string, number>();

  for (const r of requests || []) {
    const guest = guestById.get(r.guest_id);
    const reservation: HostingReservation = {
      id: r.id,
      listing_id: r.listing_id,
      listing_title: listingTitleById.get(r.listing_id) || "Listing",
      guest_id: r.guest_id,
      guest_name: guest?.name || "Guest",
      guest_avatar: guest?.avatar_url || null,
      check_in: r.check_in,
      check_out: r.check_out,
      guest_count: r.guest_count || 1,
      message: r.message,
      total_estimate: (r as { total_estimate?: number | null }).total_estimate ?? null,
      status: r.status as HostingReservation["status"],
      created_at: r.created_at,
      responded_at: r.responded_at,
      trust_score: trustByGuest[r.guest_id]?.score ?? 0,
    };

    if (r.status === "cancelled" || r.status === "declined") {
      cancelled.push(reservation);
      continue;
    }

    const isPast = r.check_out && r.check_out < todayIso;
    if (isPast && r.status === "accepted") {
      completed.push(reservation);
    } else {
      upcoming.push(reservation);
      if (
        r.status === "accepted" &&
        r.check_in &&
        r.check_in >= todayIso &&
        r.check_in <= in30Iso
      ) {
        upcomingStays++;
      }
      if (r.status === "accepted" && r.check_out && r.check_out >= todayIso) {
        upcomingBookingsByListing.set(
          r.listing_id,
          (upcomingBookingsByListing.get(r.listing_id) || 0) + 1
        );
      }
    }
  }

  // 5. Stay confirmations for ratings + earnings
  const { data: stays } = listingIds.length
    ? await supabase
        .from("stay_confirmations")
        .select("id, listing_id, host_rating, listing_rating, check_in, check_out, created_at")
        .in("listing_id", listingIds)
    : { data: [] as Array<{ id: string; listing_id: string; host_rating: number | null; listing_rating: number | null; check_in: string | null; check_out: string | null; created_at: string }> };

  const listingRatings = new Map<string, { sum: number; count: number }>();
  let hostRatingSum = 0;
  let hostRatingCount = 0;
  for (const s of stays || []) {
    if (s.host_rating) {
      hostRatingSum += s.host_rating;
      hostRatingCount++;
    }
    if (s.listing_rating) {
      const agg = listingRatings.get(s.listing_id) || { sum: 0, count: 0 };
      agg.sum += s.listing_rating;
      agg.count++;
      listingRatings.set(s.listing_id, agg);
    }
  }

  const listings: HostingListing[] = (listingsData || []).map((l) => {
    const rating = listingRatings.get(l.id);
    return {
      id: l.id,
      title: l.title,
      area_name: l.area_name,
      property_type: l.property_type,
      price_min: l.price_min,
      price_max: l.price_max,
      is_active: l.is_active,
      created_at: l.created_at,
      thumbnail_url: thumbByListing.get(l.id) || null,
      upcoming_bookings: upcomingBookingsByListing.get(l.id) || 0,
      avg_rating: rating ? Math.round((rating.sum / rating.count) * 10) / 10 : null,
      review_count: rating?.count || 0,
    };
  });

  // 6. Earnings (placeholder: estimate from accepted stays × nights × avg price)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  let totalEarnings = 0;
  let monthEarnings = 0;
  let pendingEarnings = 0;

  const priceByListing = new Map(
    (listingsData || []).map((l) => [
      l.id,
      l.price_min ?? l.price_max ?? 0,
    ])
  );

  for (const s of stays || []) {
    if (!s.check_in || !s.check_out) continue;
    const nights = Math.max(
      1,
      Math.round(
        (new Date(s.check_out).getTime() - new Date(s.check_in).getTime()) /
          86400000
      )
    );
    const price = priceByListing.get(s.listing_id) || 0;
    const amount = nights * price;
    totalEarnings += amount;
    if (s.check_out >= monthStart) monthEarnings += amount;
  }

  for (const r of requests || []) {
    if (r.status !== "accepted" || !r.check_in || !r.check_out) continue;
    if (r.check_out < todayIso) continue;
    const nights = Math.max(
      1,
      Math.round(
        (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) /
          86400000
      )
    );
    const price = priceByListing.get(r.listing_id) || 0;
    pendingEarnings += nights * price;
  }

  return {
    user: {
      id: currentUser.id,
      name: currentUser.name || "",
      avatar_url: currentUser.avatar_url,
    },
    stats: {
      activeListings: listings.filter((l) => l.is_active).length,
      upcomingStays,
      unreadMessages: upcoming.filter((r) => r.status === "pending").length,
      avgRating:
        hostRatingCount > 0
          ? Math.round((hostRatingSum / hostRatingCount) * 10) / 10
          : null,
      ratingCount: hostRatingCount,
    },
    reservations: { upcoming, completed, cancelled },
    listings,
    earnings: {
      total: Math.round(totalEarnings),
      thisMonth: Math.round(monthEarnings),
      pending: Math.round(pendingEarnings),
    },
  };
}
