/**
 * Transactional email helper for Track B (CC-B6b).
 *
 * Wraps Resend with simple HTML templates for the four booking lifecycle
 * notifications. All sends are wrapped in try/catch — email failures must
 * never block the originating API request.
 */

import { Resend } from "resend";
import { getSupabaseAdmin } from "./supabase";

const FROM = "One Degree BNB <notifications@onedegreebnb.com>";
// Replies route back to a real mailbox so anyone hitting Reply still
// reaches a human while we're in alpha. Future: parse inbound replies via
// Resend's Inbound API and post them as messages into the originating thread.
const REPLY_TO = "loren@onedegreebnb.com";
const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://alpha-b.onedegreebnb.com";

export type EmailKind =
  | "booking_request"
  | "booking_confirmed"
  | "booking_declined"
  | "new_message"
  | "review_reminder";

interface UserRecipient {
  id: string;
  name: string | null;
  email: string | null;
  email_prefs?: Partial<Record<EmailKind, boolean>> | null;
}

interface SendOpts {
  to: UserRecipient;
  kind: EmailKind;
  subject: string;
  html: string;
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

async function fetchRecipient(userId: string): Promise<UserRecipient | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("id, name, email, email_prefs")
    .eq("id", userId)
    .maybeSingle();
  return (data as UserRecipient) || null;
}

async function send({ to, kind, subject, html }: SendOpts) {
  const resend = getResend();
  if (!resend) {
    console.log(`[email] RESEND_API_KEY missing — would send ${kind} to ${to.email}`);
    return { skipped: true as const };
  }
  if (!to.email) {
    console.log(`[email] no email on user ${to.id} — skipping ${kind}`);
    return { skipped: true as const };
  }
  // Honor user preference; default = true if unset
  const prefs = to.email_prefs || {};
  if (prefs[kind] === false) {
    console.log(`[email] user ${to.id} opted out of ${kind} — skipping`);
    return { skipped: true as const };
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: to.email,
      replyTo: REPLY_TO,
      subject,
      html,
    });
    return { ok: true as const, id: result.data?.id };
  } catch (e) {
    // Never let email failures bubble up
    console.error(`[email] send failed for ${kind}:`, e);
    return { ok: false as const, error: String(e) };
  }
}

/* ---------- Templates ---------- */
// Visual style mirrors the landing page survey email so transactional mail
// from app.* feels like the same brand. Playfair Display headline, cream
// background, gradient purple CTA, wordmark logo from onedegreebnb.com.

const WORDMARK_URL = "https://onedegreebnb.com/images/wordmark-gradient.svg";

const wrap = (greeting: string, body: string) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#FAF8F5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF8F5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
          <tr>
            <td style="padding:32px 40px 24px;text-align:left;">
              <img src="${WORDMARK_URL}" alt="One Degree BNB" width="180" style="display:inline-block;">
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 36px;">
              <h2 style="color:#1A1D21;font-size:28px;font-weight:400;margin:0 0 20px;text-align:left;font-family:'Playfair Display',Georgia,serif;">${greeting}</h2>
              ${body}
            </td>
          </tr>
          <tr>
            <td style="background-color:#F9FAFB;padding:20px 40px;text-align:center;border-top:1px solid #E5E7EB;">
              <p style="color:#9CA3AF;font-size:12px;margin:0 0 4px;">One Degree BNB &middot; <a href="https://onedegreebnb.com" style="color:#9CA3AF;text-decoration:none;">onedegreebnb.com</a></p>
              <p style="color:#9CA3AF;font-size:11px;margin:0;"><a href="${APP_BASE_URL}/settings/notifications" style="color:#9CA3AF;text-decoration:underline;">Manage email preferences</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const para = (text: string) =>
  `<p style="color:#4B5563;font-size:15px;line-height:1.7;margin:0 0 14px;text-align:left;">${text}</p>`;

const button = (label: string, href: string) => `
<table cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
  <tr>
    <td style="background:linear-gradient(180deg,#8B5CF6,#312E81);border-radius:10px;text-align:center;">
      <a href="${href}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${label}</a>
    </td>
  </tr>
</table>`;

const detailRow = (label: string, value: string) =>
  `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;width:90px;">${label}</td><td style="padding:6px 0;color:#1A1D21;font-size:14px;font-weight:500;">${value}</td></tr>`;

const detailsTable = (rows: string) => `
<table cellpadding="0" cellspacing="0" style="margin:8px 0 20px;border-collapse:collapse;">
  ${rows}
</table>`;

const quoteBox = (text: string) =>
  `<div style="margin:20px 0;padding:16px 18px;background:#F9FAFB;border-left:3px solid #8B5CF6;border-radius:6px;color:#374151;font-size:14px;line-height:1.6;font-style:italic;">${escapeHtml(text)}</div>`;

const firstName = (full: string | null | undefined) => {
  if (!full) return "there";
  return full.split(" ")[0];
};

