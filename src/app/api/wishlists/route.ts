export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST { listingId: string }  — toggle saved/unsaved.
 * Returns { saved: boolean }.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  let body: { listingId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const listingId = body.listingId;
  if (typeof listingId !== "string" || listingId.length === 0) {
    return Response.json({ error: "listingId required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  // Toggle: delete if present, insert if absent.
  const { data: existing } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("saved_listings")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);
    if (error) {
      return Response.json({ error: "Failed to remove" }, { status: 500 });
    }
    return Response.json({ saved: false });
  }

  const { error } = await supabase
    .from("saved_listings")
    .insert({ user_id: user.id, listing_id: listingId });
  if (error) {
    return Response.json({ error: "Failed to save" }, { status: 500 });
  }
  return Response.json({ saved: true });
}
