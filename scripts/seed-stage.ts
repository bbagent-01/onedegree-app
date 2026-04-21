/**
 * Seed a single lifecycle-stage reservation on demand so Loren can
 * jump to any stage of the booking flow without waiting calendar
 * time. Usage:
 *
 *   npx tsx --env-file=.env.local scripts/seed-stage.ts in-stay
 *   npx tsx --env-file=.env.local scripts/seed-stage.ts checked-out
 *   npx tsx --env-file=.env.local scripts/seed-stage.ts reviewed-by-host
 *
 * Each stage plants a reservation at the correct DB state AND
 * injects the matching thread messages so the thread renders as
 * if the flow had played out in real time. Host is picked per
 * stage so each walkthrough lives on its own thread.
 *
 * Guest is always lorenpolster@gmail.com.
 */
import { createClient } from "@supabase/supabase-js";
import {
  buildPolicyFromPreset,
  type CancellationPolicy,
} from "../src/lib/cancellation";

const TERMS_OFFERED_PREFIX = "__type:terms_offered__";
const TERMS_ACCEPTED_PREFIX = "__type:terms_accepted__";
const REVIEW_PROMPT_PREFIX = "__type:review_prompt__";
const PAYMENT_DUE_PREFIX = "__type:payment_due:";
const PAYMENT_CLAIMED_PREFIX = "__type:payment_claimed:";
const PAYMENT_CONFIRMED_PREFIX = "__type:payment_confirmed:";

