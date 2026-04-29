/**
 * Twilio inbound-SMS webhook — A2P 10DLC opt-out handler.
 *
 * Twilio POSTs here whenever someone replies to a Trustead SMS. We
 * verify the X-Twilio-Signature header (HMAC-SHA1 of full URL +
 * sorted form params, keyed with TWILIO_AUTH_TOKEN), then dispatch
 * on the message body:
 *
 *   STOP / UNSUBSCRIBE / CANCEL / END / QUIT / STOPALL
 *     -> insert into sms_opt_outs (Twilio also auto-blocks the number
 *        on its side, but we want our own record so pre-send filters
 *        can short-circuit and we can audit).
 *   HELP / INFO
 *     -> respond with a canned TwiML reply (also auto-handled by
 *        Twilio, but a spec-compliant response is harmless and lets
 *        us customize the wording).
 *   START / UNSTOP / YES
 *     -> remove the opt-out row (re-subscribe).
 *   anything else
 *     -> 200 OK no-op (Twilio just wants a 2xx).
 *
 * Loren-must-check: webhook URL must be set in Twilio console:
 *   https://console.twilio.com/us1/account/phone-numbers/manage/incoming
 *   -> [number] -> Messaging Configuration -> "A MESSAGE COMES IN"
 *   webhook = https://trustead.app/api/webhooks/twilio/sms (HTTP POST).
 */

import { NextRequest } from "next/server";
import {
  classifyInboundSms,
  recordOptOut,
  removeOptOut,
} from "@/lib/sms/opt-out";

export const runtime = "edge";

function twiml(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

function emptyTwiml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
}

function twimlResponse(xml: string, status = 200) {
  return new Response(xml, {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

/**
 * Twilio request signature: HMAC-SHA1 of (full URL + concat of sorted
 * key+value pairs from the form body), base64-encoded, in
 * X-Twilio-Signature header.
 *
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
async function verifyTwilioSignature(
  fullUrl: string,
  params: Record<string, string>,
  signature: string,
  authToken: string
): Promise<boolean> {
  const sortedKeys = Object.keys(params).sort();
  let data = fullUrl;
  for (const k of sortedKeys) data += k + params[k];

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );

  // base64 encode the signature buffer
  const bytes = new Uint8Array(sigBuf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const computed = btoa(binary);

  // constant-time compare
  if (computed.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function POST(req: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error("[twilio-webhook] TWILIO_AUTH_TOKEN not set");
    return new Response("Server not configured", { status: 500 });
  }

  const signature = req.headers.get("x-twilio-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 401 });
  }

  // Twilio posts application/x-www-form-urlencoded.
  const rawBody = await req.text();
  const formParams: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(rawBody)) {
    formParams[k] = v;
  }

  // Use the request URL as Twilio sees it. Cloudflare Pages preserves
  // the original host on req.url, so this works in prod.
  const fullUrl = req.url;
  const valid = await verifyTwilioSignature(
    fullUrl,
    formParams,
    signature,
    authToken
  );
  if (!valid) {
    console.warn("[twilio-webhook] Invalid signature for", fullUrl);
    return new Response("Invalid signature", { status: 401 });
  }

  const from = formParams["From"] || "";
  const body = formParams["Body"] || "";
  if (!from) {
    return twimlResponse(emptyTwiml());
  }

  const { kind, matched } = classifyInboundSms(body);

  switch (kind) {
    case "STOP":
      await recordOptOut(from, matched ?? "STOP");
      console.log(`[twilio-webhook] STOP recorded for ${from}`);
      // Twilio's carrier-side STOP handler also sends a confirmation;
      // returning empty TwiML avoids double-replying.
      return twimlResponse(emptyTwiml());

    case "START":
      await removeOptOut(from);
      console.log(`[twilio-webhook] START re-subscribed ${from}`);
      return twimlResponse(
        twiml("You're re-subscribed to Trustead messages. Reply STOP to opt out.")
      );

    case "HELP":
      return twimlResponse(
        twiml(
          "Trustead — invitation-only rentals. Help: hello@trustead.app. Reply STOP to opt out, START to opt back in."
        )
      );

    default:
      // Any other reply: ack with empty TwiML so Twilio doesn't retry.
      return twimlResponse(emptyTwiml());
  }
}
