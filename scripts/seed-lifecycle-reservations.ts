/**
 * Seed two lifecycle-stage reservations so Loren can end-to-end
 * test during-stay + checked-out + review flows without waiting
 * calendar time.
 *
 * Reservation A — in-stay
 *   guest = Loren Polster
 *   host  = Maya Chen
 *   check_in  = today - 3 days
 *   check_out = today + 3 days
 *   status    = accepted + terms accepted + all payments confirmed
 *   thread contains: terms_offered, terms_accepted, payment_confirmed
 *   and a check-in reminder system message (so the in-stay feed
 *   carries the heads-up card that the cron normally posts).
 *
 * Reservation B — checked out
 *   guest = Loren Polster
 *   host  = Yuki Tanaka
 *   check_in  = today - 10 days
 *   check_out = today - 2 days
 *   status    = accepted + terms accepted + all payments confirmed
 *   thread adds: review prompt system message.
 *   stay_confirmations row left unreviewed so Loren can walk the
 *   review UI on both sides.
 *
 * Idempotent — skips if a reservation already exists on the same
 * (listing, guest, check_in) triple.
 */
import { createClient } from "@supabase/supabase-js";
import {
  buildPolicyFromPreset,
  type CancellationPolicy,
} from "../src/lib/cancellation";

const TERMS_OFFERED_PREFIX = "__type:terms_offered__";
const TERMS_ACCEPTED_PREFIX = "__type:terms_accepted__";
const PAYMENT_DUE_PREFIX = "__type:payment_due:";
const PAYMENT_CLAIMED_PREFIX = "__type:payment_claimed:";
const PAYMENT_CONFIRMED_PREFIX = "__type:payment_confirmed:";