function dateIso(offsetDays: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

type StageKey =
  | "review-ready"
  | "guest-reviewing-second"
  | "host-reviewing-second";

interface Scenario {
  label: StageKey;
  hostName: string;
  checkInOffset: number;
  checkOutOffset: number;
  nightlyRate: number;
  cleaningFee: number;
  guestCount: number;
  introMessage: string;
  postCheckinMessage?: boolean;
  postReviewPrompt?: boolean;
  guestReviewed?: boolean; // seeds a guest review
  hostReviewed?: boolean; // seeds a host review
}

// Three focused scenarios for testing the review flow. Each runs
// on a distinct host so threads don't collide. Loren is always
// the guest.
const SCENARIOS: Record<StageKey, Scenario> = {
  // Both sides need to review. Loren tests the guest review
  // flow from his account, then impersonates the host to test
  // the host side on the SAME thread.
  "review-ready": {
    label: "review-ready",
    hostName: "Rosa Delgado",
    checkInOffset: -14,
    checkOutOffset: -4,
    nightlyRate: 120,
    cleaningFee: 45,
    guestCount: 2,
    introMessage:
      "Hi Rosa — looking forward to Mexico City, we'll be in touch!",
    postReviewPrompt: true,
  },
  // Host has already reviewed the guest. Loren (guest) tests
  // what it feels like to review second — should see "they've
  // reviewed you" state via the ReviewPromptCard + modal.
  "guest-reviewing-second": {
    label: "guest-reviewing-second",
    hostName: "Priya Reddy",
    checkInOffset: -25,
    checkOutOffset: -15,
    nightlyRate: 110,
    cleaningFee: 40,
    guestCount: 1,
    introMessage: "Hi Priya — quick solo trip, can't wait!",
    postReviewPrompt: true,
    hostReviewed: true,
  },
  // Guest has already reviewed the host. Loren impersonates
  // the host to test the host-reviewing-second flow.
  "host-reviewing-second": {
    label: "host-reviewing-second",
    hostName: "Kai Stephens",
    checkInOffset: -20,
    checkOutOffset: -10,
    nightlyRate: 180,
    cleaningFee: 70,
    guestCount: 2,
    introMessage: "Hi Kai — thanks for hosting us, see you soon!",
    postReviewPrompt: true,
    guestReviewed: true,
  },
};

async function main() {
  const stage = process.argv[2] as StageKey | undefined;
  if (!stage || !SCENARIOS[stage]) {
    console.error(
      `Usage: seed-stage.ts <stage>\n  stages: ${Object.keys(SCENARIOS).join(", ")}`
    );
    process.exit(1);
  }
  const s = SCENARIOS[stage];

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
    console.error("lorenpolster@gmail.com user not found");
    process.exit(1);
  }

  const { data: host } = await sb
    .from("users")
    .select("id, name")
    .eq("name", s.hostName)
    .maybeSingle();
  if (!host) {
    console.error(`host not found: ${s.hostName}`);
    process.exit(1);
  }

  const { data: listings } = await sb
    .from("listings")
    .select("id, title, price_min, cleaning_fee")
    .eq("host_id", host.id)
    .limit(1);
  const listing = (listings || [])[0];
  if (!listing) {
    console.error(`no listings for host: ${s.hostName}`);
    process.exit(1);
  }

  const checkIn = dateIso(s.checkInOffset);
  const checkOut = dateIso(s.checkOutOffset);
  const nights = s.checkOutOffset - s.checkInOffset;
  const total = nights * s.nightlyRate + s.cleaningFee;

  const policy: CancellationPolicy = buildPolicyFromPreset(
    "installments",
    "moderate"
  );
  const acceptedAt = new Date(
    Date.now() + (s.checkInOffset - 5) * 86_400_000
  ).toISOString();

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
    console.error(`cr insert failed:`, crErr);
    process.exit(1);
  }

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
    console.error(`thread insert failed:`, tErr);
    process.exit(1);
  }
  const threadId = newThread.id as string;

  const msgs: Array<{
    content: string;
    is_system: boolean;
    sender_id: string | null;
    offsetMs: number;
  }> = [];
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

  const scheduleEntries = policy.payment_schedule;
  for (let i = 0; i < scheduleEntries.length; i++) {
    const entry = scheduleEntries[i];
    const cents = Math.round((total * 100 * entry.amount) / 100);
    const due =
      entry.due_at === "booking"
        ? checkIn
        : entry.due_at === "check_in"
          ? checkIn
          : dateIso(s.checkInOffset - (entry.days_before_checkin ?? 0));
    const { data: eventRow, error: evErr } = await sb
      .from("payment_events")
      .insert({
        contact_request_id: cr.id,
        schedule_index: i,
        amount_cents: cents,
        due_at: due,
        status: "confirmed",
        method: "venmo",
        claimed_at: new Date(
          new Date(due).getTime() + 60 * 60_000
        ).toISOString(),
        confirmed_at: new Date(
          new Date(due).getTime() + 2 * 60 * 60_000
        ).toISOString(),
      })
      .select("id")
      .single();
    if (evErr || !eventRow) {
      console.error("event insert failed:", evErr);
      continue;
    }
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
      content: REVIEW_PROMPT_PREFIX,
      is_system: true,
      sender_id: null,
      offsetMs: (t += 60_000),
    });
  }

  const msgRows = msgs.map((m) => ({
    thread_id: threadId,
    sender_id: m.sender_id,
    content: m.content,
    is_system: m.is_system,
    created_at: new Date(m.offsetMs).toISOString(),
  }));
  await sb.from("messages").insert(msgRows);

  // stay_confirmations row with optional pre-filled ratings
  const stayRow: Record<string, unknown> = {
    contact_request_id: cr.id,
    listing_id: listing.id,
    host_id: host.id,
    guest_id: loren.id,
    check_in: checkIn,
    check_out: checkOut,
    host_confirmed: true,
    guest_confirmed: true,
  };
  if (s.guestReviewed) {
    stayRow.host_rating = 5;
    stayRow.host_review_text = "Great host, warm and responsive throughout.";
  }
  if (s.hostReviewed) {
    stayRow.guest_rating = 5;
    stayRow.guest_review_text = "Easy communication, clean and respectful.";
  }
  await sb.from("stay_confirmations").insert(stayRow);

  console.log(`✓ ${s.label} seeded`);
  console.log(`  host: ${s.hostName} (${host.id})`);
  console.log(`  listing: ${listing.title}`);
  console.log(`  dates: ${checkIn} → ${checkOut}`);
  console.log(`  thread: ${threadId}`);
  console.log(`  cr: ${cr.id}`);
  console.log(
    `  inbox URL: https://alpha-c.onedegreebnb.com/inbox?thread=${threadId}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
