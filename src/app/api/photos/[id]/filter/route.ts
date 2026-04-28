// CC-C10a: apply / remove a filter on an already-saved listing_photos row.
//
// POST — commit a newly-filtered render:
//   1. verify ownership via listings.host_id
//   2. delete the replaced blob from storage (old filtered version, if any)
//   3. update the row with filtered URL + preset + settings, and set
//      original_url if this is the first filter applied
//
// DELETE — reset: restore public_url from original_url, delete the
//   orphaned filtered blob, null out filter fields.

export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

const BUCKET = "listing-photos";

function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+?)(?:\?.*)?$/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function assertOwner(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  photoId: string,
  clerkId: string
): Promise<
  | { ok: true; photo: { id: string; public_url: string; storage_path: string | null; original_url: string | null; listing_id: string } }
  | { ok: false; status: number; error: string }
> {
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .single();
  if (!currentUser) return { ok: false, status: 404, error: "User not found" };

  const { data: photo } = await supabase
    .from("listing_photos")
    .select("id, public_url, storage_path, original_url, listing_id")
    .eq("id", photoId)
    .single();
  if (!photo) return { ok: false, status: 404, error: "Photo not found" };

  const { data: listing } = await supabase
    .from("listings")
    .select("host_id")
    .eq("id", photo.listing_id)
    .single();
  if (!listing || listing.host_id !== currentUser.id) {
    return { ok: false, status: 403, error: "Not authorized" };
  }
  return { ok: true, photo };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: photoId } = await params;
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();
  const check = await assertOwner(supabase, photoId, userId);
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: check.status });
  }
  const photo = check.photo;

  const body = (await req.json()) as {
    filtered_public_url: string;
    filtered_storage_path: string;
    original_public_url: string;
    filter_preset: string;
    filter_settings: Record<string, number>;
    replace_storage_path?: string | null;
  };

  if (
    !body.filtered_public_url ||
    !body.filtered_storage_path ||
    !body.original_public_url ||
    !body.filter_preset ||
    !body.filter_settings
  ) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (
    !["natural", "bright_airy", "warm", "custom"].includes(body.filter_preset)
  ) {
    return Response.json({ error: "Invalid preset" }, { status: 400 });
  }

  // Only preserve original_url if it wasn't already set. Re-filtering a
  // previously-filtered photo must not overwrite the original pointer.
  const originalUrl = photo.original_url || body.original_public_url;

  const { error: updateErr } = await supabase
    .from("listing_photos")
    .update({
      public_url: body.filtered_public_url,
      storage_path: body.filtered_storage_path,
      original_url: originalUrl,
      filter_preset: body.filter_preset,
      filter_settings: body.filter_settings,
    })
    .eq("id", photoId);

  if (updateErr) {
    console.error("Filter update failed:", updateErr);
    return Response.json({ error: "Update failed" }, { status: 500 });
  }

  // Best-effort cleanup of the replaced blob. Never block on this.
  if (body.replace_storage_path && body.replace_storage_path !== body.filtered_storage_path) {
    try {
      await supabase.storage.from(BUCKET).remove([body.replace_storage_path]);
    } catch (e) {
      console.warn("Failed to remove replaced blob", e);
    }
  }

  return Response.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: photoId } = await params;
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();
  const check = await assertOwner(supabase, photoId, userId);
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: check.status });
  }
  const photo = check.photo;

  if (!photo.original_url) {
    // Nothing to restore — photo was never filtered. Just clear fields
    // (defensive; expected to be no-op).
    await supabase
      .from("listing_photos")
      .update({
        filter_preset: null,
        filter_settings: null,
      })
      .eq("id", photoId);
    return Response.json({ ok: true, noop: true });
  }

  const filteredStoragePath = photo.storage_path;
  const originalPath = storagePathFromUrl(photo.original_url);

  const { error: updateErr } = await supabase
    .from("listing_photos")
    .update({
      public_url: photo.original_url,
      storage_path: originalPath,
      original_url: null,
      filter_preset: null,
      filter_settings: null,
    })
    .eq("id", photoId);

  if (updateErr) {
    console.error("Filter reset failed:", updateErr);
    return Response.json({ error: "Reset failed" }, { status: 500 });
  }

  // Delete orphan filtered blob.
  if (filteredStoragePath && filteredStoragePath !== originalPath) {
    try {
      await supabase.storage.from(BUCKET).remove([filteredStoragePath]);
    } catch (e) {
      console.warn("Failed to remove filtered blob", e);
    }
  }

  return Response.json({ ok: true });
}
