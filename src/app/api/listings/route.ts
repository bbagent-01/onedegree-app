export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

export async function POST(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();

  // Resolve Clerk ID → DB user ID
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!currentUser) return new Response("User not found", { status: 404 });

  const body = await req.json();
  const {
    property_type,
    title,
    area_name,
    description,
    price_min,
    price_max,
    availability_start,
    availability_end,
    availability_flexible,
    house_rules,
    amenities,
    preview_visibility,
    full_visibility,
    min_trust_score,
    specific_user_ids,
    photos, // Array of { public_url, storage_path, is_preview, sort_order }
    // CC-C3 visibility fields
    visibility_mode,
    preview_description,
    access_settings,
  } = body;

  // Validate required fields
  if (!property_type || !area_name || !title) {
    return Response.json(
      { error: "Property type, title, and area name are required." },
      { status: 400 }
    );
  }

  if (!photos || photos.length === 0) {
    return Response.json(
      { error: "At least one photo is required." },
      { status: 400 }
    );
  }

  // Preview photos are optional. If none are selected, the cover photo
  // is shown blurred in preview mode. Cover photo is required though.
  const hasCoverPhoto = photos.some((p: { is_cover?: boolean }) => p.is_cover);
  if (!hasCoverPhoto && photos.length > 0) {
    // Default the first photo to cover if the host didn't explicitly pick one.
    (photos[0] as { is_cover: boolean }).is_cover = true;
  }

  // Insert listing
  const { data: listing, error: listingErr } = await supabase
    .from("listings")
    .insert({
      host_id: currentUser.id,
      property_type,
      title,
      area_name,
      description: description || null,
      price_min: price_min || null,
      price_max: price_max || null,
      availability_start: availability_start || null,
      availability_end: availability_end || null,
      availability_flexible: availability_flexible ?? false,
      house_rules: house_rules || null,
      amenities: amenities || [],
      preview_visibility: preview_visibility || "anyone",
      full_visibility: full_visibility || "vouched",
      min_trust_score: min_trust_score ?? 0,
      specific_user_ids: specific_user_ids || [],
      visibility_mode: visibility_mode || "preview_gated",
      preview_description: preview_description || null,
      access_settings: access_settings || null,
    })
    .select("id")
    .single();

  if (listingErr || !listing) {
    console.error("Listing insert error:", listingErr);
    return new Response("Failed to create listing", { status: 500 });
  }

  // Insert photos
  const photoRows = photos.map(
    (
      p: {
        public_url: string;
        storage_path?: string;
        is_preview: boolean;
        is_cover?: boolean;
        sort_order: number;
      },
      i: number
    ) => ({
      listing_id: listing.id,
      public_url: p.public_url,
      storage_path: p.storage_path || null,
      is_preview: p.is_preview ?? false,
      is_cover: p.is_cover ?? false,
      sort_order: p.sort_order ?? i,
    })
  );

  const { error: photosErr } = await supabase
    .from("listing_photos")
    .insert(photoRows);

  if (photosErr) {
    console.error("Photos insert error:", photosErr);
    // Listing was created but photos failed — still return the listing
  }

  return Response.json({ id: listing.id });
}
