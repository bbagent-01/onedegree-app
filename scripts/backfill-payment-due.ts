/**
 * Backfill payment_due structured messages for payment_events rows
 * that already exist but didn't get their thread message posted —
 * e.g. accept-terms ran before the auto-post code landed. Idempotent:
 * skips events that already have a matching message in their thread.
 */
import { createClient } from "@supabase/supabase-js";

const PAYMENT_DUE_PREFIX = "__type:payment_due:";

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: events } = await sb
    .from("payment_events")
    .select("id, contact_request_id");
  if (!events || events.length === 0) {
    console.log("no payment_events rows");
    return;
  }

  const crIds = Array.from(new Set(events.map((e) => e.contact_request_id)));
  const { data: requests } = await sb
    .from("contact_requests")
    .select("id, listing_id, guest_id")
    .in("id", crIds);

  const threadByCr = new Map<string, string>();
  for (const r of requests || []) {
    const { data: t } = await sb
      .from("message_threads")
      .select("id")
      .eq("listing_id", r.listing_id)
      .eq("guest_id", r.guest_id)
      .maybeSingle();
    if (t) threadByCr.set(r.id as string, t.id as string);
  }

  let posted = 0;
  for (const ev of events) {
    const threadId = threadByCr.get(ev.contact_request_id);
    if (!threadId) continue;
    const content = `${PAYMENT_DUE_PREFIX}${ev.id}__`;
    const { data: existing } = await sb
      .from("messages")
      .select("id")
      .eq("thread_id", threadId)
      .eq("content", content)
      .maybeSingle();
    if (existing) continue;
    const { error } = await sb.from("messages").insert({
      thread_id: threadId,
      sender_id: null,
      content,
      is_system: true,
    });
    if (error) {
      console.error("insert failed:", ev.id, error.message);
      continue;
    }
    posted += 1;
    console.log(`posted payment_due for event ${ev.id}`);
  }
  console.log(`done — posted ${posted} messages`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
