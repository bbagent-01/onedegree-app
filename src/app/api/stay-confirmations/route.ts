export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

// GET: fetch stay confirmations for current user
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
  const role = url.searchParams.get("role"); // "host" or "guest" or null (both)

  let query = supabase.from("stay_confirmations").select("*");

  if (role === "host") {
    query = query.eq("host_id", currentUser.id);
  } else if (role === "guest") {
    query = query.eq("guest_id", currentUser.id);
  } else {
    query = query.or(`host_id.eq.${currentUser.id},guest_id.eq.${currentUser.id}`);
  }

  query = query.order("created_at", { ascending: false });

  const { data: stays, error } = await query;
  if (error) return new Response("Failed to fetch", { status: 500 });

  // Enrich with user + listing info
  const listingIds = [...new Set((stays || []).map((s) => s.listing_id))];
  const userIds = [
    ...new Set((stays || []).flatMap((s) => [s.guest_id, s.host_id])),
  ];

  const [{ data: listings }, { data: users }] = await Promise.all([
    supabase
      .from("listings")
      .select("id, title, area_name")
      .in("id", listingIds.length ? listingIds : ["_"]),
    supabase
      .from("users")
      .select("id, name, avatar_url, guest_rating, guest_review_count, host_rating, host_review_count, vouch_power")
      .in("id", userIds.length ? userIds : ["_"]),
  ]);

  const listingMap = new Map((listings || []).map((l) => [l.id, l]));
  const userMap = new Map((users || []).map((u) => [u.id, u]));

  const enriched = (stays || []).map((s) => ({
    ...s,
    listing: listingMap.get(s.listing_id) || null,
    guest: userMap.get(s.guest_id) || null,
    host: userMap.get(s.host_id) || null,
  }));

  return Response.json({ stays: enriched, currentUserId: currentUser.id });
}

// POST: create stay confirmation from an accepted contact request
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
  const { contactRequestId } = body;

  if (!contactRequestId) {
    return Response.json({ error: "contactRequestId is required" }, { status: 400 });
  }

  // Get the contact request
  const { data: cr } = await supabase
    .from("contact_requests")
    .select("*")
    .eq("id", contactRequestId)
    .single();

  if (!cr) {
    return Response.json({ error: "Contact request not found" }, { status: 404 });
  }

  if (cr.status !== "accepted") {
    return Response.json({ error: "Contact request must be accepted first" }, { status: 400 });
  }

  // Verify caller is host or guest
  if (cr.host_id !== currentUser.id && cr.guest_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  // Check for existing stay confirmation for this request
  const { data: existing } = await supabase
    .from("stay_confirmations")
    .select("id")
    .eq("contact_request_id", contactRequestId)
    .maybeSingle();

  if (existing) {
    return Response.json({ error: "Stay confirmation already exists", id: existing.id }, { status: 409 });
  }

  const isHost = cr.host_id === currentUser.id;

  const { data: stay, error } = await supabase
    .from("stay_confirmations")
    .insert({
      contact_request_id: contactRequestId,
      listing_id: cr.listing_id,
      host_id: cr.host_id,
      guest_id: cr.guest_id,
      check_in: cr.check_in,
      check_out: cr.check_out,
      host_confirmed: isHost,
      guest_confirmed: !isHost,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Stay confirmation insert error:", error);
    return new Response("Failed to create", { status: 500 });
  }

  return Response.json({ id: stay.id });
}
