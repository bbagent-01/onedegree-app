/**
 * S5 validation seed. Creates two fresh reservations so Loren can
 * walk through the rest of the checklist without manually clicking
 * through the full request / approve / accept-terms cycle.
 *
 * Scenario C — Guest-side check-in reminder
 *   guest = Loren Polster (real account)
 *   host  = 1° connection (chosen below)
 *   check_in  = +1 day
 *   check_out = +4 days
 *   status    = accepted + terms accepted
 *   thread carries: reservation_request, terms_offered,
 *   terms_accepted (rendered suppressed), check-in reminder
 *
 * Scenario D — Host-side future stay (tests /trips host voice +
 *              sidebar timeline ellipsis)
 *   guest = Rosa Delgado (1° of Loren)
 *   host  = Loren Polster
 *   listing = one of Loren's preview-gated listings
 *   check_in  = +5 days
 *   check_out = +8 days
 *   status    = accepted + terms accepted
 *
 * Idempotent only in the sense that a fresh wipe-bookings run
 * precedes it. Run order:
 *   1. npx tsx scripts/wipe-bookings.ts
 *   2. npx tsx scripts/seed-s5-scenarios.ts
 */
import { createClient } from "@supabase/supabase-js";
import {
  buildPolicyFromPreset,
  type CancellationPolicy,
} from "../src/lib/cancellation";
import { createPaymentEventsForRequest } from "../src/lib/payment-events";

const RESERVATION_REQUEST_PREFIX = "__type:reservation_request__";
const TERMS_OFFERED_PREFIX = "__type:terms_offered__";
const TERMS_ACCEPTED_PREFIX = "__type:terms_accepted__";
const CHECKIN_REMINDER_PREFIX = "__type:checkin_reminder__";

const LOREN_ID = "d75cfbe8-0d0c-4014-bc19-af5c4e0621b1";

