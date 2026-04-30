/**
 * SMS opt-out registry — A2P 10DLC compliance helpers.
 *
 * Twilio requires senders that send "Reply STOP to opt out" copy to
 * honour inbound STOP. The webhook at /api/webhooks/twilio/sms
 * records opt-outs here; pre-send call sites in send-invite.ts and
 * proposal-alerts.ts consult isOptedOut() before any Twilio API call.
 *
 * Auth/OTP flows (send-otp.ts) intentionally do NOT use these helpers
 * — a user must never be able to lock themselves out of sign-in by
 * replying STOP.
 */

import { getSupabaseAdmin } from "../supabase";

const STOP_KEYWORDS = new Set([
  "STOP",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
  "STOPALL",
]);

const START_KEYWORDS = new Set(["START", "UNSTOP", "YES"]);

const HELP_KEYWORDS = new Set(["HELP", "INFO"]);

export type OptOutClassification = "STOP" | "START" | "HELP" | "OTHER";

export function classifyInboundSms(body: string): {
  kind: OptOutClassification;
  matched: string | null;
} {
  const trimmed = body.trim().toUpperCase();
  if (STOP_KEYWORDS.has(trimmed)) return { kind: "STOP", matched: trimmed };
  if (START_KEYWORDS.has(trimmed)) return { kind: "START", matched: trimmed };
  if (HELP_KEYWORDS.has(trimmed)) return { kind: "HELP", matched: trimmed };
  return { kind: "OTHER", matched: null };
}

export async function isOptedOut(phoneNumber: string): Promise<boolean> {
  if (!phoneNumber) return false;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("sms_opt_outs")
    .select("phone_number")
    .eq("phone_number", phoneNumber)
    .maybeSingle();
  return Boolean(data);
}

export async function recordOptOut(
  phoneNumber: string,
  source: string
): Promise<void> {
  if (!phoneNumber) return;
  const supabase = getSupabaseAdmin();
  await supabase
    .from("sms_opt_outs")
    .upsert(
      { phone_number: phoneNumber, source, opted_out_at: new Date().toISOString() },
      { onConflict: "phone_number" }
    );
}

export async function removeOptOut(phoneNumber: string): Promise<void> {
  if (!phoneNumber) return;
  const supabase = getSupabaseAdmin();
  await supabase
    .from("sms_opt_outs")
    .delete()
    .eq("phone_number", phoneNumber);
}

export class OptedOutError extends Error {
  readonly code = "opted_out" as const;
  constructor(public readonly phoneNumber: string) {
    super(`Recipient ${phoneNumber} has opted out of SMS`);
    this.name = "OptedOutError";
  }
}