function dateIso(offsetDays: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

interface Scenario {
  label: string;
  guestName: string;
  hostName: string;
  listingSlugHint: string[]; // any of these substrings in title
  checkInOffset: number;
  checkOutOffset: number;
  nightlyRate: number;
  cleaningFee: number;
  guestCount: number;
  introMessage: string;
  postCheckinMessage?: boolean;
  postReviewPrompt?: boolean;
  guestAlreadyLeftReview?: boolean;
  hostAlreadyLeftReview?: boolean;
}

const SCENARIOS: Scenario[] = [
  {
    label: "in-stay",
    guestName: "Loren Polster",
    hostName: "Maya Chen",
    listingSlugHint: ["maya", "berlin", "flat"],
    checkInOffset: -3,
    checkOutOffset: +3,
    nightlyRate: 140,
    cleaningFee: 60,
    guestCount: 2,
    introMessage:
      "Hi Maya — excited for the stay! I'll text when I'm heading over.",
    postCheckinMessage: true,
  },
  {
    label: "checked-out",
    guestName: "Loren Polster",
    hostName: "Yuki Tanaka",
    listingSlugHint: ["yuki", "kyoto", "machiya"],
    checkInOffset: -10,
    checkOutOffset: -2,
    nightlyRate: 165,
    cleaningFee: 50,
    guestCount: 1,
    introMessage: "Hi Yuki — thanks again, can't wait to settle in.",
    postReviewPrompt: true,
  },
  {
    label: "checked-out-clean",
    guestName: "Loren Polster",
    hostName: "Rosa Delgado",
    listingSlugHint: ["rosa", "mexico", "roma"],
    checkInOffset: -14,
    checkOutOffset: -4,
    nightlyRate: 120,
    cleaningFee: 45,
    guestCount: 2,
    introMessage:
      "Hi Rosa — looking forward to Mexico City, we'll be in touch!",
    postReviewPrompt: true,
  },
];

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: loren } = await sb
    .from("users")
    .select("id, name")
    .eq("email", "lorenpolster@gmail.com")
    .maybeSingle();
  if (!loren) {
    console.error(
      "lorenpolster@gmail.com user not found — adjust this script."
    );
    process.exit(1);
  }

  for (const s of SCENARIOS) {
    console.log(`\n=== ${s.label} — host=${s.hostName}`);
    const { data: host } = await sb
      .from("users")
      .select("id, name, payment_methods, cancellation_policy")
      .eq("name", s.hostName)
      .maybeSingle();
    if (!host) {
      console.warn(`  host not found: ${s.hostName} — skip`);
      continue;
    }

    // Pick a listing this host owns. Prefer one matching any hint
    // substring; fall back to their first listing.
    const { data: listings } = await sb
      .from("listings")
      .select("id, title, price_min, cleaning_fee, cancellation_policy_override")
      .eq("host_id", host.id);
    if (!listings || listings.length === 0) {
      console.warn(`  no listings for ${s.hostName} — skip`);
      continue;
    }
    const hinted = listings.find((l) =>
      s.listingSlugHint.some((h) =>
        (l.title as string).toLowerCase().includes(h)
      )
    );
    const listing = hinted ?? listings[0];
    console.log(`  listing: ${listing.title}`);

    const checkIn = dateIso(s.checkInOffset);
    const checkOut = dateIso(s.checkOutOffset);

    // Idempotency — skip if the exact (listing, guest, check_in)
    // reservation already exists in any status.
    const { data: existing } = await sb
      .from("contact_requests")
      .select("id, status")
      .eq("listing_id", listing.id)
      .eq("guest_id", loren.id)
      .eq("check_in", checkIn)
      .maybeSingle();
    if (existing) {
      console.log(
        `  already exists (id=${existing.id}, status=${existing.status}) — skip`
      );
      continue;
    }

    const nights = s.checkOutOffset - s.checkInOffset;
    const total = nights * s.nightlyRate + s.cleaningFee;

    // Lock in a moderate / installments policy snapshot for this
    // reservation so the schedule → events path has something to
    // work with. Also stamp it as the original_policy so the
    // terms_offered card won't fire a Host updated pill.
    const policy: CancellationPolicy = buildPolicyFromPreset(
      "installments",
      "moderate"
    );

    const acceptedAt = new Date(
      Date.now() + (s.checkInOffset - 5) * 86_400_000
    ).toISOString(); // some past timestamp before check_in

    // 1. Insert the contact_request in the final accepted state.
    const { data: cr, error: crErr } = await sb
      .from("contact_requests")
      .insert({
        listing_id: listing.id,
        guest_id: loren.id,
        host_id: host.id,
        message: s.introMessage,
        check_in: checkIn,
        check_out: checkOut,
        guest_count: s.guestCount,
        total_estimate: total,
        original_check_in: checkIn,
        original_check_out: checkOut,
        original_guest_count: s.guestCount,
        original_total_estimate: total,
        cancellation_policy: policy,
        original_cancellation_policy: policy,
        terms_accepted_at: acceptedAt,
        status: "accepted",
        responded_at: new Date(
          Date.now() + (s.checkInOffset - 6) * 86_400_000
        ).toISOString(),
        checkin_reminder_sent_at: s.postCheckinMessage
          ? new Date(
              Date.now() + (s.checkInOffset - 1) * 86_400_000
            ).toISOString()
          : null,
        review_prompt_sent_at: s.postReviewPrompt
          ? new Date(
              Date.now() + (s.checkOutOffset + 0) * 86_400_000
            ).toISOString()
          : null,
      })
      .select("id")
      .single();
    if (crErr || !cr) {
      console.error(`  cr insert failed:`, crErr);
      continue;
    }
    console.log(`  cr: ${cr.id}`);

    // 2. Get or create the thread.
    const { data: existingThread } = await sb
      .from("message_threads")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("guest_id", loren.id)
      .maybeSingle();
    let threadId = existingThread?.id as string | undefined;
    if (!threadId) {
      const { data: newThread, error: tErr } = await sb
        .from("message_threads")
        .insert({
          listing_id: listing.id,
          guest_id: loren.id,
          host_id: host.id,
          contact_request_id: cr.id,
        })
        .select("id")
        .single();
      if (tErr || !newThread) {
        console.error(`  thread create failed:`, tErr);
        continue;
      }
      threadId = newThread.id as string;
    } else {
      await sb
        .from("message_threads")
        .update({ contact_request_id: cr.id })
        .eq("id", threadId);
    }
    console.log(`  thread: ${threadId}`);

    // 3. Thread history — in chronological order.
    const msgs: Array<{ content: string; is_system: boolean; sender_id: string | null; offsetMs: number }> = [];
    const base = new Date(acceptedAt).getTime();
    let t = base - 10 * 60_000;
    msgs.push({
      content: `${loren.name!.split(" ")[0].toLowerCase()} requested to reserve from ${checkIn} to ${checkOut} · ${s.guestCount} guest${s.guestCount === 1 ? "" : "s"}.`,
      is_system: true,
      sender_id: null,
      offsetMs: (t += 1_000),
    });
    msgs.push({
      content: s.introMessage,
      is_system: false,
      sender_id: loren.id as string,
      offsetMs: (t += 1_000),
    });
    msgs.push({
      content: TERMS_OFFERED_PREFIX,
      is_system: true,
      sender_id: null,
      offsetMs: (t += 60_000),
    });
    msgs.push({
      content: TERMS_ACCEPTED_PREFIX,
      is_system: true,
      sender_id: null,
      offsetMs: (t += 60_000),
    });

    // 4. Payment events (all confirmed) + their thread messages.
    const scheduleEntries = policy.payment_schedule;
    const events: Array<{ idx: number; cents: number; due: string }> =
      scheduleEntries.map((entry, i) => {
        const cents = Math.round((total * 100 * entry.amount) / 100);
        const due =
          entry.due_at === "booking"
            ? checkIn
            : entry.due_at === "check_in"
              ? checkIn
              : dateIso(
                  s.checkInOffset - (entry.days_before_checkin ?? 0)
                );
        return { idx: i, cents, due };
      });

    for (const ev of events) {
      const { data: eventRow, error: evErr } = await sb
        .from("payment_events")
        .insert({
          contact_request_id: cr.id,
          schedule_index: ev.idx,
          amount_cents: ev.cents,
          due_at: ev.due,
          status: "confirmed",
          method: "venmo",
          claimed_at: new Date(
            new Date(ev.due).getTime() + 60 * 60_000
          ).toISOString(),
          confirmed_at: new Date(
            new Date(ev.due).getTime() + 2 * 60 * 60_000
          ).toISOString(),
        })
        .select("id")
        .single();
      if (evErr || !eventRow) {
        console.error(`  event insert failed:`, evErr);
        continue;
      }
      // Post all 3 messages so the thread reads as a full payment
      // lifecycle; the renderer will show only the confirmed card
      // because event.status = confirmed.
      msgs.push({
        content: `${PAYMENT_DUE_PREFIX}${eventRow.id}__`,
        is_system: true,
        sender_id: null,
        offsetMs: (t += 60_000),
      });
      msgs.push({
        content: `${PAYMENT_CLAIMED_PREFIX}${eventRow.id}__`,
        is_system: true,
        sender_id: null,
        offsetMs: (t += 60_000),
      });
      msgs.push({
        content: `${PAYMENT_CONFIRMED_PREFIX}${eventRow.id}__`,
        is_system: true,
        sender_id: null,
        offsetMs: (t += 60_000),
      });
    }

    // 5. Optional lifecycle system messages.
    if (s.postCheckinMessage) {
      msgs.push({
        content: `Heads up — check-in is tomorrow (${checkIn}). Coordinate any last-minute details here.`,
        is_system: true,
        sender_id: null,
        offsetMs: (t += 60_000),
      });
    }
    if (s.postReviewPrompt) {
      msgs.push({
        content: `${loren.name!.split(" ")[0]}'s stay just wrapped up. Leaving a review helps everyone in the network.`,
        is_system: true,
        sender_id: null,
        offsetMs: (t += 60_000),
      });
    }

    // 6. Flush all messages.
    const msgRows = msgs.map((m) => ({
      thread_id: threadId,
      sender_id: m.sender_id,
      content: m.content,
      is_system: m.is_system,
      created_at: new Date(m.offsetMs).toISOString(),
    }));
    const { error: msgErr } = await sb.from("messages").insert(msgRows);
    if (msgErr) {
      console.error(`  messages insert failed:`, msgErr);
    }

    // 7. stay_confirmations row (unreviewed) so the review flow
    //    has somewhere to land.
    const { data: existingStay } = await sb
      .from("stay_confirmations")
      .select("id")
      .eq("contact_request_id", cr.id)
      .maybeSingle();
    if (!existingStay) {
      await sb.from("stay_confirmations").insert({
        contact_request_id: cr.id,
        listing_id: listing.id,
        host_id: host.id,
        guest_id: loren.id,
        check_in: checkIn,
        check_out: checkOut,
        host_confirmed: true,
        guest_confirmed: true,
      });
    }
    console.log(`  done — posted ${msgRows.length} messages, ${events.length} events`);
  }

  console.log("\nall done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
