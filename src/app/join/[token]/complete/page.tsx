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
    return { ok: false, message: "Invite not found.", inviterName: null };
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
