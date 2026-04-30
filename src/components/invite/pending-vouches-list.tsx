"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send, X, Share2, Clock, Check, Shield, Star } from "lucide-react";
import { toast } from "sonner";

interface Row {
  id: string;
  recipient_name: string | null;
  recipient_phone: string | null;
  status: "pending" | "claimed" | "canceled" | "expired";
  created_at: string;
  expires_at: string;
  token: string;
  claimed_at: string | null;
  vouch_type: "standard" | "inner_circle";
  mode: "phone" | "open_individual" | "open_group";
  group_label: string | null;
  max_claims: number | null;
  claim_count: number;
  share_url: string;
  prefilled_sms_text: string;
}

interface Props {
  rows: Row[];
}

function last4(phone: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `••• ${digits.slice(-4)}`;
}

/**
 * Mode-aware label resolvers. The dashboard list shows one row per
 * pending_vouches row regardless of mode; only the labels differ.
 */
function primaryLabel(row: Row): string {
  if (row.mode === "open_group") {
    return row.group_label || "Group invite";
  }
  return row.recipient_name || "—";
}

function secondaryLabel(row: Row): string {
  if (row.mode === "open_group") {
    const max = row.max_claims ?? 0;
    return `${row.claim_count}/${max} joined`;
  }
  if (row.mode === "open_individual") {
    return "Open link";
  }
  return last4(row.recipient_phone);
}

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_BADGE: Record<Row["status"], { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  claimed: {
    label: "Claimed",
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  },
  canceled: {
    label: "Canceled",
    className: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
  },
  expired: {
    label: "Expired",
    className: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
  },
};

export function PendingVouchesList({ rows: initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleCancel = async (row: Row) => {
    if (!confirm(`Cancel the invite for ${primaryLabel(row)}?`)) return;
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/pending-vouches/${row.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Cancel failed");
      // Optimistic update — match server behavior: phone scrubbed,
      // status flipped. The DB-side CHECK guarantees the actual row
      // landed the same way.
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, status: "canceled", recipient_phone: null }
            : r
        )
      );
      toast.success("Invite canceled.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't cancel.");
    } finally {
      setBusyId(null);
    }
  };

  const handleResend = async (row: Row) => {
    setBusyId(row.id);
    try {
      // Same token, same URL — no DB write, just re-open the share
      // sheet with the prefilled text. Web Share API → sms: → copy.
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await (navigator as Navigator & {
          share: (data: ShareData) => Promise<void>;
        }).share({
          text: row.prefilled_sms_text,
          url: row.share_url,
        });
        return;
      }
      // Read userAgent off globalThis — the share-API in-narrow above
      // poisons direct `navigator.userAgent` access on the post-share
      // branch (TS thinks navigator is `never` after the guard).
      const ua = (globalThis as { navigator?: { userAgent?: string } })
        .navigator?.userAgent ?? "";
      const isIOS =
        /iPad|iPhone|iPod/.test(ua) &&
        typeof window !== "undefined" &&
        !("MSStream" in window);
      const sep = isIOS ? "&" : "?";
      const phone = row.recipient_phone ?? "";
      window.location.href = `sms:${phone}${sep}body=${encodeURIComponent(
        row.prefilled_sms_text
      )}`;
    } catch (e) {
      const name = (e as { name?: string })?.name;
      if (name === "AbortError") return;
      // Last-resort copy.
      try {
        await navigator.clipboard.writeText(row.prefilled_sms_text);
        toast.success("Copied — paste into Messages.");
      } catch {
        toast.error("Couldn't open the share sheet.");
      }
    } finally {
      setBusyId(null);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Send className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">
          No pending invites yet.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pre-vouch a friend and we&apos;ll mint a link you can text them.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-white">
      {rows.map((row) => {
        const cfg = STATUS_BADGE[row.status];
        const days = row.status === "pending" ? daysUntil(row.expires_at) : null;
        const isBusy = busyId === row.id || pending;
        const isInnerCircle = row.vouch_type === "inner_circle";
        return (
          <div
            key={row.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              {row.status === "claimed" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">
                  {primaryLabel(row)}
                </span>
                <Badge
                  className={
                    isInnerCircle
                      ? "bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px] px-1.5 py-0"
                      : "bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px] px-1.5 py-0"
                  }
                >
                  {isInnerCircle ? (
                    <Star className="mr-1 h-2.5 w-2.5" />
                  ) : (
                    <Shield className="mr-1 h-2.5 w-2.5" />
                  )}
                  {isInnerCircle ? "Vouch+" : "Vouch"}
                </Badge>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <span>{secondaryLabel(row)}</span>
                <span className="mx-0.5">·</span>
                <Clock className="h-3 w-3" />
                <span>{formatDate(row.created_at)}</span>
                {days !== null && (
                  <>
                    <span className="mx-0.5">·</span>
                    <span>
                      {days === 0
                        ? "expires today"
                        : days === 1
                          ? "expires tomorrow"
                          : `${days} days left`}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge className={cfg.className}>{cfg.label}</Badge>
              {row.status === "pending" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() =>
                      startTransition(() => {
                        handleResend(row);
                      })
                    }
                    className="gap-1"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Resend
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => handleCancel(row)}
                    className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
