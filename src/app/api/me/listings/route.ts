export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * GET /api/me/listings
 *
 * Returns the current viewer's active listings in the minimal shape
 * needed by the host-listing-picker modal (S9d Task 5):
 *
 *   { listings: [{ id, title, area_name, price_min, thumbnail_url }] }
 *
 * Sorted by created_at desc so the host's most recent listing shows
 * first — matches what they're likely to be sending terms about.
 *
 * Empty array on no-listings (the picker renders an empty state).
 */
export async function GET() {
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  const { data: viewer } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!viewer) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, title, area_name, price_min, created_at")
    .eq("host_id", viewer.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[me/listings] query failed:", error);
    return Response.json({ error: "Couldn't load listings" }, { status: 500 });
  }

  const ids = (listings || []).map((l) => l.id as string);
  const { data: photos } = ids.length
    ? await supabase
        .from("listing_photos")
        .select("listing_id, public_url, is_cover, sort_order")
        .in("listing_id", ids)
        .order("is_cover", { ascending: false })
        .order("sort_order", { ascending: true })
    : { data: [] as Array<{ listing_id: string; public_url: string }> };

  // Pick the first photo per listing — cover wins because of the
  // is_cover sort, then sort_order breaks ties.
  const thumbByListing = new Map<string, string>();
  for (const p of photos || []) {
    const lid = (p as { listing_id: string }).listing_id;
    if (!thumbByListing.has(lid)) {
      thumbByListing.set(lid, (p as { public_url: string }).public_url);
    }
  }

  return Response.json({
    listings: (listings || []).map((l) => ({
      id: l.id,
      title: l.title,
      area_name: l.area_name,
      price_min: l.price_min,
      thumbnail_url: thumbByListing.get(l.id as string) ?? null,
    })),
  });
}
