import { getSupabaseAdmin } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { JoinClient } from "./join-client";

interface JoinPageProps {
  params: Promise<{ token: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();

  // Fetch invite with inviter info
  const { data: invite } = await supabase
    .from("invites")
    .select(
      "id, token, invitee_email, invitee_phone, expires_at, claimed_by, inviter:users!invites_inviter_id_fkey(id, name, avatar_url)"
    )
    .eq("token", token)
    .single();

  // Invalid or missing
  if (!invite) {
    return <JoinClient status="invalid" token={token} />;
  }

  // Already claimed
  if (invite.claimed_by) {
    return <JoinClient status="claimed" token={token} />;
  }

  // Expired
  if (new Date(invite.expires_at) < new Date()) {
    return <JoinClient status="expired" token={token} />;
  }

  // If user is already signed in, redirect to claim
  const { userId } = await auth();
  if (userId) {
    redirect(`/join/${token}/claim`);
  }

  // Valid invite — show welcome page
  // Supabase returns the joined row; cast through unknown for the FK shape
  const inviterRaw = invite.inviter as unknown;
  const inviter = (Array.isArray(inviterRaw) ? inviterRaw[0] : inviterRaw) as
    | { id: string; name: string; avatar_url: string | null }
    | null;

  return (
    <JoinClient
      status="valid"
      token={token}
      inviterName={inviter?.name ?? "A member"}
      inviterAvatar={inviter?.avatar_url ?? null}
    />
  );
}
