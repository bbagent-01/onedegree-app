/**
 * Signed-cookie OTP challenge helpers.
 *
 * Flow:
 *   1. server generates a 6-digit code, hashes it with SHA-256
 *   2. payload {phone, hash, exp, clerkId} is HMAC-signed with a
 *      server-only secret and base64url-packed into a cookie
 *   3. SMS goes out with the raw code
 *   4. on verify, the cookie is re-parsed, HMAC checked, code
 *      compared in constant time, expiry enforced
 *
 * Why not a DB row: alpha scale is tiny and a cookie keeps the
 * challenge bound to the browser session that initiated it.
 * Rotating the signing secret invalidates every in-flight challenge
 * cleanly.
 */

const COOKIE_NAME = "phone_otp_challenge";
const TTL_SECONDS = 10 * 60; // 10 minutes

function secretKey(): string {
  // Reuse CRON_SECRET since it's already a 32-byte-ish random value
  // kept server-only. Any sufficiently-long secret works.
  const key = process.env.CRON_SECRET;
  if (!key || key.length < 16) {
    throw new Error(
      "CRON_SECRET missing or too short — cannot sign OTP challenges"
    );
  }
  return key;
}

function b64url(bytes: Uint8Array | string): string {
  const input =
    typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  let s = "";
  for (const b of input) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return b64url(new Uint8Array(sig));
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return b64url(new Uint8Array(hash));
}

/** Constant-time string equality. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export interface ChallengePayload {
  phone: string;
  clerkId: string;
  hash: string;
  exp: number; // unix seconds
}

/** Generate a 6-digit numeric code. */
export function generateCode(): string {
  // Math.random is fine for an OTP paired with rate-limited Twilio
  // delivery; we're not relying on it for key material.
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Build a signed cookie value for the given phone/clerkId/code.
 * Returns the cookie string (value only — caller sets headers).
 */
export async function buildChallengeCookie(
  phone: string,
  clerkId: string,
  code: string
): Promise<string> {
  const payload: ChallengePayload = {
    phone,
    clerkId,
    hash: await sha256(code),
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const json = JSON.stringify(payload);
  const body = b64url(json);
  const sig = await hmac(secretKey(), body);
  return `${body}.${sig}`;
}

/**
 * Verify a challenge cookie's signature + expiry, then check the
 * submitted code against the stored hash.
 *
 * Returns the validated payload when everything checks out.
 */
export async function verifyChallengeCookie(
  cookieValue: string,
  submittedCode: string,
  expectedClerkId: string,
  expectedPhone: string
): Promise<{ ok: true; payload: ChallengePayload } | { ok: false; reason: string }> {
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [body, sig] = parts;

  const expectedSig = await hmac(secretKey(), body);
  if (!timingSafeEqual(sig, expectedSig))
    return { ok: false, reason: "bad_signature" };

  let payload: ChallengePayload;
  try {
    const jsonBytes = b64urlDecode(body);
    payload = JSON.parse(new TextDecoder().decode(jsonBytes));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (payload.exp < Math.floor(Date.now() / 1000))
    return { ok: false, reason: "expired" };
  if (payload.clerkId !== expectedClerkId)
    return { ok: false, reason: "clerk_mismatch" };
  if (payload.phone !== expectedPhone)
    return { ok: false, reason: "phone_mismatch" };

  const submittedHash = await sha256(submittedCode);
  if (!timingSafeEqual(submittedHash, payload.hash))
    return { ok: false, reason: "wrong_code" };

  return { ok: true, payload };
}

export { COOKIE_NAME, TTL_SECONDS };
