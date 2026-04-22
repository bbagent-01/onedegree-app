/**
 * Hourly cron logic — fires due check-in reminders and post-checkout review
 * prompts. Designed to be called from POST /api/cron/check-reminders, which
 * is in turn called by the standalone Cloudflare Worker every hour.
 *
 * Idempotent by design: a row's reminder won't fire twice because we set
 * checkin_reminder_sent_at / review_prompt_sent_at the moment we trigger.
 */

import { getSupabaseAdmin } from "./supabase";
import { emailCheckinReminder, emailReviewReminder } from "./email";
import {
  CHECKIN_REMINDER_PREFIX,
  REVIEW_PROMPT_PREFIX,
} from "./structured-messages";

interface AcceptedBooking {
  id: string;
  listing_id: string;
  guest_id: string;
  host_id: string;
  check_in: string;
  check_out: string;
  guest_count: number;
  checkin_reminder_sent_at: string | null;
  review_prompt_sent_at: string | null;
}

export interface CronResult {
  ranAt: string;
  checkinReminders: { fired: number; ids: string[] };
  reviewPrompts: { fired: number; ids: string[] };
  errors: string[];
}

export async function runReminderSweep(): Promise<CronResult> {
  const result: CronResult = {
    ranAt: new Date().toISOString(),
    checkinReminders: { fired: 0, ids: [] },
    reviewPrompts: { fired: 0, ids: [] },
    errors: [],
  };

  const supabase = getSupabaseAdmin();
  const todayISO = new Date().toISOString().split("T")[0];
  const tomorrowISO = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })();

  // ─── 1. Check-in reminders ─────────────────────────────────────────────
  // Find accepted bookings whose check_in is exactly tomorrow (so anything
  // from "right now" up to ~48h gets caught on at least one cron tick) and
  // we haven't already sent the reminder.
  try {
    const { data: dueCheckin, error } = await supabase
      .from("contact_requests")
      .select(
        "id, listing_id, guest_id, host_id, check_in, check_out, guest_count, checkin_reminder_sent_at, review_prompt_sent_at"
      )
      .eq("status", "accepted")
      .is("checkin_reminder_sent_at", null)
      .gte("check_in", todayISO)
      .lte("check_in", tomorrowISO);
    if (error) throw error;

    for (const booking of (dueCheckin || []) as AcceptedBooking[]) {
      try {
        await fireCheckinReminder(booking);
        result.checkinReminders.fired += 1;
        result.checkinReminders.ids.push(booking.id);
      } catch (e) {
        result.errors.push(`checkin ${booking.id}: ${stringifyError(e)}`);
      }
    }
  } catch (e) {
    result.errors.push(`checkin sweep failed: ${stringifyError(e)}`);
  }

  // ─── 2. Review prompts ─────────────────────────────────────────────────
  // Find accepted bookings whose check_out is on or before today (stay is
  // over) and we haven't already prompted for a review. We don't bother
  // bounding the lower end — if a booking from a month ago slips through
  // because it never got prompted, we'd rather catch it late than not at all.
  try {
    const { data: dueReview, error } = await supabase
      .from("contact_requests")
      .select(
        "id, listing_id, guest_id, host_id, check_in, check_out, guest_count, checkin_reminder_sent_at, review_prompt_sent_at"
      )
      .eq("status", "accepted")
      .is("review_prompt_sent_at", null)
      .lt("check_out", tomorrowISO)
      .not("check_out", "is", null);
    if (error) throw error;

    // Pre-resolve which bookings already have a guest-side review —
    // the cron's primary gate was review_prompt_sent_at = null,
    // which meant seed data and anything otherwise pre-populated
    // (stays that landed with ratings straight from the enrichment
    // seed, or a Loren-backfilled historical stay) fired a
    // duplicate "leave a review" email even though the review had
    // already been submitted. We'll skip those AND mark them sent
    // so the next sweep doesn't re-check.
    const dueIds = (dueReview || []).map((b) => b.id as string);
    let alreadyReviewed = new Set<string>();
    if (dueIds.length > 0) {
      const { data: reviewedRows } = await supabase
        .from("stay_confirmations")
        .select("contact_request_id, guest_rating")
        .in("contact_request_id", dueIds)
        .not("guest_rating", "is", null);
      alreadyReviewed = new Set(
        (reviewedRows || [])
          .map((r) => r.contact_request_id as string)
          .filter(Boolean)
      );
    }

    for (const booking of (dueReview || []) as AcceptedBooking[]) {
      // Belt-and-suspenders: only fire if check_out is actually <= today
      if (!booking.check_out || booking.check_out > todayISO) continue;

      if (alreadyReviewed.has(booking.id)) {
        // Silently mark sent — no email, no system message. This
        // keeps the sweep idempotent on stays that were already
        // reviewed before the cron ever saw them.
        await supabase
          .from("contact_requests")
          .update({ review_prompt_sent_at: new Date().toISOString() })
          .eq("id", booking.id);
        continue;
      }

      try {
        await fireReviewPrompt(booking);
        result.reviewPrompts.fired += 1;
        result.reviewPrompts.ids.push(booking.id);
      } catch (e) {
        result.errors.push(`review ${booking.id}: ${stringifyError(e)}`);
      }
    }
  } catch (e) {
    result.errors.push(`review sweep failed: ${stringifyError(e)}`);
  }

  return result;
}

