/**
 * Twilio inbound-SMS forwarder for the test recipient number
 * (+1 814 561 3405). Replies with TwiML that re-sends the message
 * body to Loren's iPhone, prefixed with the original sender.
 *
 * Temporary — exists so Loren can run an end-to-end Clerk OTP signup
 * test against a Twilio-owned number without sitting in the Twilio
 * Console messaging log. Delete this route (and remove the webhook
 * URL on the number) once testing is done.
 */

import { NextRequest } from "next/server";

export const runtime = "edge";

const FORWARD_TO = "+19493384373";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

  const bytes = new Uint8Array(sigBuf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const computed = btoa(binary);

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
    console.error("[twilio-forward] TWILIO_AUTH_TOKEN not set");
    return new Response("Server not configured", { status: 500 });
  }

  const signature = req.headers.get("x-twilio-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 401 });
  }

  const rawBody = await req.text();
  const formParams: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(rawBody)) {
    formParams[k] = v;
  }

  const valid = await verifyTwilioSignature(
    req.url,
    formParams,
    signature,
    authToken
  );
  if (!valid) {
    console.warn("[twilio-forward] Invalid signature for", req.url);
    return new Response("Invalid signature", { status: 401 });
  }

  const from = formParams["From"] || "?";
  const body = formParams["Body"] || "";

  if (from === FORWARD_TO) {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }

  const forwarded = `From ${from}: ${body}`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message to="${FORWARD_TO}">${escapeXml(forwarded)}</Message></Response>`;
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
