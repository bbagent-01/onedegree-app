export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { rateLimitOr429 } from "@/lib/rate-limit";
import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * POST /api/pending-vouches/create
 *
 * Sender-driven pre-vouch flow. The sender fills the 3-step vouch
 * form for someone NOT yet on Trustead, hands us a recipient name +
 * phone, and we mint a tokenized /join/<token> URL plus a prefilled
 * SMS body. The actual send happens in the sender's own Messages app
 * via navigator.share() / sms: scheme — Trustead does NOT send SMS
 * here ($0 platform cost, no Twilio risk).
 *
 * Returns: { id, token, share_url, prefilled_sms_text, expires_at }
 *
 * Constraints:
 *   - Per-sender cap of 20 active 'pending' rows (returns 429 with
 *     a friendly cap message if exceeded). The Upstash rate-limit
 *     'pendingVouch' bucket (20/h) is a separate, layered cap.
 *   - If the recipient phone already belongs to a Trustead user,
 *     returns 409 + { existing: true, user } so the UI can redirect
 *     to /profile/<id> for a direct vouch.
 *   - Token is cryptographically random (24 random bytes →
 *     base64url, ~32 chars). DB has a hex fallback if we ever
 *     forget to pass one.
 */

const PENDING_CAP = 20;
const VOUCH_TYPES = new Set(["standard", "inner_circle"]);
const YEARS_BUCKETS = new Set(["lt1", "1to3", "3to5", "5to10", "10plus"]);

interface CreateBody {
  recipientName?: string;
  recipientPhone?: string;
  vouchType?: string;
  yearsKnownBucket?: string;
  ratingStake?: boolean;
}

function generateToken(): string {
  // Web Crypto is available in the edge runtime. 24 bytes → 32 chars
  // base64url (matches the spec's "secure-random URL-safe ~32 chars").
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  // base64 → base64url (no padding, URL-safe alphabet).
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function POST(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const blocked = await rateLimitOr429("pendingVouch", userId);
  if (blocked) return blocked;

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const recipientName = (body.recipientName ?? "").trim();
  const rawPhone = (body.recipientPhone ?? "").trim();
  const vouchType = body.vouchType ?? "";
  const yearsKnownBucket = body.yearsKnownBucket ?? "";
  const ratingStake = !!body.ratingStake;

  if (recipientName.length < 2 || recipientName.length > 80) {
    return Response.json(
      { error: "Recipient name must be 2–80 characters." },
      { status: 400 }
    );
  }
  if (!VOUCH_TYPES.has(vouchType)) {
    return Response.json({ error: "Invalid vouch type." }, { status: 400 });
  }
  if (!YEARS_BUCKETS.has(yearsKnownBucket)) {
    return Response.json(
      { error: "Invalid years-known bucket." },
      { status: 400 }
    );
  }

  // Default region "US" matches the rest of the app (sign-up, settings,
  // /invite). isPossible() is the same UX gate the existing /invite
  // page uses; isValid() is too strict and rejects test ranges.
  const parsed = rawPhone
    ? parsePhoneNumberFromString(rawPhone, "US")
    : null;
  if (!parsed?.isPossible()) {
    return Response.json(
      { error: "Enter a valid phone number." },
      { status: 400 }
    );
  }
  const phoneE164 = parsed.format("E.164");

  const supabase = getSupabaseAdmin();

  const { data: sender } = await supabase
    .from("users")
    .select("id, name, phone_number")
    .eq("clerk_id", userId)
    .single();
  if (!sender) return new Response("User not found", { status: 404 });

  // Existing-member guard. If the phone already belongs to a Trustead
  // user, point the caller at the direct vouch flow. Mirrors the
  // /api/invites POST guard so behavior is consistent across both
  // invite paths.
  if (phoneE164 === sender.phone_number) {
    return Response.json(
      {
        error: "That's your own phone number. You can't vouch for yourself.",
        existing: true,
        self: true,
      },
      { status: 409 }
    );
  }
  const { data: existingUser } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .eq("phone_number", phoneE164)
    .maybeSingle();
  if (existingUser) {
    return Response.json(
      {
        error: `${existingUser.name} is already on Trustead. Vouch for them directly instead.`,
        existing: true,
        user: {
          id: existingUser.id,
          name: existingUser.name,
          avatar_url: existingUser.avatar_url ?? null,
        },
      },
      { status: 409 }
    );
  }

  // Per-sender cap on active pending rows. Locked at 20 in the B1
  // spec — beyond that the sender must cancel one or wait for the
  // 30-day auto-expiry. Surfaced as 429 (not 400) so it shares a
  // status family with the Upstash limiter for client-side handling.
  const { count: pendingCount, error: countErr } = await supabase
    .from("pending_vouches")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", sender.id)
    .eq("status", "pending");
  if (countErr) {
    console.error("[pending-vouches:create] count error:", countErr);
    return Response.json(
      { error: "Failed to check pending cap." },
      { status: 500 }
    );
  }
  if ((pendingCount ?? 0) >= PENDING_CAP) {
    return Response.json(
      {
        error: `You have ${PENDING_CAP} pending invites. Cancel one or wait for them to expire.`,
        cap_reached: true,
      },
      { status: 429 }
    );
  }

  const token = generateToken();

  const { data: row, error: insertErr } = await supabase
    .from("pending_vouches")
    .insert({
      sender_id: sender.id,
      recipient_name: recipientName,
      recipient_phone: phoneE164,
      vouch_type: vouchType,
      years_known_bucket: yearsKnownBucket,
      rating_stake: ratingStake,
      token,
      status: "pending",
    })
    .select("id, token, expires_at")
    .single();

  if (insertErr || !row) {
    console.error("[pending-vouches:create] insert error:", insertErr);
    return Response.json(
      { error: "Failed to create pending vouch." },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://trustead.app";
  const shareUrl = `${baseUrl}/join/${row.token}`;
  const senderFirstName = (sender.name ?? "").split(" ")[0] || "A friend";
  const prefilledSmsText = `${senderFirstName} wants to vouch for you on Trustead — ${shareUrl}`;

  return Response.json({
    id: row.id,
    token: row.token,
    share_url: shareUrl,
    prefilled_sms_text: prefilledSmsText,
    expires_at: row.expires_at,
    recipient_phone: phoneE164,
  });
}
