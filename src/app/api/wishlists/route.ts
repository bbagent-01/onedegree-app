export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getWishlistsContainingListing } from "@/lib/wishlist-data";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * GET /api/wishlists?listingId=...
 *
 * Lists the signed-in user's wishlists with a small payload suitable
 * for the "save to wishlist" picker popover. If `listingId` is
 * provided, each list includes an `is_member` boolean indicating
 * whether that listing is already saved into it.
 */
export async function GET(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const listingId = url.searchParams.get("listingId") || undefined;

  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!user) return Response.json({ wishlists: [] });

  const { data: lists } = await supabase
    .from("wishlists")
    .select("id, name, is_default, created_at")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  const memberSet = listingId
    ? await getWishlistsContainingListing(user.id as string, listingId)
    : new Set<string>();

  return Response.json({
    wishlists: (lists || []).map((l) => ({
      id: l.id,
      name: l.name,
      is_default: l.is_default,
      is_member: memberSet.has(l.id as string),
    })),
  });
}

/**
 * POST /api/wishlists  { name: string, listingId?: string }
 *
 * Creates a new named wishlist for the signed-in user. If listingId
 * is provided, the listing is added to the freshly created list in
 * the same round-trip.
 */
export async function POST(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    listingId?: string;
  } | null;
  if (!body) return Response.json({ error: "Invalid body" }, { status: 400 });

  const name = (body.name || "").trim();
  if (!name || name.length > 60) {
    return Response.json(
      { error: "Name must be 1–60 characters" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  // The first list a user ever creates becomes the default.
  const { count: existingCount } = await supabase
    .from("wishlists")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id as string);

  const isDefault = (existingCount ?? 0) === 0;

  const { data: created, error } = await supabase
    .from("wishlists")
    .insert({
      user_id: user.id,
      name,
      is_default: isDefault,
    })
    .select("id, name, is_default")
    .single();

  if (error || !created) {
    return Response.json({ error: "Failed to create list" }, { status: 500 });
  }

  // Optional: add the passed listing to the new wishlist right away.
  if (body.listingId) {
    await supabase.from("saved_listings").insert({
      user_id: user.id,
      listing_id: body.listingId,
      wishlist_id: created.id,
    });
  }

  return Response.json({ wishlist: created });
}
