/**
 * Transactional email helper for Track B (CC-B6b).
 *
 * Wraps Resend with simple HTML templates for the four booking lifecycle
 * notifications. All sends are wrapped in try/catch — email failures must
 * never block the originating API request.
 */

import { Resend } from "resend";
import { getSupabaseAdmin } from "./supabase";

const FROM = "One Degree BNB <loren@onedegreebnb.com>";
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

const wrap = (title: string, body: string) => `
<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;background:#f8f8f8;margin:0;padding:24px;color:#1a1d21;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <tr><td style="padding:24px 28px;border-bottom:1px solid #eee;">
        <div style="font-size:14px;color:#7a3aff;font-weight:600;letter-spacing:0.04em;">ONE DEGREE BNB</div>
      </td></tr>
      <tr><td style="padding:28px;">
        <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:600;color:#1a1d21;">${title}</h1>
        ${body}
      </td></tr>
      <tr><td style="padding:18px 28px 24px 28px;border-top:1px solid #eee;font-size:12px;color:#888;">
        You're receiving this because you have an account on One Degree BNB.
        <br><a href="${APP_BASE_URL}/settings/notifications" style="color:#7a3aff;text-decoration:none;">Manage email preferences</a>
      </td></tr>
    </table>
  </body>
</html>`;

const button = (label: string, href: string) =>
  `<div style="margin:24px 0;"><a href="${href}" style="display:inline-block;background:#7a3aff;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px;">${label}</a></div>`;

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
  const body = `
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.55;">
      <strong>${p.guestName}</strong> requested to book your place
      <strong>${escapeHtml(p.listingTitle)}</strong>.
    </p>
    ${dates ? `<p style="margin:0 0 6px 0;font-size:14px;color:#555;">📅 ${dates}</p>` : ""}
    <p style="margin:0 0 4px 0;font-size:14px;color:#555;">👥 ${p.guestCount} guest${p.guestCount === 1 ? "" : "s"}</p>
    ${p.message ? `<blockquote style="margin:18px 0 0 0;padding:14px 16px;background:#f5f3ff;border-left:3px solid #7a3aff;border-radius:8px;font-size:14px;color:#3b1d80;line-height:1.5;">${escapeHtml(p.message)}</blockquote>` : ""}
    ${button("Review request", inboxUrl)}
    <p style="margin:0;font-size:13px;color:#777;">Open the conversation to accept, decline, or ask a question.</p>
  `;
  return send({
    to: host,
    kind: "booking_request",
    subject: `New booking request from ${p.guestName}`,
    html: wrap(`New request from ${p.guestName}`, body),
  });
}

export async function emailBookingConfirmed(p: BookingPayload) {
  const guest = await fetchRecipient(p.guestId);
  if (!guest) return;
  const dates = stayDates(p.checkIn, p.checkOut);
  const tripsUrl = p.bookingId
    ? `${APP_BASE_URL}/trips/${p.bookingId}`
    : `${APP_BASE_URL}/trips`;
  const body = `
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.55;">
      Good news — <strong>${p.hostName}</strong> accepted your request to stay at
      <strong>${escapeHtml(p.listingTitle)}</strong>.
    </p>
    ${dates ? `<p style="margin:0 0 6px 0;font-size:14px;color:#555;">📅 ${dates}</p>` : ""}
    ${p.hostResponseMessage ? `<blockquote style="margin:18px 0 0 0;padding:14px 16px;background:#f0fdf4;border-left:3px solid #16a34a;border-radius:8px;font-size:14px;color:#14532d;line-height:1.5;">${escapeHtml(p.hostResponseMessage)}</blockquote>` : ""}
    ${button("View trip details", tripsUrl)}
    <p style="margin:0;font-size:13px;color:#777;">
      You can message your host any time from your inbox. Payment is handled
      directly between you and the host.
    </p>
  `;
  return send({
    to: guest,
    kind: "booking_confirmed",
    subject: `Your stay at ${p.listingTitle} is confirmed`,
    html: wrap("Booking confirmed 🎉", body),
  });
}

export async function emailBookingDeclined(p: BookingPayload) {
  const guest = await fetchRecipient(p.guestId);
  if (!guest) return;
  const browseUrl = `${APP_BASE_URL}/browse`;
  const body = `
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.55;">
      Unfortunately, <strong>${p.hostName}</strong> isn't able to host your stay at
      <strong>${escapeHtml(p.listingTitle)}</strong> for the dates you requested.
    </p>
    ${p.hostResponseMessage ? `<blockquote style="margin:18px 0 0 0;padding:14px 16px;background:#fafafa;border-left:3px solid #d4d4d8;border-radius:8px;font-size:14px;color:#3f3f46;line-height:1.5;">${escapeHtml(p.hostResponseMessage)}</blockquote>` : ""}
    ${button("Browse other places", browseUrl)}
  `;
  return send({
    to: guest,
    kind: "booking_declined",
    subject: `Update on your request for ${p.listingTitle}`,
    html: wrap("Your request wasn't accepted", body),
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
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.55;">
      <strong>${p.senderName}</strong> sent you a message about
      <strong>${escapeHtml(p.listingTitle)}</strong>.
    </p>
    <blockquote style="margin:18px 0 0 0;padding:14px 16px;background:#f5f3ff;border-left:3px solid #7a3aff;border-radius:8px;font-size:14px;color:#3b1d80;line-height:1.5;">${escapeHtml(p.preview)}</blockquote>
    ${button("Reply", inboxUrl)}
  `;
  return send({
    to: recipient,
    kind: "new_message",
    subject: `${p.senderName}: ${truncate(p.preview, 60)}`,
    html: wrap(`New message from ${p.senderName}`, body),
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
