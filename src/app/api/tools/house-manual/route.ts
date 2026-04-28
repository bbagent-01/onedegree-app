export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

export async function GET(req: Request) {
  const { userId } = await effectiveAuth();
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
  if (!listingId) return Response.json({ manual: null });

  const { data } = await supabase
    .from("house_manuals")
    .select("*")
    .eq("listing_id", listingId)
    .eq("host_id", currentUser.id)
    .maybeSingle();

  return Response.json({ manual: data });
}

export async function POST(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) return new Response("User not found", { status: 404 });

  const body = await req.json();
  const { listingId, content } = body;

  if (!listingId || !content) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify ownership
  const { data: listing } = await supabase
    .from("listings")
    .select("host_id")
    .eq("id", listingId)
    .single();

  if (!listing || listing.host_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  // Upsert
  const { data: existing } = await supabase
    .from("house_manuals")
    .select("id")
    .eq("listing_id", listingId)
    .eq("host_id", currentUser.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("house_manuals")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    return Response.json({ id: existing.id });
  }

  const { data: manual, error } = await supabase
    .from("house_manuals")
    .insert({ listing_id: listingId, host_id: currentUser.id, content })
    .select("id")
    .single();

  if (error) return new Response("Failed to save", { status: 500 });
  return Response.json({ id: manual.id });
}
