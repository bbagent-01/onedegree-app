export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// PATCH: update owner-editable fields on a listing
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
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
  ];
  for (const k of passthrough) {
    if (k in body) update[k] = body[k];
  }
  if (Array.isArray(body.amenities)) update.amenities = body.amenities;
  if (Array.isArray(body.specific_user_ids))
    update.specific_user_ids = body.specific_user_ids;

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
