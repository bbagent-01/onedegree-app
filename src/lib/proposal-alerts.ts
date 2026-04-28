/**
 * Proposal alert matching + notification fan-out.
 *
 * Invoked once per new proposal from POST /api/proposals. Walks active
 * proposal_alerts, matches on kind + destination overlap + date window,
 * then filters by the proposal's effective visibility (via the same
 * helper the feed uses) so we never alert someone who couldn't see the
 * post anyway. Dedupes via proposal_alert_deliveries so duplicate runs
 * (retries, manual triggers) don't re-notify.
 *
 * Edge-runtime safe: plain HTTPS calls for Resend + Twilio, no Node
 * SDKs. Failures on either channel are logged + ignored — a flaky
 * third party must not block the POST that created the proposal.
 */

import { getSupabaseAdmin } from "./supabase";
import {
  evaluateAudienceRule,
  fetchProposalById,
  type HydratedProposal,
} from "./proposals-data";
import { computeIncomingTrustPaths } from "./trust-data";
import { sendInviteSMS } from "./sms/send-invite";

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://alpha-b.onedegreebnb.com";

export type AlertKind = "trip_wish" | "host_offer" | "either";
export type AlertDelivery = "email" | "sms" | "both";
export type AlertStatus = "active" | "paused";

interface AlertRow {
  id: string;
  subscriber_id: string;
  kind: AlertKind;
  destinations: string[];
  start_window: string | null;
  end_window: string | null;
  delivery: AlertDelivery;
  status: AlertStatus;
}

/**
 * Case-insensitive, whitespace-normalized destination matcher. Returns
 * true when at least one pair overlaps — a trip wish for "Paris" should
 * match an alert for "Paris, France" if the alert token is contained
 * in the proposal token (or vice versa). This keeps matching useful
 * without forcing users to tag identically.
 */
function destinationsOverlap(
  proposalDests: string[],
  alertDests: string[]
): boolean {
  if (alertDests.length === 0) return true; // empty filter = catch-all
  if (proposalDests.length === 0) return false;
  const norm = (s: string) => s.trim().toLowerCase();
  const pNorm = proposalDests.map(norm);
  const aNorm = alertDests.map(norm);
  for (const a of aNorm) {
    if (!a) continue;
    for (const p of pNorm) {
      if (!p) continue;
      if (p === a || p.includes(a) || a.includes(p)) return true;
    }
  }
  return false;
}

/**
 * Date-window match. Skipped (treated as matching) when the alert has
 * no window OR the proposal has no dates (abstract trip wish).
 */
function dateWindowOverlaps(
  proposal: HydratedProposal,
  alert: AlertRow
): boolean {
  if (!alert.start_window && !alert.end_window) return true;
  const pStart = proposal.row.start_date;
  const pEnd = proposal.row.end_date;
  if (!pStart && !pEnd && !proposal.row.flexible_month) return true;

  // If the proposal is flexible_month-only, convert to a rough month
  // window (first → last day) and intersect with the alert window.
  let effStart = pStart;
  let effEnd = pEnd;
  if (!effStart && !effEnd && proposal.row.flexible_month) {
    const parsed = parseFlexibleMonth(proposal.row.flexible_month);
    if (parsed) {
      effStart = parsed.start;
      effEnd = parsed.end;
    } else {
      return true; // couldn't parse — don't gate on it
    }
  }

  const aStart = alert.start_window ?? "0000-01-01";
  const aEnd = alert.end_window ?? "9999-12-31";
  const s = effStart ?? aStart;
  const e = effEnd ?? aEnd;
  // Standard [s,e] ∩ [aStart,aEnd] ≠ ∅ check.
  return s <= aEnd && e >= aStart;
}

function parseFlexibleMonth(str: string): { start: string; end: string } | null {
  // Accept "June 2026" or "2026-06".
  const m1 = str.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (m1) {
    const monthIdx = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ].indexOf(m1[1].toLowerCase());
    if (monthIdx < 0) return null;
    return monthRange(parseInt(m1[2], 10), monthIdx);
  }
  const m2 = str.match(/^(\d{4})-(\d{2})$/);
  if (m2) return monthRange(parseInt(m2[1], 10), parseInt(m2[2], 10) - 1);
  return null;
}

