import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { NetworkData, NetworkPerson, PendingInvite } from "@/lib/network-data";
import { YEARS_KNOWN_BUCKETS } from "@/lib/vouch-constants";
import {
  Shield,
  Star,
  UserPlus,
  Users,
  Zap,
  Info,
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

function yearsLabel(bucket: string): string {
  return (
    YEARS_KNOWN_BUCKETS.find((b) => b.value === bucket)?.label ?? bucket
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function NetworkSection({ data }: { data: NetworkData }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground">Your Network</h2>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-white p-4 text-center">
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground">
                <Zap className="h-3 w-3" />
                Vouch Power
                <Info className="h-3 w-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[220px]">
              <p className="text-xs">
                Your vouch power is based on the average guest rating of people
                you&apos;ve vouched for. Higher ratings = stronger vouches.
              </p>
            </TooltipContent>
          </Tooltip>
          <div className="mt-1 text-2xl font-bold">
            {data.stats.vouchPower.toFixed(1)}x
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

      {/* People you've vouched for */}
      {data.vouchedFor.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground">
            People you&apos;ve vouched for
          </h3>
          <div className="mt-2 divide-y divide-border rounded-xl border border-border bg-white">
            {data.vouchedFor.map((p) => (
              <PersonRow key={p.user_id} person={p} direction="given" />
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
              <PersonRow key={p.user_id} person={p} direction="received" />
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

      {/* Empty state */}
      {data.vouchedFor.length === 0 &&
        data.vouchedBy.length === 0 &&
        data.pendingInvites.length === 0 && (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium text-foreground">
              Your trust network is empty
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start by vouching for people you know or inviting friends to join.
            </p>
          </div>
        )}
    </section>
  );
}

function PersonRow({
  person,
  direction,
}: {
  person: NetworkPerson;
  direction: "given" | "received";
}) {
  const isInnerCircle = person.vouch_type === "inner_circle";

  return (
    <Link
      href={`/profile/${person.user_id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
    >
      <Avatar className="h-9 w-9">
        {person.user_avatar && (
          <AvatarImage src={person.user_avatar} alt={person.user_name} />
        )}
        <AvatarFallback className="text-xs">
          {initials(person.user_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{person.user_name}</div>
        <div className="text-xs text-muted-foreground">
          {yearsLabel(person.years_known_bucket)}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
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
          {isInnerCircle ? "Inner Circle" : "Standard"}
        </Badge>
        {person.vouch_score != null && (
          <span className="text-xs font-medium text-muted-foreground">
            {person.vouch_score} pts
          </span>
        )}
      </div>
    </Link>
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
          {invite.invitee_name || invite.invitee_email || invite.invitee_phone}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDate(invite.created_at)}
        </div>
      </div>
      <Badge className={config.className}>{config.label}</Badge>
    </div>
  );
}
