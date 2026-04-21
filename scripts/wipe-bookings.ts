/**
 * Wipe all booking-flow state from alpha-c so we can retest from
 * a clean slate. Preserves users, listings, photos, vouches,
 * house manuals, payment method settings, cancellation settings,
 * and invite tokens — just clears the reservation graph.
 *
 * Deletes (FK order):
 *   payment_events
 *   messages
 *   message_threads
 *   rental_agreements  (if any)
 *   security_deposits  (if any)
 *   [null vouches.stay_confirmation_id so vouches survive]
 *   stay_confirmations
 *   contact_requests
 *
 * Resets cached aggregates:
 *   users.host_rating / guest_rating → null
 *   users.host_review_count / guest_review_count → 0
 *   listings.avg_listing_rating → null
 *   listings.listing_review_count → 0
 */

import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const sb = createClient(url, key);

  const count = async (table: string): Promise<number> => {
    const { count: n } = await sb
      .from(table)
      .select("*", { count: "exact", head: true });
    return n ?? 0;
  };

  console.log("=== before ===");
  for (const t of [
    "payment_events",
    "messages",
    "message_threads",
    "stay_confirmations",
    "contact_requests",
    "rental_agreements",
    "security_deposits",
    "vouches",
  ]) {
    console.log(`  ${t}: ${await count(t)}`);
  }

  // FK-safe delete order. Most will cascade, but we delete
  // explicitly so the output shows each table's count.

  // payment_events → cascades from contact_requests, but wipe
  // first so we can verify the row count dropped.
  await sb.from("payment_events").delete().not("id", "is", null);

  // messages → cascades from message_threads.
  await sb.from("messages").delete().not("id", "is", null);

  // message_threads
  await sb.from("message_threads").delete().not("id", "is", null);

  // rental_agreements + security_deposits reference stay_confirmations.
  // These tables exist from migration 004 but are unused in alpha flow;
  // wipe anything that might be there.
  await sb.from("rental_agreements").delete().not("id", "is", null);
  await sb.from("security_deposits").delete().not("id", "is", null);

  // Preserve vouches but null their stay_confirmation_id so the
  // FK doesn't block the stay_confirmations delete. Post-stay
  // vouches will lose their "from this stay" link but the vouch
  // itself survives.
  await sb
    .from("vouches")
    .update({ stay_confirmation_id: null })
    .not("stay_confirmation_id", "is", null);

  // stay_confirmations (reviews)
  await sb.from("stay_confirmations").delete().not("id", "is", null);

  // contact_requests
  await sb.from("contact_requests").delete().not("id", "is", null);

  // Reset cached aggregates on users. Both score + count reset
  // together so nothing leaks.
  await sb
    .from("users")
    .update({
      host_rating: null,
      guest_rating: null,
      host_review_count: 0,
      guest_review_count: 0,
    })
    .not("id", "is", null);

  // Reset cached aggregates on listings.
  await sb
    .from("listings")
    .update({
      avg_listing_rating: null,
      listing_review_count: 0,
    })
    .not("id", "is", null);

  console.log("=== after ===");
  for (const t of [
    "payment_events",
    "messages",
    "message_threads",
    "stay_confirmations",
    "contact_requests",
    "rental_agreements",
    "security_deposits",
    "vouches",
  ]) {
    console.log(`  ${t}: ${await count(t)}`);
  }

  // Sanity check: any users still showing review counts?
  const { data: stillRated } = await sb
    .from("users")
    .select("id, name, host_rating, guest_rating, host_review_count, guest_review_count")
    .or(
      "host_rating.not.is.null,guest_rating.not.is.null,host_review_count.gt.0,guest_review_count.gt.0"
    );
  if (stillRated && stillRated.length) {
    console.log("WARNING: users still have rating/count values:");
    console.log(stillRated);
  } else {
    console.log("✓ All user rating aggregates cleared");
  }

  const { data: stillListingRated } = await sb
    .from("listings")
    .select("id, title, avg_listing_rating, listing_review_count")
    .or("avg_listing_rating.not.is.null,listing_review_count.gt.0");
  if (stillListingRated && stillListingRated.length) {
    console.log("WARNING: listings still have rating/count values:");
    console.log(stillListingRated);
  } else {
    console.log("✓ All listing rating aggregates cleared");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