function stringifyError(e: unknown): string {
  if (!e) return "unknown";
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    // Supabase errors are objects with { message, code, details, hint }
    const obj = e as Record<string, unknown>;
    if (obj.message) {
      return [obj.message, obj.code, obj.details].filter(Boolean).join(" | ");
    }
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

async function fireCheckinReminder(b: AcceptedBooking) {
  const supabase = getSupabaseAdmin();

  // Fetch surrounding context once
  const [{ data: listing }, { data: guest }, { data: host }, { data: thread }] =
    await Promise.all([
      supabase
        .from("listings")
        .select("id, title")
        .eq("id", b.listing_id)
        .maybeSingle(),
      supabase
        .from("users")
        .select("id, name")
        .eq("id", b.guest_id)
        .maybeSingle(),
      supabase
        .from("users")
        .select("id, name")
        .eq("id", b.host_id)
        .maybeSingle(),
      supabase
        .from("message_threads")
        .select("id")
        .eq("listing_id", b.listing_id)
        .eq("guest_id", b.guest_id)
        .maybeSingle(),
    ]);

  const listingTitle = listing?.title || "your stay";
  const guestName = guest?.name || "Guest";
  const hostName = host?.name || "Host";

  // Mark sent FIRST so a downstream failure (email, system message) can't
  // cause a second fire on the next cron tick.
  await supabase
    .from("contact_requests")
    .update({ checkin_reminder_sent_at: new Date().toISOString() })
    .eq("id", b.id);

  // Structured check-in reminder — thread view swaps in
  // SystemMilestoneCard (clock icon + arrival date subtitle) so
  // the reminder reads at the same weight as the rest of the
  // milestone timeline.
  if (thread) {
    await supabase.from("messages").insert({
      thread_id: thread.id,
      sender_id: null,
      content: CHECKIN_REMINDER_PREFIX,
      is_system: true,
    });
  }

  // Email both parties (each respects their own email_prefs)
  await Promise.all([
    emailCheckinReminder({
      recipientId: b.guest_id,
      recipientRole: "guest",
      guestName,
      hostName,
      listingTitle,
      checkIn: b.check_in,
      checkOut: b.check_out,
      threadId: thread?.id || null,
      bookingId: b.id,
    }),
    emailCheckinReminder({
      recipientId: b.host_id,
      recipientRole: "host",
      guestName,
      hostName,
      listingTitle,
      checkIn: b.check_in,
      checkOut: b.check_out,
      threadId: thread?.id || null,
      bookingId: b.id,
    }),
  ]);
}

async function fireReviewPrompt(b: AcceptedBooking) {
  const supabase = getSupabaseAdmin();

  const [{ data: listing }, { data: guest }, { data: host }, { data: thread }] =
    await Promise.all([
      supabase
        .from("listings")
        .select("id, title")
        .eq("id", b.listing_id)
        .maybeSingle(),
      supabase
        .from("users")
        .select("id, name")
        .eq("id", b.guest_id)
        .maybeSingle(),
      supabase
        .from("users")
        .select("id, name")
        .eq("id", b.host_id)
        .maybeSingle(),
      supabase
        .from("message_threads")
        .select("id")
        .eq("listing_id", b.listing_id)
        .eq("guest_id", b.guest_id)
        .maybeSingle(),
    ]);

  const listingTitle = listing?.title || "your stay";
  const guestName = guest?.name || "Guest";
  const hostName = host?.name || "Host";

  // Mark sent FIRST
  await supabase
    .from("contact_requests")
    .update({ review_prompt_sent_at: new Date().toISOString() })
    .eq("id", b.id);

  if (thread) {
    // Structured review_prompt message — the thread renderer turns
    // this into an inline card with "Leave a review" buttons for
    // both host and guest viewers. Plain-text fallback via
    // structuredMessageLabel so legacy surfaces still read OK.
    await supabase.from("messages").insert({
      thread_id: thread.id,
      sender_id: null,
      content: REVIEW_PROMPT_PREFIX,
      is_system: true,
    });
  }

  await emailReviewReminder({
    guestId: b.guest_id,
    guestName,
    hostName,
    listingTitle,
    bookingId: b.id,
  });
}
