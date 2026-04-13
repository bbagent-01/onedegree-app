export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// POST: set base availability for all days (replaces existing ranges, preserves booked stays)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();

  // Verify ownership
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) return new Response("User not found", { status: 404 });

  const { data: listing } = await supabase
    .from("listings")
    .select("id, host_id")
    .eq("id", listingId)
    .single();
  if (!listing) return Response.json({ error: "Listing not found" }, { status: 404 });
  if (listing.host_id !== currentUser.id) {
    return Response.json({ error: "Not the listing owner" }, { status: 403 });
  }

  const body = await req.json();
  const { start_date, end_date, status } = body;

  if (!start_date || !end_date || !status) {
    return Response.json({ error: "start_date, end_date, and status are required" }, { status: 400 });
  }

  const validStatuses = ["available", "possibly_available", "blocked"];
  if (!validStatuses.includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  // Delete ALL existing availability ranges for this listing
  const { error: deleteError } = await supabase
    .from("listing_availability")
    .delete()
    .eq("listing_id", listingId);

  if (deleteError) {
    console.error("Bulk delete error:", deleteError);
    return new Response("Failed to clear availability", { status: 500 });
  }

  // Get booked stays to leave gaps around them
  const { data: bookedStays } = await supabase
    .from("stay_confirmations")
    .select("check_in, check_out")
    .eq("listing_id", listingId)
    .or("host_confirmed.eq.true,guest_confirmed.eq.true");

  // Build set of booked dates
  const bookedDates = new Set<string>();
  for (const stay of bookedStays || []) {
    if (!stay.check_in || !stay.check_out) continue;
    let d = stay.check_in;
    while (d < stay.check_out) {
      bookedDates.add(d);
      d = addDays(d, 1);
    }
  }

  // Build contiguous ranges that skip booked dates
  const newRanges: { start: string; end: string }[] = [];
  let currentStart: string | null = null;
  let d = start_date;

  while (d <= end_date) {
    if (!bookedDates.has(d)) {
      if (!currentStart) currentStart = d;
    } else {
      if (currentStart) {
        newRanges.push({ start: currentStart, end: addDays(d, -1) });
        currentStart = null;
      }
    }
    d = addDays(d, 1);
  }
  if (currentStart) {
    newRanges.push({ start: currentStart, end: end_date });
  }

  if (newRanges.length === 0) {
    return Response.json({ message: "No days to set", created: 0 });
  }

  // Insert new ranges
  const inserts = newRanges.map((r) => ({
    listing_id: listingId,
    start_date: r.start,
    end_date: r.end,
    status,
  }));

  const { error } = await supabase.from("listing_availability").insert(inserts);
  if (error) {
    console.error("Bulk insert error:", error);
    return new Response("Failed to set availability", { status: 500 });
  }

  return Response.json({ message: "Bulk set complete", created: newRanges.length });
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
