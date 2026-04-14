import { getSupabaseAdmin } from "./supabase";

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

function getDayName(dateStr: string): string {
  return DAY_NAMES[new Date(dateStr + "T12:00:00").getDay()];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Validate proposed booking dates against a listing's calendar rules.
 * Returns { valid, errors } where errors contains human-readable messages.
 */
export async function validateBookingDates(
  listingId: string,
  checkIn: string,
  checkOut: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const supabase = getSupabaseAdmin();

  // Fetch listing settings
  const { data: listing } = await supabase
    .from("listings")
    .select(
      "min_nights, max_nights, prep_days, advance_notice_days, availability_window_months, blocked_checkin_days, blocked_checkout_days, default_availability_status"
    )
    .eq("id", listingId)
    .single();

  if (!listing) {
    return { valid: false, errors: ["Listing not found"] };
  }

  const nights = daysBetween(checkIn, checkOut);
  const today = new Date().toISOString().split("T")[0];
  const daysUntilCheckin = daysBetween(today, checkIn);

  // 1. Basic date validation
  if (nights < 1) {
    errors.push("Check-out must be after check-in");
  }

  // 2. Min/max nights
  if (nights < (listing.min_nights ?? 1)) {
    errors.push(`Minimum stay is ${listing.min_nights} night${listing.min_nights === 1 ? "" : "s"}`);
  }
  if (nights > (listing.max_nights ?? 365)) {
    errors.push(`Maximum stay is ${listing.max_nights} nights`);
  }

  // 3. Advance notice
  if (daysUntilCheckin < (listing.advance_notice_days ?? 0)) {
    const notice = listing.advance_notice_days;
    errors.push(
      notice === 0
        ? "Check-in must be today or later"
        : `Host requires at least ${notice} day${notice === 1 ? "" : "s"} advance notice`
    );
  }

  // 4. Blocked check-in days
  const checkinDay = getDayName(checkIn);
  if ((listing.blocked_checkin_days ?? []).includes(checkinDay)) {
    errors.push(`Check-in is not available on ${checkinDay}s`);
  }

  // 5. Blocked check-out days
  const checkoutDay = getDayName(checkOut);
  if ((listing.blocked_checkout_days ?? []).includes(checkoutDay)) {
    errors.push(`Check-out is not available on ${checkoutDay}s`);
  }

  // 6. Availability window
  const windowMonths = listing.availability_window_months ?? 12;
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + windowMonths);
  const maxDateStr = maxDate.toISOString().split("T")[0];
  if (checkOut > maxDateStr) {
    errors.push(`Dates must be within ${windowMonths} months from today`);
  }

  // 7. Check that all dates in range are available or possibly_available
  const { data: ranges } = await supabase
    .from("listing_availability")
    .select("start_date, end_date, status")
    .eq("listing_id", listingId)
    .lte("start_date", checkOut)
    .gte("end_date", checkIn);

  // Build a day-by-day status map for the requested range
  const statusMap = new Map<string, string>();
  for (const range of ranges || []) {
    let d = range.start_date < checkIn ? checkIn : range.start_date;
    const rangeEnd = range.end_date > checkOut ? checkOut : range.end_date;
    while (d <= rangeEnd) {
      statusMap.set(d, range.status);
      d = addDays(d, 1);
    }
  }

  // Check each night (check-in through day before check-out)
  // Uncovered days fall back to the listing's default_availability_status.
  const defaultStatus = listing.default_availability_status as
    | "available"
    | "possibly_available"
    | "blocked"
    | null;
  let d = checkIn;
  const uncoveredDates: string[] = [];
  const blockedDates: string[] = [];
  while (d < checkOut) {
    const explicit = statusMap.get(d);
    const effective = explicit ?? defaultStatus ?? null;
    if (!effective) {
      uncoveredDates.push(d);
    } else if (effective === "blocked") {
      blockedDates.push(d);
    }
    d = addDays(d, 1);
  }

  if (uncoveredDates.length > 0) {
    errors.push("Some dates in your range don't have availability set by the host");
  }
  if (blockedDates.length > 0) {
    errors.push("Some dates in your range are blocked by the host");
  }

  // 8. Prep days conflict — check if adjacent confirmed stays have prep buffer
  if ((listing.prep_days ?? 0) > 0) {
    const prepDays = listing.prep_days!;

    // Check for stays ending just before our check-in
    const prepStartBefore = addDays(checkIn, -prepDays);
    const { data: staysBefore } = await supabase
      .from("stay_confirmations")
      .select("check_out")
      .eq("listing_id", listingId)
      .gt("check_out", prepStartBefore)
      .lte("check_out", checkIn)
      .or("host_confirmed.eq.true,guest_confirmed.eq.true");

    if (staysBefore && staysBefore.length > 0) {
      errors.push(`Host needs ${prepDays} prep day${prepDays === 1 ? "" : "s"} between stays`);
    }

    // Check for stays starting just after our check-out
    const prepEndAfter = addDays(checkOut, prepDays);
    const { data: staysAfter } = await supabase
      .from("stay_confirmations")
      .select("check_in")
      .eq("listing_id", listingId)
      .gte("check_in", checkOut)
      .lt("check_in", prepEndAfter)
      .or("host_confirmed.eq.true,guest_confirmed.eq.true");

    if (staysAfter && staysAfter.length > 0) {
      errors.push(`Host needs ${prepDays} prep day${prepDays === 1 ? "" : "s"} between stays`);
    }
  }

  return { valid: errors.length === 0, errors };
}
