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
 * B1+B2: pending_vouches token-resume path.
 *
 * Three modes share this entry point. The mode column on the row
 * decides how the claim resolves:
 *
 *   - 'phone' — webhook may have already auto-claimed by phone match;
 *     this function double-checks (idempotent) and logs a mismatch
 *     event if the signup phone differs from the targeted phone.
 *
 *   - 'open_individual' — single-claim by token. First user to land
 *     here wins; subsequent users see "this invite was already used."
 *     Vouch row gets `from_pending_vouch_id` set so the sender
 *     dashboard can surface a "review?" badge.
 *
 *   - 'open_group' — multi-claim by token, capped at max_claims.
 *     Each unique signup creates a vouch (idempotent on
 *     voucher_id+vouchee_id, so re-clicks don't double-bump). Atomic
 *     UPDATE guards against race-condition over-claims.
 */
async function consumePendingVouch(
  token: string,
  clerkUserId: string
): Promise<ConsumeOutcome> {
  const supabase = getSupabaseAdmin();

  const { data: pv } = await supabase
    .from("pending_vouches")
    .select(
      "id, sender_id, mode, recipient_phone, vouch_type, years_known_bucket, status, expires_at, claimed_by, max_claims, claim_count"
    )
    .eq("token", token)
    .maybeSingle();

  if (!pv) {
    return { ok: false, message: "Invite not found.", inviterName: null };
  }

  const mode = (pv.mode as string) ?? "phone";

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

  // Resolve clerk → DB user. Retry once to tolerate the gap between
  // Clerk account creation and the user.created webhook landing.
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

  // Self-claim guard. The DB has a `vouches_no_self_vouch` CHECK
  // that would reject the upsert anyway, but catching it here gives
  // a friendly message instead of a 500 — useful for admins
  // exercising the share-link UX with their own account.
  if (pv.sender_id === dbUserId) {
    return {
      ok: false,
      message:
        "Test invite — sender and recipient are the same account. No real vouch was created. The pending row stays in your dashboard so you can cancel or resend it.",
      inviterName: senderName,
    };
  }

  // Test-user isolation guard (mirrors the invites flow). Applies to
  // all modes equally — vouch trigger would block at the DB level
  // anyway, but the friendlier message lands here.
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

  // ── Mode A: phone-required ──────────────────────────────────────
  if (mode === "phone") {
    // Already claimed by the webhook before this page loaded → success.
    if (pv.status === "claimed" && pv.claimed_by === dbUserId) {
      return {
        ok: true,
        message: `${senderName} has vouched for you. Welcome.`,
        inviterName: senderName,
      };
    }

    const intendedPhone = (pv.recipient_phone as string | null) ?? null;
    const phonesMatch =
      !!intendedPhone && !!dbUserPhone && intendedPhone === dbUserPhone;

    if (!phonesMatch) {
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

    return await applyVouchAndClaim(
      supabase,
      pv.id as string,
      pv.sender_id as string,
      dbUserId,
      pv.vouch_type as string,
      pv.years_known_bucket as string,
      senderName,
      { flipToClaimed: true, atomicMaxClaims: null }
    );
  }

  // ── Mode B: open individual link, single-claim by token ─────────
  if (mode === "open_individual") {
    if (pv.status === "claimed") {
      // Someone already claimed this single-claim link.
      if (pv.claimed_by === dbUserId) {
        // Same user re-clicks the link → idempotent success.
        return {
          ok: true,
          message: `${senderName} has vouched for you. Welcome.`,
          inviterName: senderName,
        };
      }
      return {
        ok: false,
        message:
          "This invite was already claimed by someone else. Your account was still created — ask your friend to send you a fresh link.",
        inviterName: senderName,
      };
    }
    return await applyVouchAndClaim(
      supabase,
      pv.id as string,
      pv.sender_id as string,
      dbUserId,
      pv.vouch_type as string,
      pv.years_known_bucket as string,
      senderName,
      { flipToClaimed: true, atomicMaxClaims: null }
    );
  }

  // ── Mode C: open group link, multi-claim up to max_claims ───────
  if (mode === "open_group") {
    const maxClaims = (pv.max_claims as number | null) ?? 0;
    const claimCount = (pv.claim_count as number | null) ?? 0;

    // Pre-check: is the link full? If the same user re-clicks after
    // already claiming, the vouch upsert below is a no-op and we
    // surface success — but pre-check first so a "full" message
    // doesn't fire incorrectly for a returning claimant.
    const { data: existingVouch } = await supabase
      .from("vouches")
      .select("id")
      .eq("voucher_id", pv.sender_id)
      .eq("vouchee_id", dbUserId)
      .eq("is_demo_origin", false)
      .maybeSingle();

    if (!existingVouch && claimCount >= maxClaims) {
      return {
        ok: false,
        message:
          "This group invite is full. Your account was created — ask your friend for a fresh link.",
        inviterName: senderName,
      };
    }

    return await applyVouchAndClaim(
      supabase,
      pv.id as string,
      pv.sender_id as string,
      dbUserId,
      pv.vouch_type as string,
      pv.years_known_bucket as string,
      senderName,
      { flipToClaimed: false, atomicMaxClaims: maxClaims }
    );
  }

  // Defensive — shouldn't be reachable; the DB CHECK rejects unknown modes.
  return {
    ok: false,
    message:
      "Couldn't read this invite. Your account was created — ask your friend to send a fresh one.",
    inviterName: senderName,
  };
}

/**
 * Shared claim path used by all three modes. Upserts the vouch row
 * (idempotent on voucher_id+vouchee_id), records provenance via
 * `from_pending_vouch_id`, and either flips status='claimed' (Mode A/B)
 * or atomically increments claim_count under the max-claims predicate
 * (Mode C). The atomic predicate is what protects Mode C against
 * concurrent over-claims past the cap.
 */
async function applyVouchAndClaim(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  pendingVouchId: string,
  senderId: string,
  vouchee: string,
  vouchType: string,
  yearsKnownBucket: string,
  senderName: string,
  opts: { flipToClaimed: boolean; atomicMaxClaims: number | null }
): Promise<ConsumeOutcome> {
  const { error: vouchErr } = await supabase.from("vouches").upsert(
    {
      voucher_id: senderId,
      vouchee_id: vouchee,
      vouch_type: vouchType,
      years_known_bucket: yearsKnownBucket,
      is_post_stay: false,
      is_staked: false,
      from_pending_vouch_id: pendingVouchId,
    },
    { onConflict: "voucher_id,vouchee_id" }
  );
  if (vouchErr) {
    console.error("[pending-vouch:claim] vouch upsert failed:", vouchErr);
    return {
      ok: false,
      message:
        "Couldn't create the pre-vouch — your account is fine. Ask your inviter to vouch for you directly.",
      inviterName: senderName,
    };
  }

  if (opts.flipToClaimed) {
    await supabase
      .from("pending_vouches")
      .update({
        status: "claimed",
        claimed_by: vouchee,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", pendingVouchId)
      .eq("status", "pending");
  } else if (opts.atomicMaxClaims !== null) {
    // Mode C: atomic claim-count bump via the dedicated stored proc
    // (see migration 048). The proc's WHERE predicate enforces the
    // cap inside a single statement, so concurrent claims can't race
    // past max_claims even if both threads pre-checked while the
    // count was still under the limit.
    const { error: rpcErr } = await supabase.rpc(
      "increment_pending_vouch_claim_count",
      { p_id: pendingVouchId }
    );
    if (rpcErr) {
      console.error("[pending-vouch:claim] increment_count rpc failed:", rpcErr);
      // Don't fail the whole claim — the vouch row already landed.
      // Worst case the count drifts by one and the dashboard
      // shows "N-1/max" instead of "N/max" briefly.
    }
  }

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
