/**
 * Twilio OTP SMS sender. Used for phone-change verification where
 * the Clerk Backend API doesn't have a "send SMS" endpoint and the
 * Frontend API triggers reverification prompts that some accounts
 * can't satisfy.
 */

interface SendOtpParams {
  toPhone: string;
  code: string;
}

export async function sendOtpSMS({
  toPhone,
  code,
}: SendOtpParams): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn(
      "[OTP] Twilio credentials missing. Set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER."
    );
    return { success: false, error: "twilio_not_configured" };
  }

  const body = `Your 1\u00B0 B&B verification code is ${code}. It expires in 10 minutes.`;

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
        Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      return {
        success: false,
        error: err.message || `Twilio HTTP ${res.status}`,
      };
    }

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown SMS error",
    };
  }
}
