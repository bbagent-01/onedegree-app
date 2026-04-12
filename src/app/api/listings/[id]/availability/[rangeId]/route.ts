export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; rangeId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id: listingId, rangeId } = await params;
  const supabase = getSupabaseAdmin();

  // Resolve Clerk ID → DB user ID
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!currentUser) return new Response("User not found", { status: 404 });

  // Verify ownership
  const { data: listing } = await supabase
    .from("listings")
    .select("host_id")
    .eq("id", listingId)
    .single();

  if (!listing || listing.host_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const { error } = await supabase
    .from("listing_availability")
    .delete()
    .eq("id", rangeId)
    .eq("listing_id", listingId);

  if (error) {
    console.error("Delete availability error:", error);
    return Response.json({ error: "Failed to delete range" }, { status: 500 });
  }

  return Response.json({ success: true });
}
