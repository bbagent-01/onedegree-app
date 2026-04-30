/**
 * Twilio SMS send for the B2 pending_vouches Mode A flow.
 *
 * Differences from `sendInviteSMS` (the legacy /api/invites helper):
 *   - Body is passed by the caller (not hard-coded), so the create
 *     endpoint can format it with sender first name + share URL +
 *     mode-aware copy without this file knowing the schema.
 *   - Same Twilio + opt-out infra; identical failure shape so the
 *     create endpoint can fall back to share-sheet UX.
 *
 * STOP-footer compliance:
 *   - Twilio US A2P 10DLC rules require an opt-out instruction on
 *     application-to-person SMS. We append "Reply STOP to opt out."
 *     unless the caller already included it.
 *
 * Required env (same as sendInviteSMS):
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */

import { isOptedOut, OptedOutError } from "./opt-out";

interface SendPendingVouchSMSParams {
  toPhone: string;
  body: string;
}

const STOP_FOOTER = "Reply STOP to opt out.";

export async function sendPendingVouchSMS({
  toPhone,
  body,
}: SendPendingVouchSMSParams): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn(
      "[SMS:pending-vouch] Twilio credentials missing — skipping send. " +
        "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER."
    );
    return { success: false, error: "twilio_not_configured" };
  }

  if (await isOptedOut(toPhone)) {
    console.warn(
      `[SMS:pending-vouch] Skipping ${toPhone} — recipient opted out`
    );
    throw new OptedOutError(toPhone);
  }

  // Append STOP footer if absent. Carriers don't actually parse the
  // copy, but Twilio's compliance scoring penalizes accounts that
  // miss it on outbound transactional sends.
  const finalBody = body.includes("STOP")
    ? body
    : `${body.trimEnd()} ${STOP_FOOTER}`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams({
      To: toPhone,
      From: fromNumber,
      Body: finalBody,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = err.message || `Twilio HTTP ${res.status}`;
      console.error("[SMS:pending-vouch] Twilio error:", message);
      return { success: false, error: message };
    }

    const data = await res.json();
    console.log(`[SMS:pending-vouch] Sent to ${toPhone}, SID: ${data.sid}`);
    return { success: true };
  } catch (e) {
    if (e instanceof OptedOutError) throw e;
    const message = e instanceof Error ? e.message : "Unknown SMS error";
    console.error("[SMS:pending-vouch] Send failed:", message);
    return { success: false, error: message };
  }
}
