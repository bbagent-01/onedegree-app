/**
 * Payment-due cron logic — posts `payment_due` structured messages
 * into the thread when a scheduled payment's window opens.
 *
 * Modeled after `cron-reminders.ts`. Called from
 * POST /api/cron/payment-due by the standalone Cloudflare Worker.
 *
 * Idempotency: we only post when NO existing `payment_due:<id>`
 * message is in the thread for that event. A second tick is a
 * no-op. We open the window 2 days early so guests have a head
 * start on the arrangement before the nominal due date.
 */

import { getSupabaseAdmin } from "./supabase";
import { PAYMENT_DUE_PREFIX, paymentDueMessage } from "@/components/booking/ThreadTermsCards";

const WINDOW_OPEN_LEAD_DAYS = 2;

export interface PaymentDueCronResult {
  ranAt: string;
  posted: { fired: number; ids: string[] };
  errors: string[];
}

interface ScheduledEvent {
  id: string;
  contact_request_id: string;
  schedule_index: number;
  due_at: string;
}

export async function runPaymentDueSweep(): Promise<PaymentDueCronResult> {
  const result: PaymentDueCronResult = {
    ranAt: new Date().toISOString(),
    posted: { fired: 0, ids: [] },
    errors: [],
  };

  const supabase = getSupabaseAdmin();

  // Window: events due today or within the next N days, still in
  // scheduled state. Events whose due_at is already in the past
  // (edge case: cron skipped a few days, or accept-terms landed
  // super close to check-in) are picked up too by the simple
  // `due_at <= cutoff` bound.
  const cutoffISO = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + WINDOW_OPEN_LEAD_DAYS);
    return d.toISOString().slice(0, 10);
  })();

  try {
    const { data: dueEvents, error } = await supabase
      .from("payment_events")
      .select("id, contact_request_id, schedule_index, due_at")
      .eq("status", "scheduled")
      .lte("due_at", cutoffISO);
    if (error) throw error;

    const events = (dueEvents || []) as ScheduledEvent[];
    if (events.length === 0) return result;

    // Group by contact_request to batch the thread lookups. Most
    // reservations have 1–2 events, but grouping scales cleanly
    // if hosts configure finer schedules.
    const requestIds = Array.from(
      new Set(events.map((e) => e.contact_request_id))
    );
    const { data: requests } = await supabase
      .from("contact_requests")
      .select("id, listing_id, guest_id")
      .in("id", requestIds);

    const { data: threads } = await supabase
      .from("message_threads")
      .select("id, listing_id, guest_id")
      .in("listing_id", (requests || []).map((r) => r.listing_id));

    const threadByRequestId = new Map<string, string>();
    for (const r of requests || []) {
      const t = (threads || []).find(
        (x) => x.listing_id === r.listing_id && x.guest_id === r.guest_id
      );
      if (t) threadByRequestId.set(r.id as string, t.id as string);
    }

    // Check which events already have a payment_due message posted.
    // `messages.content` is indexed for prefix matching only via
    // the DB's GIN-less scan — we pre-filter on the prefix and
    // then match by event id. With payment messages scoped per
    // thread this stays cheap.
    const threadIds = Array.from(new Set(threadByRequestId.values()));
    const alreadyPosted = new Set<string>();
    if (threadIds.length > 0) {
      const { data: existingDueMsgs } = await supabase
        .from("messages")
        .select("content")
        .in("thread_id", threadIds)
        .like("content", `${PAYMENT_DUE_PREFIX}%`);
      for (const row of existingDueMsgs || []) {
        const content = row.content as string;
        // Extract the event id between prefix and suffix
        const rest = content.slice(PAYMENT_DUE_PREFIX.length);
        const end = rest.indexOf("__");
        if (end > 0) alreadyPosted.add(rest.slice(0, end));
      }
    }

    for (const ev of events) {
      if (alreadyPosted.has(ev.id)) continue;
      const threadId = threadByRequestId.get(ev.contact_request_id);
      if (!threadId) continue;
      try {
        await supabase.from("messages").insert({
          thread_id: threadId,
          sender_id: null,
          content: paymentDueMessage(ev.id),
          is_system: true,
        });
        result.posted.fired += 1;
        result.posted.ids.push(ev.id);
      } catch (e) {
        result.errors.push(
          `payment_due ${ev.id}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
  } catch (e) {
    result.errors.push(
      `sweep failed: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  return result;
}
