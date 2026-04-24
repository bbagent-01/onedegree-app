import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ConnectionPopover } from "@/components/trust/connection-breakdown";
import { NetworkEmptyState } from "@/components/trust/network-empty-state";
import { VouchBackSection } from "@/components/trust/vouch-back-section";
import type { NetworkData, NetworkPerson, PendingInvite } from "@/lib/network-data";
import { yearsKnownLabel } from "@/lib/trust/years-known-labels";
import {
  Shield,
  Star,
  UserPlus,
  Zap,
  Send,
  Clock,
} from "lucide-react";

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function NetworkSection({
  data,
  currentUserId,
}: {
  data: NetworkData;
  currentUserId: string;
}) {
  const { vouchPower, avgGuestRatingOfVouchees } = data.stats;
  const hasRatingData = avgGuestRatingOfVouchees !== null;

  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground">Your Network</h2>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-white p-4">
          <div
            className="flex cursor-help items-center gap-1 text-xs font-medium text-muted-foreground"
            title="Based on the average guest rating of people you've vouched for. Scale: 0.5× to 1.5×. Baseline (4.0 rating) = 1.0×."
          >
            <Zap className="h-3 w-3" />
            Vouch Power
          </div>
          <div className="mt-1 text-2xl font-bold">
            {vouchPower.toFixed(2)}x
          </div>
          <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
            {hasRatingData ? (
              <>
                <div>
                  Avg guest rating: {avgGuestRatingOfVouchees!.toFixed(2)}
                </div>
                <div>
                  {avgGuestRatingOfVouchees!.toFixed(2)} / 4.0 = {vouchPower.toFixed(2)}x
                </div>
              </>
            ) : (
              <div>No guest data yet (default 1.0x)</div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 text-center">
          <div className="text-xs font-medium text-muted-foreground">
            Vouches Given
          </div>
          <div className="mt-1 text-2xl font-bold">
            {data.stats.vouchesGiven}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 text-center">
          <div className="text-xs font-medium text-muted-foreground">
            Vouches Received
          </div>
          <div className="mt-1 text-2xl font-bold">
            {data.stats.vouchesReceived}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/invite"
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:bg-foreground/90"
        >
          <UserPlus className="h-4 w-4" />
          Invite someone
        </Link>
        <Link
          href="/vouch"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <Shield className="h-4 w-4" />
          Vouch for a member
        </Link>
      </div>

      {/* Vouch-back candidates: people who vouched for you but whom
          you haven't reciprocated (or dismissed). Placed above the
          outgoing list so an unanswered incoming vouch is the first
          thing the user sees after the summary. */}
      <VouchBackSection candidates={data.vouchBackCandidates} />

      {/* People you've vouched for */}
      {data.vouchedFor.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground">
            People you&apos;ve vouched for
          </h3>
          <div className="mt-2 divide-y divide-border rounded-xl border border-border bg-white">
            {data.vouchedFor.map((p) => (
              <PersonRow key={p.user_id} person={p} showGuestRating />
            ))}
          </div>
        </div>
      )}

      {/* People who've vouched for you */}
      {data.vouchedBy.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground">
            People who&apos;ve vouched for you
          </h3>
          <div className="mt-2 divide-y divide-border rounded-xl border border-border bg-white">
            {data.vouchedBy.map((p) => (
              <PersonRow key={p.user_id} person={p} />
            ))}
          </div>
        </div>
      )}

      {/* Pending invitations */}
      {data.pendingInvites.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Pending invitations
          </h3>
          <div className="mt-2 divide-y divide-border rounded-xl border border-border bg-white">
            {data.pendingInvites.map((inv) => (
              <InviteRow key={inv.id} invite={inv} />
            ))}
          </div>
        </div>
      )}

      {/* 0° empty state — no inbound, no outbound vouches, no pending invites. */}
      {data.vouchedFor.length === 0 &&
        data.vouchedBy.length === 0 &&
        data.pendingInvites.length === 0 && (
          <NetworkEmptyState currentUserId={currentUserId} />
        )}
    </section>
  );
}

