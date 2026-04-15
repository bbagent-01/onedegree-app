export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ensureDefaultWishlist } from "@/lib/wishlist-data";

/**
 * POST /api/wishlists/save
 * Body: { listingId: string, wishlistId?: string, action?: "add" | "remove" | "toggle" }
 *
 * - If wishlistId is omitted, uses (or creates) the user's default list.
 * - action defaults to "toggle".
 * - Returns { saved_in: string[] } — the full set of wishlist IDs
 *   containing this listing after the mutation so the client can
 *   update fills accurately.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    listingId?: string;
    wishlistId?: string;
    action?: "add" | "remove" | "toggle";
  } | null;
  if (!body || typeof body.listingId !== "string") {
    return Response.json({ error: "listingId required" }, { status: 400 });
  }
  const action = body.action || "toggle";

  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const userRowId = user.id as string;

  const wishlistId =
    body.wishlistId || (await ensureDefaultWishlist(userRowId));

  // Confirm the target list actually belongs to this user.
  const { data: targetList } = await supabase
    .from("wishlists")
    .select("id, user_id")
    .eq("id", wishlistId)
    .maybeSingle();
  if (!targetList || targetList.user_id !== userRowId) {
    return Response.json({ error: "Wishlist not found" }, { status: 404 });
  }

  // Check current membership so toggle can branch correctly.
  const { data: existing } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("wishlist_id", wishlistId)
    .eq("listing_id", body.listingId)
    .maybeSingle();

  const shouldAdd =
    action === "add" || (action === "toggle" && !existing);
  const shouldRemove =
    action === "remove" || (action === "toggle" && !!existing);

  if (shouldAdd && !existing) {
    const { error } = await supabase.from("saved_listings").insert({
      user_id: userRowId,
      listing_id: body.listingId,
      wishlist_id: wishlistId,
    });
    if (error) {
      return Response.json({ error: "Failed to save" }, { status: 500 });
    }
  } else if (shouldRemove && existing) {
    const { error } = await supabase
      .from("saved_listings")
      .delete()
      .eq("wishlist_id", wishlistId)
      .eq("listing_id", body.listingId);
    if (error) {
      return Response.json({ error: "Failed to remove" }, { status: 500 });
    }
  }

  // Bump the list's updated_at so it sorts naturally.
  await supabase
    .from("wishlists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", wishlistId);

  // Return the full membership set for this listing across all lists
  // so the client can sync its heart state without another round-trip.
  const { data: memberRows } = await supabase
    .from("saved_listings")
    .select("wishlist_id")
    .eq("user_id", userRowId)
    .eq("listing_id", body.listingId);

  return Response.json({
    saved_in: (memberRows || []).map((r) => r.wishlist_id as string),
  });
}
