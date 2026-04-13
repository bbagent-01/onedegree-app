export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// POST: bulk-set all unset days within a date window to a given status
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

  // Get existing ranges and booked stays for this listing
  const [{ data: existingRanges }, { data: bookedStays }] = await Promise.all([
    supabase
      .from("listing_availability")
      .select("start_date, end_date")
      .eq("listing_id", listingId),
    supabase
      .from("stay_confirmations")
      .select("check_in, check_out")
      .eq("listing_id", listingId)
      .or("host_confirmed.eq.true,guest_confirmed.eq.true"),
  ]);

  // Build a Set of all dates that are already set (have a range or booking)
  const setDates = new Set<string>();

  for (const range of existingRanges || []) {
    let d = range.start_date;
    while (d <= range.end_date) {
      setDates.add(d);
      d = addDays(d, 1);
    }
  }

  for (const stay of bookedStays || []) {
    if (!stay.check_in || !stay.check_out) continue;
    let d = stay.check_in;
    while (d < stay.check_out) {
      setDates.add(d);
      d = addDays(d, 1);
    }
  }

  // Find contiguous stretches of unset days and create ranges for them
  const unsetRanges: { start: string; end: string }[] = [];
  let currentStart: string | null = null;
  let d = start_date;

  while (d <= end_date) {
    if (!setDates.has(d)) {
      if (!currentStart) currentStart = d;
    } else {
      if (currentStart) {
        unsetRanges.push({ start: currentStart, end: addDays(d, -1) });
        currentStart = null;
      }
    }
    d = addDays(d, 1);
  }
  // Close final range
  if (currentStart) {
    unsetRanges.push({ start: currentStart, end: end_date });
  }

  if (unsetRanges.length === 0) {
    return Response.json({ message: "No unset days found", created: 0 });
  }

  // Insert the new ranges
  const inserts = unsetRanges.map((r) => ({
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

  return Response.json({ message: "Bulk set complete", created: unsetRanges.length });
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
