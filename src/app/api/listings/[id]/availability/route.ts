export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id: listingId } = await params;
  const supabase = getSupabaseAdmin();

  const [{ data, error }, { data: stayRows }, { data: listingRow }] = await Promise.all([
    supabase
      .from("listing_availability")
      .select("*")
      .eq("listing_id", listingId)
      .order("start_date", { ascending: true }),
    supabase
      .from("stay_confirmations")
      .select("id, check_in, check_out")
      .eq("listing_id", listingId)
      .or("host_confirmed.eq.true,guest_confirmed.eq.true"),
    supabase
      .from("listings")
      .select("default_availability_status")
      .eq("id", listingId)
      .single(),
  ]);

  if (error) {
    console.error("Fetch availability error:", error);
    return Response.json({ error: "Failed to fetch availability" }, { status: 500 });
  }

  const bookedStays = (stayRows || [])
    .filter((s) => s.check_in && s.check_out)
    .map((s) => ({
      id: s.id,
      check_in: s.check_in as string,
      check_out: s.check_out as string,
    }));

  return Response.json({
    ranges: data || [],
    bookedStays,
    defaultStatus: listingRow?.default_availability_status ?? null,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id: listingId } = await params;
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

  const body = await req.json();
  const { start_date, end_date, status, custom_price_per_night, note } = body;

  if (!start_date || !end_date || !status) {
    return Response.json(
      { error: "start_date, end_date, and status are required" },
      { status: 400 }
    );
  }

  if (!["available", "possibly_available", "blocked"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  if (end_date < start_date) {
    return Response.json({ error: "end_date must be >= start_date" }, { status: 400 });
  }

  // Delete any overlapping ranges for this listing
  await supabase
    .from("listing_availability")
    .delete()
    .eq("listing_id", listingId)
    .lte("start_date", end_date)
    .gte("end_date", start_date);

  // Insert new range
  const { data: range, error: insertErr } = await supabase
    .from("listing_availability")
    .insert({
      listing_id: listingId,
      start_date,
      end_date,
      status,
      custom_price_per_night: custom_price_per_night || null,
      note: note || null,
    })
    .select("*")
    .single();

  if (insertErr) {
    console.error("Insert availability error:", insertErr);
    return Response.json({ error: "Failed to create availability range" }, { status: 500 });
  }

  return Response.json({ range });
}
