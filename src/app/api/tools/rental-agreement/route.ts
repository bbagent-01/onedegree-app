export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) return new Response("User not found", { status: 404 });

  const url = new URL(req.url);
  const listingId = url.searchParams.get("listingId");
  if (!listingId) return Response.json({ agreement: null });

  const { data } = await supabase
    .from("rental_agreements")
    .select("*")
    .eq("listing_id", listingId)
    .eq("host_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return Response.json({ agreement: data });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) return new Response("User not found", { status: 404 });

  const body = await req.json();
  const { listingId, content, stayConfirmationId } = body;

  if (!listingId || !content) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("host_id")
    .eq("id", listingId)
    .single();

  if (!listing || listing.host_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const { data: agreement, error } = await supabase
    .from("rental_agreements")
    .insert({
      listing_id: listingId,
      host_id: currentUser.id,
      content,
      stay_confirmation_id: stayConfirmationId || null,
    })
    .select("id")
    .single();

  if (error) return new Response("Failed to save", { status: 500 });
  return Response.json({ id: agreement.id });
}
