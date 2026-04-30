import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase";
import { InviteAcceptCard } from "@/components/invite/InviteAcceptCard";
import { buttonVariants } from "@/components/ui/button";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type InviteLookup =
  | { kind: "valid"; invite: InviteData; inviter: InviterData }
  | { kind: "expired" }
  | { kind: "consumed"; claimedUserName: string | null }
  | { kind: "not_found" };

interface InviteData {
  id: string;
  token: string;
  invitee_name: string | null;
  invitee_phone: string | null;
  invitee_email: string | null;
  vouch_type: string;
  years_known_bucket: string;
  expires_at: string;
  status: string;
  claimed_by: string | null;
}

interface InviterData {
  id: string;
  name: string;
  avatar_url: string | null;
  location: string | null;
}

/**
 * Resolve the token against both invite tables. The B1 pre-vouch
 * flow (`pending_vouches`, migration 047) and the legacy Twilio
 * invite flow (`invites`, migration 003) share the /join/[token]
 * URL space — token format differs (base64url ~32 vs hex 64) so
 * collisions are vanishingly unlikely. Try invites first because
 * legacy rows existed before this dispatch was wired up; pending
 * vouches is the fallback.
 */
async function lookupInvite(token: string): Promise<InviteLookup> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("invites")
    .select(
      "id, token, inviter_id, invitee_name, invitee_phone, invitee_email, vouch_type, years_known_bucket, expires_at, status, claimed_by"
    )
    .eq("token", token)
    .maybeSingle();

  if (!data) {
    return await lookupPendingVouch(token);
  }

  if (data.claimed_by) {
    const { data: claimedUser } = await supabase
      .from("users")
      .select("name")
      .eq("id", data.claimed_by)
      .maybeSingle();
    return { kind: "consumed", claimedUserName: (claimedUser?.name as string) ?? null };
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { kind: "expired" };
  }

  const { data: inviter } = await supabase
    .from("users")
    .select("id, name, avatar_url, location")
    .eq("id", data.inviter_id as string)
    .maybeSingle();

  if (!inviter) return { kind: "not_found" };

  return {
    kind: "valid",
    invite: {
      id: data.id as string,
      token: data.token as string,
      invitee_name: (data.invitee_name as string | null) ?? null,
      invitee_phone: (data.invitee_phone as string | null) ?? null,
      invitee_email: (data.invitee_email as string | null) ?? null,
      vouch_type: data.vouch_type as string,
      years_known_bucket: data.years_known_bucket as string,
      expires_at: data.expires_at as string,
      status: data.status as string,
      claimed_by: null,
    },
    inviter: {
      id: inviter.id as string,
      name: (inviter.name as string) || "A friend",
      avatar_url: (inviter.avatar_url as string) ?? null,
      location: (inviter.location as string) ?? null,
    },
  };
}

async function lookupPendingVouch(token: string): Promise<InviteLookup> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("pending_vouches")
    .select(
      "id, token, sender_id, recipient_name, vouch_type, years_known_bucket, expires_at, status, claimed_by"
    )
    .eq("token", token)
    .maybeSingle();

  if (!data) return { kind: "not_found" };

  // status drives the rendered card. We deliberately do NOT lean on
  // expires_at alone — the cron sweeper (see /api/cron/expire-pending-vouches)
  // flips status to 'expired' so a stale row + ungroomed status can't
  // trick a recipient into thinking the link is still live.
  if (data.status === "claimed") {
    const { data: claimedUser } = await supabase
      .from("users")
      .select("name")
      .eq("id", data.claimed_by as string)
      .maybeSingle();
    return { kind: "consumed", claimedUserName: (claimedUser?.name as string) ?? null };
  }
  if (data.status === "canceled" || data.status === "expired") {
    return { kind: "expired" };
  }
  if (data.expires_at && new Date(data.expires_at as string) < new Date()) {
    return { kind: "expired" };
  }

  const { data: inviter } = await supabase
    .from("users")
    .select("id, name, avatar_url, location")
    .eq("id", data.sender_id as string)
    .maybeSingle();
  if (!inviter) return { kind: "not_found" };

  return {
    kind: "valid",
    invite: {
      id: data.id as string,
      token: data.token as string,
      invitee_name: (data.recipient_name as string | null) ?? null,
      // Phone intentionally NOT surfaced to the public card — we know
      // it server-side for the auto-claim, but it's PII and the
      // recipient already knows their own number.
      invitee_phone: null,
      invitee_email: null,
      vouch_type: data.vouch_type as string,
      years_known_bucket: data.years_known_bucket as string,
      expires_at: data.expires_at as string,
      status: data.status as string,
      claimed_by: null,
    },
    inviter: {
      id: inviter.id as string,
      name: (inviter.name as string) || "A friend",
      avatar_url: (inviter.avatar_url as string) ?? null,
      location: (inviter.location as string) ?? null,
    },
  };
}

/**
 * Render a simple card layout for the not-valid states. Keeps the
 * page self-contained (no client code unless we actually have an
 * invite to accept).
 */
function DeadEndCard({
  headline,
  body,
  cta = "Sign up on Trustead",
}: {
  headline: string;
  body: string;
  cta?: string;
}) {
  return (
    <div className="mx-auto mt-16 w-full max-w-[480px] rounded-2xl border border-border bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-foreground">{headline}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <div className="mt-6 flex items-center gap-3">
        <Link href="/sign-up" className={buttonVariants()}>
          {cta}
        </Link>
        <Link
          href="/sign-in"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Already a member? Sign in
        </Link>
      </div>
    </div>
  );
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 8) notFound();

  const result = await lookupInvite(token);

  if (result.kind === "not_found") {
    return (
      <DeadEndCard
        headline="Invite not found"
        body="This invite link doesn't match any invitation on our system. It may have been typed in wrong or the inviter may have cancelled it."
      />
    );
  }
  if (result.kind === "expired") {
    return (
      <DeadEndCard
        headline="This invite has expired or is no longer valid"
        body="Reach out to whoever sent this to you and ask for a fresh one. You can still create an account on Trustead, but this particular pre-vouch won't apply."
      />
    );
  }
  if (result.kind === "consumed") {
    return (
      <DeadEndCard
        headline="Already used"
        body={
          result.claimedUserName
            ? `This invite was already claimed by ${result.claimedUserName}. One invite, one claim.`
            : "This invite was already claimed."
        }
        cta="Sign in"
      />
    );
  }

  return (
    <InviteAcceptCard
      token={result.invite.token}
      inviter={result.inviter}
      inviteeName={result.invite.invitee_name}
      vouchType={result.invite.vouch_type}
      yearsKnownBucket={result.invite.years_known_bucket}
    />
  );
}
