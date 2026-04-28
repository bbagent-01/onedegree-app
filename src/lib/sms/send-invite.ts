/**
 * Twilio SMS invite delivery.
 *
 * Sends an SMS invite via the Twilio REST API.
 * If Twilio credentials are missing, logs a warning and returns failure
 * so the caller can fall back to email delivery.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_PHONE_NUMBER (the sending number, E.164 format)
 */

interface SendInviteSMSParams {
  toPhone: string;
  inviterName: string;
  inviteeName: string;
  inviteUrl: string;
}

export async function sendInviteSMS({
  toPhone,
  inviterName,
  inviteeName,
  inviteUrl,
}: SendInviteSMSParams): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn(
      "[SMS] Twilio credentials missing — skipping SMS delivery. " +
        "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER."
    );
    return { success: false, error: "twilio_not_configured" };
  }

  // Keep SMS under 160 chars when possible
  const body =
    `${inviterName} invited you to Trustead — a trusted rental network. ` +
    `They vouched for you so you can start browsing. Join: ${inviteUrl}\n\n` +
    `Reply STOP to opt out.`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams({
      To: toPhone,
      From: fromNumber,
      Body: body,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = err.message || `Twilio HTTP ${res.status}`;
      console.error("[SMS] Twilio error:", message);
      return { success: false, error: message };
    }

    const data = await res.json();
    console.log(`[SMS] Sent to ${toPhone}, SID: ${data.sid}`);
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown SMS error";
    console.error("[SMS] Send failed:", message);
    return { success: false, error: message };
  }
}
