import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { buttonVariants } from "@/components/ui/button";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface ConsumeOutcome {
  ok: boolean;
  message: string;
  inviterName: string | null;
}

/**
 * Consume an invite token for the currently signed-in user:
 *   1. Verify token exists + not expired + not claimed.
 *   2. Resolve the current Clerk user to their users row. The users
 *      row may not exist yet if the Clerk → Supabase user.created
 *      webhook hasn't fired — we retry once, then fall back to an
 *      error state with a friendly "reload in a moment" message.
 *   3. Insert the pre-vouch (inviter → new user) with the invite's
 *      stored vouch_type + years_known_bucket.
 *   4. Mark invite status=joined + claimed_by + claimed_at.
 *
 * Server component so all of this happens on the same request that
 * completes the sign-up redirect. No client-side leakage.
 */
async function consumeInvite(
  token: string,
  clerkUserId: string
): Promise<ConsumeOutcome> {
  const supabase = getSupabaseAdmin();

  const { data: invite } = await supabase
    .from("invites")
    .select(
      "id, inviter_id, vouch_type, years_known_bucket, expires_at, status, claimed_by"
    )
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    // B1: also try the pending_vouches table. Both flows share
    // /join/[token]; tokens differ in shape so a token will only
    // ever resolve to one row.
    return await consumePendingVouch(token, clerkUserId);
  }
  if (invite.claimed_by) {
    return {
      ok: false,
      message: "This invite was already claimed.",
      inviterName: null,
    };
  }
  if (invite.expires_at && new Date(invite.expires_at as string) < new Date()) {
    return {
      ok: false,
      message: "This invite has expired. Your account was still created.",
      inviterName: null,
    };
  }

  // Resolve Clerk user → DB user row. Retry once to tolerate the
  // gap between Clerk account creation and the user.created webhook
  // landing the row in Supabase.
  let dbUserId: string | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: row } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .maybeSingle();
    if (row?.id) {
      dbUserId = row.id as string;
      break;
    }
    if (attempt === 0) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  if (!dbUserId) {
    return {
      ok: false,
      message:
        "Your account is still being set up. Reload this page in a few seconds and the invite will apply.",
      inviterName: null,
    };
  }

  // Inviter info for the success message.
  const { data: inviter } = await supabase
    .from("users")
    .select("id, name, is_test_user")
    .eq("id", invite.inviter_id as string)
    .maybeSingle();
  const inviterName = (inviter?.name as string | null) ?? "Your inviter";

  // Isolation check: if exactly one of (inviter, new user) is a test
  // user, the DB trigger on vouches will block the insert anyway —
  // short-circuit with a friendly message rather than raising a 500.
  const { data: me } = await supabase
    .from("users")
    .select("is_test_user")
    .eq("id", dbUserId)
    .maybeSingle();
  const inviterIsTest = !!inviter?.is_test_user;
  const meIsTest = !!me?.is_test_user;
  if (inviterIsTest !== meIsTest) {
    return {
      ok: false,
      message:
        "This invite can't be applied because of account isolation rules. Your account was still created.",
      inviterName,
    };
  }

  // Write the pre-vouch. Upsert keyed on (voucher_id, vouchee_id) —
  // if the inviter had already vouched directly we do nothing.
  const { error: vouchErr } = await supabase.from("vouches").upsert(
    {
      voucher_id: invite.inviter_id,
      vouchee_id: dbUserId,
      vouch_type: invite.vouch_type,
      years_known_bucket: invite.years_known_bucket,
    },
    { onConflict: "voucher_id,vouchee_id" }
  );
  if (vouchErr) {
    return {
      ok: false,
      message:
        "Couldn't create the pre-vouch — account is fine, but ask your inviter to vouch for you directly.",
      inviterName,
    };
  }

  // Mark the invite consumed.
  await supabase
    .from("invites")
    .update({
      status: "joined",
      claimed_by: dbUserId,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  return {
    ok: true,
    message: `${inviterName} has vouched for you. Welcome.`,
    inviterName,
  };
}

/**
 * B1: pending_vouches token-resume path.
 *
 * The webhook already runs an unconditional phone-match auto-claim
 * (see src/app/api/webhooks/clerk/route.ts → claimPendingVouches), so
 * this function is the *token-aware* layer: it lets the recipient
 * resume even on phone mismatch — and when the phones disagree, logs
 * the event to pending_vouch_mismatch_events so a future
 * reconciliation pass has the audit trail.
 *
 * Behavior:
 *   - Token + matching phone → claim (idempotent with webhook).
 *   - Token + mismatching phone → DO NOT claim; log mismatch event
 *     (intended_phone reduced to last 4 digits per privacy decision).
 *     Pending row stays 'pending' until natural expiry.
 *   - Already claimed (likely by webhook) → friendly success message.
 */
async function consumePendingVouch(
  token: string,
  clerkUserId: string
): Promise<ConsumeOutcome> {
  const supabase = getSupabaseAdmin();

  const { data: pv } = await supabase
    .from("pending_vouches")
    .select(
      "id, sender_id, recipient_phone, vouch_type, years_known_bucket, status, expires_at, claimed_by"
    )
    .eq("token", token)
    .maybeSingle();

  if (!pv) {
    return { ok: false, message: "Invite not found.", inviterName: null };
  }

  // Resolve sender for the success/failure message.
  const { data: sender } = await supabase
    .from("users")
    .select("id, name, is_test_user")
    .eq("id", pv.sender_id as string)
    .maybeSingle();
  const senderName = (sender?.name as string | null) ?? "Your inviter";

  if (pv.status === "canceled" || pv.status === "expired") {
    return {
      ok: false,
      message:
        "This invite is no longer valid — your account is still created. Ask your friend to send a new one.",
      inviterName: senderName,
    };
  }
  if (pv.expires_at && new Date(pv.expires_at as string) < new Date()) {
    return {
      ok: false,
      message:
        "This invite has expired — your account is still created. Ask your friend to send a new one.",
      inviterName: senderName,
    };
  }

  // Resolve clerk → DB user. Same retry pattern as the invites path
  // — the user.created webhook may not have landed yet.
  let dbUserId: string | null = null;
  let dbUserPhone: string | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: row } = await supabase
      .from("users")
      .select("id, phone_number")
      .eq("clerk_id", clerkUserId)
      .maybeSingle();
    if (row?.id) {
      dbUserId = row.id as string;
      dbUserPhone = (row.phone_number as string | null) ?? null;
      break;
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
  }
  if (!dbUserId) {
    return {
      ok: false,
      message:
        "Your account is still being set up. Reload this page in a few seconds and the invite will apply.",
      inviterName: senderName,
    };
  }

  // If the row was already flipped to 'claimed' by the webhook before
  // this page loaded, surface success without doing more work. Don't
  // gate on claimed_by === dbUserId — multi-claim means another sender's
  // row could have claimed first; we still want this row to land too.
  if (pv.status === "claimed" && pv.claimed_by === dbUserId) {
    return {
      ok: true,
      message: `${senderName} has vouched for you. Welcome.`,
      inviterName: senderName,
    };
  }

  // Self-claim guard. The DB has a `vouches_no_self_vouch` CHECK that
  // would reject the upsert anyway, but catching it here gives a
  // friendly message instead of a 500 — useful for admins exercising
  // the share-link UX with their own phone.
  if (pv.sender_id === dbUserId) {
    return {
      ok: false,
      message:
        "Test invite — sender and recipient are the same account. No real vouch was created. The pending row stays in your dashboard so you can cancel or resend it.",
      inviterName: senderName,
    };
  }

  // Phone-match check. The webhook auto-claim already runs without
  // the token, so on the happy path this re-checks what already
  // happened. On the mismatch path, this is the only place we
  // detect that the recipient signed up with a different phone
  // than the sender targeted — log it and walk away.
  const intendedPhone = (pv.recipient_phone as string | null) ?? null;
  const phonesMatch =
    !!intendedPhone && !!dbUserPhone && intendedPhone === dbUserPhone;

  if (!phonesMatch) {
    // Mismatch: log + bail. We store only the last 4 of the intended
    // phone to limit the PII footprint of the log table (per the B1
    // privacy decision). The full intended phone still lives on the
    // pending_vouches row until cancel/expire.
    if (intendedPhone) {
      try {
        await supabase.from("pending_vouch_mismatch_events").insert({
          pending_vouch_id: pv.id,
          sender_id: pv.sender_id,
          signup_user_id: dbUserId,
          intended_phone_last4: intendedPhone.slice(-4),
          actual_phone: dbUserPhone ?? "",
        });
      } catch (e) {
        console.error("[pending-vouch:mismatch-log] insert failed:", e);
      }
    }
    return {
      ok: false,
      message:
        "Your phone didn't match the one your friend sent the invite to. Your account was created — ask them to vouch for you directly.",
      inviterName: senderName,
    };
  }

  // Test-user isolation guard (mirrors the invites flow).
  const inviterIsTest = !!sender?.is_test_user;
  const { data: me } = await supabase
    .from("users")
    .select("is_test_user")
    .eq("id", dbUserId)
    .maybeSingle();
  const meIsTest = !!me?.is_test_user;
  if (inviterIsTest !== meIsTest) {
    return {
      ok: false,
      message:
        "This invite can't be applied because of account isolation rules. Your account was still created.",
      inviterName: senderName,
    };
  }

  // Idempotent vouch upsert. If the webhook beat us to it, this is
  // a no-op (onConflict on the unique pair).
  const { error: vouchErr } = await supabase.from("vouches").upsert(
    {
      voucher_id: pv.sender_id,
      vouchee_id: dbUserId,
      vouch_type: pv.vouch_type,
      years_known_bucket: pv.years_known_bucket,
      is_post_stay: false,
      is_staked: false,
    },
    { onConflict: "voucher_id,vouchee_id" }
  );
  if (vouchErr) {
    return {
      ok: false,
      message:
        "Couldn't create the pre-vouch — your account is fine. Ask your inviter to vouch for you directly.",
      inviterName: senderName,
    };
  }

  await supabase
    .from("pending_vouches")
    .update({
      status: "claimed",
      claimed_by: dbUserId,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", pv.id)
    .eq("status", "pending");

  return {
    ok: true,
    message: `${senderName} has vouched for you. Welcome.`,
    inviterName: senderName,
  };
}

export default async function JoinCompletePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { userId } = await auth();
  if (!userId) {
    // Middleware should catch this, but just in case.
    redirect(`/sign-in?redirect_url=/join/${token}/complete`);
  }

  const outcome = await consumeInvite(token, userId as string);

  return (
    <div className="mx-auto mt-16 w-full max-w-[480px] rounded-2xl border border-border bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-foreground">
        {outcome.ok ? "You're in." : "Signed up — with a note"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {outcome.message}
      </p>
      <div className="mt-6">
        <Link href="/browse" className={buttonVariants()}>
          Start browsing
        </Link>
      </div>
    </div>
  );
}
