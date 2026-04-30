export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth, isAdmin } from "@/lib/impersonation/session";
import { rateLimitOr429 } from "@/lib/rate-limit";
import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * POST /api/pending-vouches/create
 *
 * Sender-driven pre-vouch flow. Three modes:
 *   - 'phone'           — sender knows recipient's phone, auto-vouch
 *                         on phone match at signup (Mode A, original)
 *   - 'open_individual' — sender knows recipient but not their phone;
 *                         single-claim tokenized link (Mode B)
 *   - 'open_group'      — sender vouches for a group; multi-claim
 *                         tokenized link with max_claims cap (Mode C)
 *
 * For all modes the actual SMS send happens in the sender's own
 * Messages app via navigator.share() / sms: scheme — Trustead does
 * NOT send SMS here ($0 platform cost, no Twilio risk).
 *
 * Returns: { id, token, share_url, prefilled_sms_text, expires_at, mode, recipient_phone? }
 *
 * Constraints (apply to all modes):
 *   - Per-sender cap of 20 active 'pending' rows
 *   - Upstash 'pendingVouch' bucket: 20/h
 *   - Token: 24 random bytes → base64url (~32 chars URL-safe)
 *
 * Mode-specific:
 *   - 'phone' enforces phone validation + existing-member guard
 *     (skipped for admin via the testing bypass)
 *   - 'open_individual' validates recipientName, ignores phone
 *   - 'open_group' validates groupLabel + maxClaims (2..50)
 */

const PENDING_CAP = 20;
const VOUCH_TYPES = new Set(["standard", "inner_circle"]);
const YEARS_BUCKETS = new Set(["lt1", "1to3", "3to5", "5to10", "10plus"]);
const MODES = new Set(["phone", "open_individual", "open_group"]);
const MAX_CLAIMS_MIN = 2;
const MAX_CLAIMS_MAX = 50;
const MAX_CLAIMS_DEFAULT = 20;

interface CreateBody {
  mode?: string;
  recipientName?: string;
  recipientPhone?: string;
  groupLabel?: string;
  maxClaims?: number;
  vouchType?: string;
  yearsKnownBucket?: string;
  ratingStake?: boolean;
}

function generateToken(): string {
  // Web Crypto is available in the edge runtime. 24 bytes → 32 chars
  // base64url (matches the spec's "secure-random URL-safe ~32 chars").
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function POST(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Admin self-invite bypass for the phone-mode existing-member guard.
  // Read the REAL Clerk user (not impersonated). The DB CHECK on
  // vouches.no_self_vouch still backstops a literal self-vouch.
  const realAuth = await auth();
  const callerIsAdmin = isAdmin(realAuth.userId);

  const blocked = await rateLimitOr429("pendingVouch", userId);
  if (blocked) return blocked;

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Default 'phone' so older clients that haven't been updated still work.
  const mode = (body.mode ?? "phone").trim();
  if (!MODES.has(mode)) {
    return Response.json({ error: "Invalid mode." }, { status: 400 });
  }

  const vouchType = body.vouchType ?? "";
  const yearsKnownBucket = body.yearsKnownBucket ?? "";
  const ratingStake = !!body.ratingStake;
  if (!VOUCH_TYPES.has(vouchType)) {
    return Response.json({ error: "Invalid vouch type." }, { status: 400 });
  }
  if (!YEARS_BUCKETS.has(yearsKnownBucket)) {
    return Response.json(
      { error: "Invalid years-known bucket." },
      { status: 400 }
    );
  }

  // Mode-specific field validation. Each branch returns one of:
  //   { recipientName, recipientPhone } — phone mode
  //   { recipientName }                 — open_individual mode
  //   { groupLabel, maxClaims }         — open_group mode
  // We compute these up front so the supabase insert below is mode-shaped.
  let recipientName: string | null = null;
  let phoneE164: string | null = null;
  let groupLabel: string | null = null;
  let maxClaims: number | null = null;

  if (mode === "phone" || mode === "open_individual") {
    const name = (body.recipientName ?? "").trim();
    if (name.length < 2 || name.length > 80) {
      return Response.json(
        { error: "Recipient name must be 2–80 characters." },
        { status: 400 }
      );
    }
    recipientName = name;
  }

  if (mode === "phone") {
    const rawPhone = (body.recipientPhone ?? "").trim();
    const parsed = rawPhone
      ? parsePhoneNumberFromString(rawPhone, "US")
      : null;
    if (!parsed?.isPossible()) {
      return Response.json(
        { error: "Enter a valid phone number." },
        { status: 400 }
      );
    }
    phoneE164 = parsed.format("E.164");
  }

  if (mode === "open_group") {
    const label = (body.groupLabel ?? "").trim();
    if (label.length < 2 || label.length > 80) {
      return Response.json(
        { error: "Group label must be 2–80 characters." },
        { status: 400 }
      );
    }
    groupLabel = label;
    const requested = body.maxClaims ?? MAX_CLAIMS_DEFAULT;
    if (
      typeof requested !== "number" ||
      !Number.isInteger(requested) ||
      requested < MAX_CLAIMS_MIN ||
      requested > MAX_CLAIMS_MAX
    ) {
      return Response.json(
        {
          error: `Group invite size must be between ${MAX_CLAIMS_MIN} and ${MAX_CLAIMS_MAX}.`,
        },
        { status: 400 }
      );
    }
    maxClaims = requested;
  }

  const supabase = getSupabaseAdmin();

  const { data: sender } = await supabase
    .from("users")
    .select("id, name, phone_number")
    .eq("clerk_id", userId)
    .single();
  if (!sender) return new Response("User not found", { status: 404 });

  // Phone-mode existing-member guard. Open modes have no phone to
  // check, so this whole block is skipped for them. Admins also skip
  // for self-invite testing (per the existing bypass).
  if (mode === "phone" && !callerIsAdmin) {
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
      .eq("phone_number", phoneE164!)
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
  }

  // Per-sender cap on active pending rows. Mode-agnostic — Mode A/B/C
  // all count toward the same 20 cap.
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

  const insertRow: Record<string, unknown> = {
    sender_id: sender.id,
    mode,
    vouch_type: vouchType,
    years_known_bucket: yearsKnownBucket,
    rating_stake: ratingStake,
    token,
    status: "pending",
    recipient_name: recipientName,
    recipient_phone: phoneE164,
    group_label: groupLabel,
    max_claims: maxClaims,
  };

  const { data: row, error: insertErr } = await supabase
    .from("pending_vouches")
    .insert(insertRow)
    .select("id, token, expires_at, mode")
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

  // Prefilled SMS text varies slightly by mode so the recipient gets
  // appropriate context. All three include the share URL at the end
  // (some apps append text + url, some surface them separately).
  const prefilledSmsText =
    mode === "open_group"
      ? `${senderFirstName} is inviting friends to Trustead — ${shareUrl}`
      : `${senderFirstName} wants to vouch for you on Trustead — ${shareUrl}`;

  return Response.json({
    id: row.id,
    token: row.token,
    mode: row.mode,
    share_url: shareUrl,
    prefilled_sms_text: prefilledSmsText,
    expires_at: row.expires_at,
    recipient_phone: phoneE164 ?? undefined,
  });
}
