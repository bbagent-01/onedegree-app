/**
 * Twilio inbound-SMS forwarder for the test recipient number
 * (+1 814 561 3405). Replies with TwiML that re-sends the message
 * body to Loren's iPhone, prefixed with the original sender.
 *
 * Temporary — exists so Loren can run an end-to-end Clerk OTP signup
 * test against a Twilio-owned number without sitting in the Twilio
 * Console messaging log. Delete this route (and remove the webhook
 * URL on the number) once testing is done.
 *
 * No signature verification: forward destination is hardcoded to
 * Loren's phone, so worst case if abused is unwanted SMS to that
 * single number. Not worth fighting Cloudflare Pages' req.url quirks.
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

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const formParams: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(rawBody)) {
    formParams[k] = v;
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
