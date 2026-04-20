export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

// PUT: replace the full set of photos for a listing.
// Body: { photos: [{ id?, public_url, storage_path?, is_preview, sort_order }] }
// - Existing photo rows not included in the payload are deleted.
// - New photo rows (no id) are inserted.
// - Existing rows have is_preview and sort_order updated.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();

  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) return new Response("User not found", { status: 404 });

  const { data: listing } = await supabase
    .from("listings")
    .select("host_id")
    .eq("id", listingId)
    .single();
  if (!listing || listing.host_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = (await req.json()) as {
    photos: Array<{
      id?: string;
      public_url: string;
      storage_path?: string | null;
      is_cover?: boolean;
      is_preview: boolean;
      sort_order: number;
    }>;
  };

  if (!body.photos || !Array.isArray(body.photos)) {
    return Response.json({ error: "photos array required" }, { status: 400 });
  }

  // Preview photos are optional. Cover is required — default to first.
  if (body.photos.length > 0 && !body.photos.some((p) => p.is_cover)) {
    body.photos[0].is_cover = true;
  }

  // Current rows
  const { data: existing } = await supabase
    .from("listing_photos")
    .select("id")
    .eq("listing_id", listingId);

  const existingIds = new Set((existing || []).map((r) => r.id as string));
  const keepIds = new Set(
    body.photos.filter((p) => p.id).map((p) => p.id as string)
  );

  // Delete rows that were removed client-side
  const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from("listing_photos").delete().in("id", toDelete);
  }

  // Update existing rows
  for (const p of body.photos) {
    if (p.id && existingIds.has(p.id)) {
      await supabase
        .from("listing_photos")
        .update({
          is_cover: p.is_cover ?? false,
          is_preview: p.is_preview,
          sort_order: p.sort_order,
        })
        .eq("id", p.id);
    }
  }

  // Insert new rows
  const toInsert = body.photos
    .filter((p) => !p.id)
    .map((p) => ({
      listing_id: listingId,
      public_url: p.public_url,
      storage_path: p.storage_path || null,
      is_cover: p.is_cover ?? false,
      is_preview: p.is_preview,
      sort_order: p.sort_order,
    }));
  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase
      .from("listing_photos")
      .insert(toInsert);
    if (insertErr) {
      console.error("Photo insert error:", insertErr);
      return Response.json(
        { error: "Failed to add photos" },
        { status: 500 }
      );
    }
  }

  // Return fresh ordered list
  const { data: photos } = await supabase
    .from("listing_photos")
    .select("id, public_url, storage_path, is_cover, is_preview, sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  return Response.json({ photos: photos || [] });
}
