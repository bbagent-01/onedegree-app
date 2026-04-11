"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Mail,
  Phone,
  Copy,
  Check,
  Clock,
  UserPlus,
  Loader2,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface Invite {
  id: string;
  invitee_email: string | null;
  invitee_phone: string | null;
  token: string;
  vouch_type: string;
  years_known_bucket: string;
  claimed_by: string | null;
  claimed_at: string | null;
  expires_at: string;
  created_at: string;
  claimed_user: { id: string; name: string; avatar_url: string | null } | null;
}

export default function MyInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/invites");
        if (!res.ok) throw new Error();
        const { invites: data } = await res.json();
        setInvites(data);
      } catch {
        // fail silently
      }
      setLoading(false);
    }
    load();
  }, []);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://app.onedegreebnb.com";

  const pending = invites.filter((i) => !i.claimed_by);
  const claimed = invites.filter((i) => i.claimed_by);

  async function handleCopy(token: string) {
    await navigator.clipboard.writeText(`${baseUrl}/join/${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  function isExpired(expiresAt: string) {
    return new Date(expiresAt) < new Date();
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function timeUntilExpiry(expiresAt: string) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-foreground-tertiary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl text-foreground">My Invites</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            Track your sent invites and see who joined.
          </p>
        </div>
        <Link href="/invite">
          <Button>
            <UserPlus className="size-4 mr-1" />
            Send Invite
          </Button>
        </Link>
      </div>

      {invites.length === 0 && (
        <div className="rounded-2xl border border-border bg-white p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light mx-auto mb-4">
            <UserPlus className="size-7 text-primary" />
          </div>
          <h2 className="text-lg text-foreground mb-2">
            No invites yet
          </h2>
          <p className="text-sm text-foreground-secondary mb-4">
            Invite your trusted friends to join One Degree BNB.
          </p>
          <Link href="/invite">
            <Button>
              <UserPlus className="size-4 mr-1" />
              Send Your First Invite
            </Button>
          </Link>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-foreground-secondary mb-3 flex items-center gap-2">
            <Clock className="size-4" />
            Pending ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((invite) => {
              const expired = isExpired(invite.expires_at);
              return (
                <div
                  key={invite.id}
                  className={cn(
                    "rounded-xl border bg-white p-4",
                    expired ? "border-border/50 opacity-60" : "border-border"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {invite.invitee_email ? (
                        <>
                          <Mail className="size-4 text-foreground-tertiary" />
                          <span className="text-sm font-medium text-foreground">
                            {invite.invitee_email}
                          </span>
                        </>
                      ) : (
                        <>
                          <Phone className="size-4 text-foreground-tertiary" />
                          <span className="text-sm font-medium text-foreground">
                            {invite.invitee_phone}
                          </span>
                        </>
                      )}
                      <Badge variant="default">
                        {invite.vouch_type === "inner_circle"
                          ? "Inner Circle"
                          : "Standard"}
                      </Badge>
                    </div>
                    <span
                      className={cn(
                        "text-xs",
                        expired
                          ? "text-destructive"
                          : "text-foreground-tertiary"
                      )}
                    >
                      {expired ? "Expired" : timeUntilExpiry(invite.expires_at)}
                    </span>
                  </div>
                  {!expired && (
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={`${baseUrl}/join/${invite.token}`}
                        className="flex-1 bg-background-mid text-xs font-mono truncate"
                      />
                      <Button
                        variant={copiedToken === invite.token ? "outline" : "secondary"}
                        size="sm"
                        onClick={() => handleCopy(invite.token)}
                      >
                        {copiedToken === invite.token ? (
                          <>
                            <Check className="size-3 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="size-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Claimed */}
      {claimed.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-foreground-secondary mb-3 flex items-center gap-2">
            <UserCheck className="size-4" />
            Joined ({claimed.length})
          </h2>
          <div className="space-y-3">
            {claimed.map((invite) => (
              <div
                key={invite.id}
                className="rounded-xl border border-border bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {invite.claimed_user?.avatar_url ? (
                      <img
                        src={invite.claimed_user.avatar_url}
                        alt=""
                        className="size-8 rounded-full border border-border"
                      />
                    ) : (
                      <div className="size-8 rounded-full bg-primary-light flex items-center justify-center">
                        <UserCheck className="size-4 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {invite.claimed_user?.name ?? "Member"}
                      </p>
                      <p className="text-xs text-foreground-tertiary">
                        {invite.invitee_email || invite.invitee_phone}
                      </p>
                    </div>
                    <Badge variant="default">
                      {invite.vouch_type === "inner_circle"
                        ? "Inner Circle"
                        : "Standard"}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <Badge variant="success">Joined</Badge>
                    <p className="text-xs text-foreground-tertiary mt-1">
                      {invite.claimed_at && formatDate(invite.claimed_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