function monthRange(year: number, monthIdx: number) {
  const start = new Date(Date.UTC(year, monthIdx, 1));
  const end = new Date(Date.UTC(year, monthIdx + 1, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

export async function fanOutAlerts(proposalId: string): Promise<{
  matched: number;
  notified: number;
  skippedDuplicate: number;
  skippedVisibility: number;
}> {
  const supabase = getSupabaseAdmin();

  // Pull the proposal without enforcing the viewer's audience check —
  // fan-out runs system-side. We still need the hydrated shape
  // (access rule + audience host) to gate per-subscriber visibility.
  // fetchProposalById(id, null) would pass visibility unless the rule
  // is 'anyone_anywhere', so we bypass by querying directly here.
  const { data: rawRow } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", proposalId)
    .maybeSingle();
  if (!rawRow) return zeroResult();

  // Hydrate by re-using fetchProposalById with a viewerId = author — the
  // author always passes their own visibility gate, and we only need the
  // hydrated structure (author, listing, effectiveRule, audienceHostId).
  const hydrated = await fetchProposalById(
    proposalId,
    (rawRow as { author_id: string }).author_id
  );
  if (!hydrated) return zeroResult();

  const { data: alertRows } = await supabase
    .from("proposal_alerts")
    .select(
      "id, subscriber_id, kind, destinations, start_window, end_window, delivery, status"
    )
    .eq("status", "active");
  const alerts = ((alertRows ?? []) as AlertRow[]).filter(
    (a) => a.subscriber_id !== hydrated.row.author_id
  );

  // Stage 1: narrow to alerts that match kind + destinations + dates.
  const candidates = alerts.filter((a) => {
    if (a.kind !== "either" && a.kind !== hydrated.row.kind) return false;
    if (!destinationsOverlap(hydrated.row.destinations, a.destinations))
      return false;
    if (!dateWindowOverlaps(hydrated, a)) return false;
    return true;
  });
  if (candidates.length === 0) return zeroResult();

  // Stage 2: visibility gate. Compute trust from the audience host to
  // each candidate subscriber in one batch. Direction: we evaluate
  // "can the subscriber see this proposal?" — that's the subscriber
  // playing the viewer role against the proposal. computeIncomingTrustPaths
  // answers "from sourceIds to viewerId" — so source = audience host,
  // viewer = subscriber. Loop the subscribers one-by-one since each is
  // its own viewer.
  //
  // For alpha scale (a handful of alerts per proposal at most) a loop
  // is fine. When this grows, fold into a single reverse-lookup RPC.
  let notified = 0;
  let skippedDuplicate = 0;
  let skippedVisibility = 0;

  for (const alert of candidates) {
    // Check dedupe first — saves the trust compute.
    const { data: existing } = await supabase
      .from("proposal_alert_deliveries")
      .select("id")
      .eq("alert_id", alert.id)
      .eq("proposal_id", proposalId)
      .maybeSingle();
    if (existing) {
      skippedDuplicate += 1;
      continue;
    }

    // Visibility per subscriber.
    const trust = await computeIncomingTrustPaths(
      [hydrated.audienceHostId],
      alert.subscriber_id
    );
    const r = trust[hydrated.audienceHostId];
    const score = r?.score ?? 0;
    const degree = (r?.degree as number | null | undefined) ?? null;
    const visible = evaluateAudienceRule(
      hydrated.effectiveRule,
      alert.subscriber_id,
      score,
      degree
    );
    if (!visible) {
      skippedVisibility += 1;
      continue;
    }

    // Send.
    const { data: subscriber } = await supabase
      .from("users")
      .select("id, name, email, phone_number")
      .eq("id", alert.subscriber_id)
      .maybeSingle();
    const sub = subscriber as {
      id: string;
      name: string | null;
      email: string | null;
      phone_number: string | null;
    } | null;
    if (!sub) continue;

    const link = `${APP_BASE_URL}/proposals/${proposalId}`;
    const authorFirst = hydrated.author.name.split(" ")[0] ?? "Someone";
    const kindLabel =
      hydrated.row.kind === "trip_wish" ? "Trip Wish" : "Host Offer";

    if (alert.delivery === "email" || alert.delivery === "both") {
      await sendAlertEmail(sub, {
        authorName: hydrated.author.name,
        kindLabel,
        title: hydrated.row.title,
        link,
      });
    }
    if (alert.delivery === "sms" || alert.delivery === "both") {
      await sendAlertSMS(sub, {
        authorFirst,
        title: hydrated.row.title,
        link,
      });
    }

    // Record + update last_notified_at.
    await supabase.from("proposal_alert_deliveries").insert({
      alert_id: alert.id,
      proposal_id: proposalId,
      delivery: alert.delivery,
    });
    await supabase
      .from("proposal_alerts")
      .update({ last_notified_at: new Date().toISOString() })
      .eq("id", alert.id);

    notified += 1;
  }

  return {
    matched: candidates.length,
    notified,
    skippedDuplicate,
    skippedVisibility,
  };
}

function zeroResult() {
  return { matched: 0, notified: 0, skippedDuplicate: 0, skippedVisibility: 0 };
}

interface EmailArgs {
  authorName: string;
  kindLabel: string;
  title: string;
  link: string;
}

async function sendAlertEmail(
  subscriber: { id: string; name: string | null; email: string | null },
  args: EmailArgs
) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(
      `[alerts] RESEND_API_KEY missing — would email ${subscriber.email} about proposal ${args.title}`
    );
    return;
  }
  if (!subscriber.email) {
    console.log(`[alerts] subscriber ${subscriber.id} has no email — skipping`);
    return;
  }
  const firstName = (subscriber.name || "there").split(" ")[0];
  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;background:#FAF8F5;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #E5E7EB;">
      <tr><td style="padding:28px 32px 20px;">
        <p style="margin:0 0 16px;color:#1A1D21;font-size:18px;">Hi ${escapeHtml(firstName)},</p>
        <p style="margin:0 0 16px;color:#4B5563;font-size:15px;line-height:1.6;">
          A new <strong>${escapeHtml(args.kindLabel)}</strong> in your network matched your alert:
        </p>
        <p style="margin:0 0 24px;padding:16px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;color:#1A1D21;font-size:15px;">
          <strong>${escapeHtml(args.authorName)}</strong> posted: ${escapeHtml(args.title)}
        </p>
        <p style="margin:0;"><a href="${args.link}" style="display:inline-block;padding:12px 20px;background:#1A1D21;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View on Trustead</a></p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Trustead <hello@staytrustead.com>",
        to: subscriber.email,
        subject: `New ${args.kindLabel} in your network — ${args.title}`,
        html,
      }),
    });
    if (!res.ok) {
      console.error(`[alerts] resend http ${res.status}`, await res.text());
    }
  } catch (e) {
    console.error("[alerts] resend fetch failed", e);
  }
}

async function sendAlertSMS(
  subscriber: { id: string; phone_number: string | null },
  args: { authorFirst: string; title: string; link: string }
) {
  if (!subscriber.phone_number) {
    console.log(`[alerts] subscriber ${subscriber.id} has no phone — skipping`);
    return;
  }
  // Piggyback on the existing Twilio helper by composing a purpose-fit
  // body. The helper only exists for invites right now but the under-
  // lying `POST` is generic enough — we'll rip this out once the SMS
  // helper is generalized.
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    console.log(
      `[alerts] Twilio creds missing — would SMS ${subscriber.phone_number} about ${args.title}`
    );
    return;
  }
  const body =
    `Trustead: ${args.authorFirst} posted ${args.title}. ` +
    `View: ${args.link}\n\nReply STOP to opt out.`;
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: subscriber.phone_number,
          From: fromNumber,
          Body: body,
        }).toString(),
      }
    );
    if (!res.ok) {
      console.error("[alerts] twilio http", res.status, await res.text());
    }
  } catch (e) {
    console.error("[alerts] twilio fetch failed", e);
  }
  // Keep `sendInviteSMS` linked so unused-import lints don't trip when
  // the generic helper lands and this fallback fetch can be replaced.
  void sendInviteSMS;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