function dateIso(offsetDays: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const sb = createClient(url, key);

  // Scenario C — Loren is guest; pick first of his 1° hosts that
  // has a listing available.
  const { data: vouchesGiven } = await sb
    .from("vouches")
    .select("vouchee_id")
    .eq("voucher_id", LOREN_ID);
  const friendIds = (vouchesGiven || []).map((v) => v.vouchee_id as string);
  if (friendIds.length === 0) throw new Error("Loren has no vouches out");

  const { data: friendListings } = await sb
    .from("listings")
    .select("id, title, host_id, price_min")
    .in("host_id", friendIds)
    .not("price_min", "is", null)
    .limit(5);
  if (!friendListings || friendListings.length === 0) {
    throw new Error("No 1° listings found for Loren");
  }
  const hostListing = friendListings[0];
  const { data: hostUser } = await sb
    .from("users")
    .select("id, name")
    .eq("id", hostListing.host_id)
    .single();

  // Scenario D — Loren is host; pick one of his listings + a 1°
  // guest (prefer someone who has vouched for him).
  const { data: lorenListings } = await sb
    .from("listings")
    .select("id, title, price_min")
    .eq("host_id", LOREN_ID)
    .not("price_min", "is", null)
    .limit(5);
  if (!lorenListings || lorenListings.length === 0) {
    throw new Error("Loren has no listings");
  }
  const myListing = lorenListings[0];
  const { data: vouchesIn } = await sb
    .from("vouches")
    .select("voucher_id")
    .eq("vouchee_id", LOREN_ID)
    .limit(5);
  const guestCandidate =
    (vouchesIn || [])[0]?.voucher_id ?? friendIds[0];
  const { data: guestUser } = await sb
    .from("users")
    .select("id, name")
    .eq("id", guestCandidate)
    .single();

  // Installments/moderate gives two payments (50% five days before
  // check-in + 50% at check-in) so the seeded threads carry real
  // Payment 1 / Payment 2 cards. Refunds-only would only materialize
  // a single payment event.
  const policy: CancellationPolicy = buildPolicyFromPreset(
    "installments",
    "moderate"
  );

  async function seed({
    label,
    guestId,
    hostId,
    listingId,
    pricePerNight,
    guestFirstName,
    hostFirstName,
    checkInOffset,
    checkOutOffset,
    postCheckinReminder,
  }: {
    label: string;
    guestId: string;
    hostId: string;
    listingId: string;
    pricePerNight: number;
    guestFirstName: string;
    hostFirstName: string;
    checkInOffset: number;
    checkOutOffset: number;
    postCheckinReminder?: boolean;
  }) {
    const checkIn = dateIso(checkInOffset);
    const checkOut = dateIso(checkOutOffset);
    const nights = checkOutOffset - checkInOffset;
    const total = pricePerNight * nights;

    // Contact request (accepted + terms accepted)
    const nowIso = new Date().toISOString();
    const { data: cr, error: crErr } = await sb
      .from("contact_requests")
      .insert({
        listing_id: listingId,
        guest_id: guestId,
        host_id: hostId,
        message: `Excited for the stay — this is a seeded S5 ${label} scenario.`,
        check_in: checkIn,
        check_out: checkOut,
        guest_count: 2,
        total_estimate: total,
        original_check_in: checkIn,
        original_check_out: checkOut,
        original_guest_count: 2,
        original_total_estimate: total,
        original_cancellation_policy: policy,
        cancellation_policy: policy,
        status: "accepted",
        responded_at: nowIso,
        terms_accepted_at: nowIso,
      })
      .select("id")
      .single();
    if (crErr || !cr) throw crErr ?? new Error("no contact_request");

    // Message thread
    const { data: thread, error: thErr } = await sb
      .from("message_threads")
      .insert({
        listing_id: listingId,
        guest_id: guestId,
        host_id: hostId,
        contact_request_id: cr.id,
      })
      .select("id")
      .single();
    if (thErr || !thread) throw thErr ?? new Error("no thread");

    // Messages (oldest → newest)
    const earlier = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await sb.from("messages").insert([
      {
        thread_id: thread.id,
        sender_id: null,
        content: RESERVATION_REQUEST_PREFIX,
        is_system: true,
        created_at: earlier,
      },
      {
        thread_id: thread.id,
        sender_id: guestId,
        content: `Hi ${hostFirstName} — looking forward to the stay!`,
        is_system: false,
        created_at: earlier,
      },
      {
        thread_id: thread.id,
        sender_id: null,
        content: TERMS_OFFERED_PREFIX,
        is_system: true,
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      {
        thread_id: thread.id,
        sender_id: null,
        content: TERMS_ACCEPTED_PREFIX,
        is_system: true,
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
    ]);

    if (postCheckinReminder) {
      await sb.from("messages").insert({
        thread_id: thread.id,
        sender_id: null,
        content: CHECKIN_REMINDER_PREFIX,
        is_system: true,
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      });
    }

    // Materialize payment_events for this contact_request. Uses the
    // snapshotted cancellation_policy to derive the schedule. Also
    // posts `payment_due` structured messages into the thread per
    // event so PaymentDueCards render immediately.
    const events = await createPaymentEventsForRequest(cr.id);
    console.log(
      `✓ ${label}: guest=${guestFirstName} host=${hostFirstName} booking=${cr.id} thread=${thread.id} payment_events=${events.createdIds.length}${events.skipped ? ` (${events.skipped})` : ""}`
    );
    return { bookingId: cr.id, threadId: thread.id };
  }

  console.log("Seeding S5 scenarios…");
  await seed({
    label: "C (guest check-in tomorrow)",
    guestId: LOREN_ID,
    hostId: hostListing.host_id,
    listingId: hostListing.id,
    pricePerNight: hostListing.price_min ?? 140,
    guestFirstName: "Loren",
    hostFirstName: (hostUser?.name ?? "Host").split(" ")[0],
    checkInOffset: 1,
    checkOutOffset: 4,
    postCheckinReminder: true,
  });

  await seed({
    label: "D (host future stay)",
    guestId: guestCandidate,
    hostId: LOREN_ID,
    listingId: myListing.id,
    pricePerNight: myListing.price_min ?? 150,
    guestFirstName: (guestUser?.name ?? "Guest").split(" ")[0],
    hostFirstName: "Loren",
    checkInOffset: 5,
    checkOutOffset: 8,
  });

  console.log("\nDone. Ready to test on alpha-c.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
