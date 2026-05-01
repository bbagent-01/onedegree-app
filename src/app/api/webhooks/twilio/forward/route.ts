/**
 * Twilio inbound-SMS forwarder for the test recipient number
 * (+1 814 561 3405). On inbound, makes a REST call to Twilio to send
 * a new SMS from Trustead's main (toll-free verified) number to
 * Loren's iPhone, prefixed with the original sender.
 *
 * Why REST instead of TwiML: outbound from +18145613405 fails with
 * 30034 (A2P 10DLC unregistered). The main number +18557852104 is
 * toll-free verified and can deliver to US destinations. Sending the
 * forward from the verified number sidesteps registration entirely.
 *
 * Temporary — exists so Loren can run an end-to-end Clerk OTP signup
 * test against +18145613405 without sitting in the Twilio Console.
 * Delete this route (and unset the webhook URL on the number) once
 * testing is done.
 */

import { NextRequest } from "next/server";

export const runtime = "edge";

const FORWARD_TO = "+19493384373";

export async function POST(req: NextRequest) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    console.error("[twilio-forward] missing Twilio env vars");
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }

  const rawBody = await req.text();
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(rawBody)) params[k] = v;

  const origFrom = params["From"] || "?";
  const origBody = params["Body"] || "";

  const body = `[fwd ${origFrom}] ${origBody}`;

  const auth = btoa(`${sid}:${token}`);
  const form = new URLSearchParams();
  form.set("From", from);
  form.set("To", FORWARD_TO);
  form.set("Body", body);

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    console.error(`[twilio-forward] outbound failed ${resp.status}: ${text}`);
  }

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
