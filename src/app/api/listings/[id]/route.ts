export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

// PATCH: update owner-editable fields on a listing
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    .select("id, host_id")
    .eq("id", id)
    .single();

  if (!listing) {
    return Response.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.host_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};

  // Boolean
  if (typeof body.is_active === "boolean") update.is_active = body.is_active;

  // Plain text / numeric fields
  const passthrough = [
    "title",
    "description",
    "area_name",
    "property_type",
    "price_min",
    "price_max",
    "house_rules",
    "availability_start",
    "availability_end",
    "availability_flexible",
    "preview_visibility",
    "full_visibility",
    "min_trust_score",
    // CC-C3 visibility fields
    "visibility_mode",
    "preview_description",
    // S10.5 (mig 045): promoted-from-meta + new product fields
    "place_kind",
    "property_label",
    "max_guests",
    "bedrooms",
    "beds",
    "bathrooms",
    "street",
    "city",
    "state",
    "postal_code",
    "lat",
    "lng",
    "weekly_discount_pct",
    "monthly_discount_pct",
    "extended_overview",
    "guest_access_text",
    "interaction_text",
    "other_details_text",
    "cleaning_fee",
    "stay_style",
    "checkin_instructions",
    "checkout_instructions",
    "house_manual",
    "pets_allowed",
    "children_allowed",
    "pets_on_property",
    "no_smoking",
    "no_parties",
    "quiet_hours",
  ];
  for (const k of passthrough) {
    if (k in body) update[k] = body[k];
  }
  if (Array.isArray(body.amenities)) update.amenities = body.amenities;
  if (Array.isArray(body.specific_user_ids))
    update.specific_user_ids = body.specific_user_ids;
  if (Array.isArray(body.tags)) update.tags = body.tags;
  if (Array.isArray(body.accessibility_features))
    update.accessibility_features = body.accessibility_features;
  // access_settings is a JSONB object
  if (body.access_settings && typeof body.access_settings === "object") {
    update.access_settings = body.access_settings;
  }
  // preview_settings is a JSONB object (S10.5)
  if (body.preview_settings && typeof body.preview_settings === "object") {
    update.preview_settings = body.preview_settings;
  }
  // service_discounts is a JSONB array (S10.5)
  if (Array.isArray(body.service_discounts)) {
    update.service_discounts = body.service_discounts;
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  update.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("listings")
    .update(update)
    .eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

// DELETE: permanently remove a listing (host only). Cascades listing_photos
// and listing_availability via ON DELETE. Bookings/wishlists/reviews are
// kept — their FKs will nullify or their rows become orphaned refs
// depending on schema.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    .select("id, host_id")
    .eq("id", id)
    .single();

  if (!listing) {
    return Response.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.host_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