const stayDates = (ci: string | null, co: string | null) => {
  if (!ci || !co) return "";
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return `${fmt(ci)} – ${fmt(co)}`;
};

/* ---------- Public API ---------- */

interface BookingPayload {
  hostId: string;
  guestId: string;
  guestName: string;
  hostName: string;
  listingTitle: string;
  checkIn: string | null;
  checkOut: string | null;
  guestCount: number;
  threadId?: string | null;
  bookingId?: string;
  message?: string | null;
  hostResponseMessage?: string | null;
  cancelReason?: string | null;
}

export async function emailNewBookingRequest(p: BookingPayload) {
  const host = await fetchRecipient(p.hostId);
  if (!host) return;
  const dates = stayDates(p.checkIn, p.checkOut);
  const inboxUrl = p.threadId
    ? `${APP_BASE_URL}/inbox/${p.threadId}`
    : `${APP_BASE_URL}/inbox`;
  const rows =
    (dates ? detailRow("Dates", dates) : "") +
    detailRow(
      "Guests",
      `${p.guestCount} guest${p.guestCount === 1 ? "" : "s"}`
    ) +
    detailRow("Listing", escapeHtml(p.listingTitle));
  const body = `
    ${para(`<strong>${escapeHtml(p.guestName)}</strong> just sent you a reservation request.`)}
    ${detailsTable(rows)}
    ${p.message ? quoteBox(p.message) : ""}
    ${para("Open the conversation to accept, decline, or ask a question before you respond.")}
    ${button("Review request", inboxUrl)}
  `;
  return send({
    to: host,
    kind: "booking_request",
    subject: `New booking request from ${p.guestName}`,
    html: wrap(`Hi ${firstName(host.name)}!`, body),
  });
}

export async function emailBookingConfirmed(p: BookingPayload) {
  const guest = await fetchRecipient(p.guestId);
  if (!guest) return;
  const dates = stayDates(p.checkIn, p.checkOut);
  const tripsUrl = p.bookingId
    ? `${APP_BASE_URL}/trips/${p.bookingId}`
    : `${APP_BASE_URL}/trips`;
  const rows =
    (dates ? detailRow("Dates", dates) : "") +
    detailRow(
      "Guests",
      `${p.guestCount} guest${p.guestCount === 1 ? "" : "s"}`
    ) +
    detailRow("Host", escapeHtml(p.hostName)) +
    detailRow("Listing", escapeHtml(p.listingTitle));
  const body = `
    ${para(`Great news — <strong>${escapeHtml(p.hostName)}</strong> accepted your request to stay at <strong>${escapeHtml(p.listingTitle)}</strong>.`)}
    ${detailsTable(rows)}
    ${p.hostResponseMessage ? quoteBox(p.hostResponseMessage) : ""}
    ${para("You can message your host any time from your inbox to coordinate check-in details. Payment is handled directly between you and the host.")}
    ${button("View trip details", tripsUrl)}
  `;
  return send({
    to: guest,
    kind: "booking_confirmed",
    subject: `Your stay at ${p.listingTitle} is confirmed`,
    html: wrap(`Hi ${firstName(guest.name)}!`, body),
  });
}

export async function emailBookingDeclined(p: BookingPayload) {
  const guest = await fetchRecipient(p.guestId);
  if (!guest) return;
  const browseUrl = `${APP_BASE_URL}/browse`;
  const body = `
    ${para(`Unfortunately, <strong>${escapeHtml(p.hostName)}</strong> isn't able to host your stay at <strong>${escapeHtml(p.listingTitle)}</strong> for the dates you requested.`)}
    ${p.hostResponseMessage ? quoteBox(p.hostResponseMessage) : ""}
    ${para("Don't take it personally — hosts decline for all kinds of reasons. Plenty of other places are waiting for you.")}
    ${button("Browse other places", browseUrl)}
  `;
  return send({
    to: guest,
    kind: "booking_declined",
    subject: `Update on your request for ${p.listingTitle}`,
    html: wrap(`Hi ${firstName(guest.name)}!`, body),
  });
}

interface MessagePayload {
  recipientId: string;
  senderName: string;
  threadId: string;
  preview: string;
  listingTitle: string;
}

export async function emailNewMessage(p: MessagePayload) {
  const recipient = await fetchRecipient(p.recipientId);
  if (!recipient) return;
  const inboxUrl = `${APP_BASE_URL}/inbox/${p.threadId}`;
  const body = `
    ${para(`<strong>${escapeHtml(p.senderName)}</strong> sent you a new message about <strong>${escapeHtml(p.listingTitle)}</strong>.`)}
    ${quoteBox(p.preview)}
    ${button("Reply", inboxUrl)}
  `;
  return send({
    to: recipient,
    kind: "new_message",
    subject: `${p.senderName}: ${truncate(p.preview, 60)}`,
    html: wrap(`Hi ${firstName(recipient.name)}!`, body),
  });
}

/* ---------- Utilities ---------- */

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}
