import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "edge";

interface ClaimPageProps {
  params: Promise<{ token: string }>;
}

export default async function ClaimPage({ params }: ClaimPageProps) {
  const { token } = await params;
  const { userId } = await auth();

  // Must be signed in
  if (!userId) {
    redirect(`/join/${token}`);
  }

  const supabase = getSupabaseAdmin();

  // Look up the current user in Supabase
  const { data: currentUser } = await supabase
    .from("users")
    .select("id, email, phone_number")
    .eq("clerk_id", userId)
    .single();

  if (!currentUser) {
    // Webhook may not have fired yet — wait briefly and retry
    await new Promise((r) => setTimeout(r, 2000));
    const { data: retryUser } = await supabase
      .from("users")
      .select("id, email, phone_number")
      .eq("clerk_id", userId)
      .single();

    if (!retryUser) {
      redirect(`/join/${token}?error=user-not-found`);
    }

    return processInvite(supabase, retryUser, token);
  }

  return processInvite(supabase, currentUser, token);
}

async function processInvite(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  user: { id: string; email: string; phone_number: string | null },
  token: string
) {
  // Fetch the invite
  const { data: invite } = await supabase
    .from("invites")
    .select("*")
    .eq("token", token)
    .single();

  if (!invite) {
    redirect("/listings?toast=invalid-invite");
  }

  // Already claimed
  if (invite.claimed_by) {
    // If claimed by this user, just redirect
    if (invite.claimed_by === user.id) {
      redirect("/listings?toast=welcome");
    }
    redirect("/listings?toast=invite-already-claimed");
  }

  // Expired
  if (new Date(invite.expires_at) < new Date()) {
    redirect(`/join/${token}?error=expired`);
  }

  // The token IS the auth for the invite — whoever has the link can claim it.
  // Contact info (email/phone) is for the inviter's reference, not access control.

  // Mark invite as claimed
  const { error: claimError } = await supabase
    .from("invites")
    .update({
      claimed_by: user.id,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", invite.id)
    .is("claimed_by", null); // Prevent race conditions

  if (claimError) {
    console.error("Claim error:", claimError);
    redirect("/listings?toast=claim-failed");
  }

  // Convert pre-vouch to real vouch row
  // Check if vouch already exists (edge case: inviter already vouched for this user)
  const { data: existingVouch } = await supabase
    .from("vouches")
    .select("id")
    .eq("voucher_id", invite.inviter_id)
    .eq("vouchee_id", user.id)
    .maybeSingle();

  if (!existingVouch) {
    const { error: vouchError } = await supabase.from("vouches").insert({
      voucher_id: invite.inviter_id,
      vouchee_id: user.id,
      vouch_type: invite.vouch_type,
      years_known_bucket: invite.years_known_bucket,
      reputation_stake_confirmed: invite.reputation_stake_confirmed ?? true,
    });

    if (vouchError) {
      console.error("Vouch creation error:", vouchError);
      // Don't block the user — invite is claimed, vouch failed
    }
  }

  // Recalculate inviter's vouch_power
  await supabase.rpc("calculate_vouch_power", {
    p_user_id: invite.inviter_id,
  });

  redirect("/listings?toast=welcome");
}