function PersonRow({
  person,
  showGuestRating = false,
}: {
  person: NetworkPerson;
  /** True for the vouched-for list — surfaces the vouchee's guest
   *  rating + a colored dot so the voucher can see which of their
   *  endorsements are helping vs. hurting their vouch_power. */
  showGuestRating?: boolean;
}) {
  const isInnerCircle = person.vouch_type === "inner_circle";
  const gr = person.guest_rating;
  // 4.0 is neutral; below pulls vouch_power down, above lifts it up.
  const ratingDot =
    typeof gr === "number" && person.guest_review_count > 0
      ? gr < 4
        ? { color: "bg-amber-500", title: "Below 4.0 average — pulling your vouch power down." }
        : gr > 4
          ? { color: "bg-emerald-500", title: "Above 4.0 average — boosting your vouch power." }
          : { color: "bg-zinc-300", title: "At the 4.0 baseline." }
      : null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      <ConnectionPopover targetUserId={person.user_id}>
        <Avatar className="h-9 w-9 cursor-pointer">
          {person.user_avatar && (
            <AvatarImage src={person.user_avatar} alt={person.user_name} />
          )}
          <AvatarFallback className="text-xs">
            {initials(person.user_name)}
          </AvatarFallback>
        </Avatar>
      </ConnectionPopover>
      <Link
        href={`/profile/${person.user_id}`}
        className="min-w-0 flex-1 hover:underline"
      >
        <div className="truncate text-sm font-medium">{person.user_name}</div>
        <div className="text-xs text-muted-foreground">
          {yearsKnownLabel(person.years_known_bucket)}
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        {showGuestRating && typeof gr === "number" && person.guest_review_count > 0 && (
          <span
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            title={ratingDot?.title}
          >
            {ratingDot && (
              <span className={`h-1.5 w-1.5 rounded-full ${ratingDot.color}`} />
            )}
            <Star className="h-3 w-3 fill-foreground text-foreground" />
            <span className="font-medium text-foreground">{gr.toFixed(1)}</span>
          </span>
        )}
        <Badge
          className={
            isInnerCircle
              ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
              : "bg-blue-100 text-blue-800 hover:bg-blue-100"
          }
        >
          {isInnerCircle ? (
            <Star className="mr-1 h-3 w-3" />
          ) : (
            <Shield className="mr-1 h-3 w-3" />
          )}
          {isInnerCircle ? "Vouch+" : "Vouch"}
        </Badge>
        {person.vouch_score != null && (
          <span className="text-xs font-medium text-muted-foreground">
            {person.vouch_score} pts
          </span>
        )}
      </div>
    </div>
  );
}

function InviteRow({ invite }: { invite: PendingInvite }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    sent: {
      label: "Sent",
      className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    },
    clicked: {
      label: "Clicked",
      className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
    },
  };
  const config = statusConfig[invite.status] ?? statusConfig.sent;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Send className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {invite.invitee_name || invite.invitee_phone || invite.invitee_email}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {invite.invitee_phone && (
            <span>{invite.invitee_phone}</span>
          )}
          {invite.invitee_phone && invite.invitee_email && (
            <span className="mx-0.5">·</span>
          )}
          {invite.invitee_email && (
            <span>{invite.invitee_email}</span>
          )}
          <span className="mx-0.5">·</span>
          <Clock className="h-3 w-3" />
          {formatDate(invite.created_at)}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {invite.delivery_method && invite.delivery_method !== "failed" && (
          <Badge className="bg-muted text-muted-foreground hover:bg-muted text-[10px] px-1.5 py-0">
            {invite.delivery_method === "both"
              ? "SMS + Email"
              : invite.delivery_method === "sms"
                ? "SMS"
                : "Email"}
          </Badge>
        )}
        <Badge className={config.className}>{config.label}</Badge>
      </div>
    </div>
  );
}
