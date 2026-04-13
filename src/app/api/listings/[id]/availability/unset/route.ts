export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// POST: delete all availability ranges overlapping a date window (returns days to "unset"/default)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;
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
    .select("host_id")
    .eq("id", listingId)
    .single();
  if (!listing || listing.host_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const { start_date, end_date } = await req.json();
  if (!start_date || !end_date) {
    return Response.json({ error: "start_date and end_date required" }, { status: 400 });
  }

  // Delete any ranges that overlap the selected window
  const { error } = await supabase
    .from("listing_availability")
    .delete()
    .eq("listing_id", listingId)
    .lte("start_date", end_date)
    .gte("end_date", start_date);

  if (error) {
    console.error("Unset error:", error);
    return new Response("Failed to unset", { status: 500 });
  }

  return Response.json({ ok: true });
}
