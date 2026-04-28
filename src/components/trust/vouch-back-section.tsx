"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { VouchModal } from "@/components/trust/vouch-modal";
import { cn } from "@/lib/utils";
import type { VouchBackCandidate } from "@/lib/network-data";

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

/**
 * Relative time (e.g. "3 days ago", "just now") capped at "on MMM d"
 * for anything older than ~30 days. Keeps the row scannable without
 * pulling in a full date-fns dep.
 */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return `on ${new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

export function VouchBackSection({
  candidates,
}: {
  candidates: VouchBackCandidate[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(candidates);
  const [modalTarget, setModalTarget] = useState<{
    id: string;
    name: string;
    avatar_url: string | null;
  } | null>(null);
  const [pendingDismiss, setPendingDismiss] = useState<Set<string>>(new Set());

  const removeLocally = useCallback((voucherId: string) => {
    setRows((prev) => prev.filter((r) => r.voucher_id !== voucherId));
  }, []);

  const handleDismiss = useCallback(
    async (voucherId: string) => {
      // Optimistic: mark the row for fade before awaiting the server.
      // On failure we restore, but keep silent — dismissing is a low-
      // stakes action and we explicitly want no toast noise.
      setPendingDismiss((prev) => new Set(prev).add(voucherId));
      try {
        const res = await fetch("/api/vouch-back/dismiss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voucherId }),
        });
        if (!res.ok) throw new Error("dismiss failed");
        removeLocally(voucherId);
      } catch {
        setPendingDismiss((prev) => {
          const n = new Set(prev);
          n.delete(voucherId);
          return n;
        });
      }
    },
    [removeLocally]
  );

  const handleVouchSaved = useCallback(() => {
    if (!modalTarget) return;
    removeLocally(modalTarget.id);
    setModalTarget(null);
    // Revalidate server data so the "People you've vouched for" list
    // up-section picks up the new outgoing vouch + the nav badge count
    // drops.
    router.refresh();
  }, [modalTarget, removeLocally, router]);

  if (rows.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-base font-semibold text-foreground">
        People who vouched for you
      </h3>
      <div className="mt-2 divide-y divide-border rounded-xl border border-border bg-white">
        {rows.map((r) => {
          const fading = pendingDismiss.has(r.voucher_id);
          return (
            <div
              key={r.voucher_id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-opacity",
                fading && "opacity-40 pointer-events-none"
              )}
            >
              <Link
                href={`/profile/${r.voucher_id}`}
                className="shrink-0"
                aria-label={`Open ${r.voucher_name}'s profile`}
              >
                <Avatar className="h-11 w-11">
                  {r.voucher_avatar && (
                    <AvatarImage
                      src={r.voucher_avatar}
                      alt={r.voucher_name}
                    />
                  )}
                  <AvatarFallback className="text-sm">
                    {initials(r.voucher_name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/profile/${r.voucher_id}`}
                  className="truncate text-sm font-semibold text-foreground hover:underline"
                >
                  {r.voucher_name}
                </Link>
                <div className="text-xs text-muted-foreground">
                  Vouched for you {relativeTime(r.created_at)}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    setModalTarget({
                      id: r.voucher_id,
                      name: r.voucher_name,
                      avatar_url: r.voucher_avatar,
                    })
                  }
                >
                  Vouch back
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDismiss(r.voucher_id)}
                  disabled={fading}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Not yet
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {modalTarget && (
        <VouchModal
          open={!!modalTarget}
          onOpenChange={(o) => !o && setModalTarget(null)}
          target={modalTarget}
          /* NOTE: `existingVouch` is intentionally omitted so the modal
             never reads/renders the incoming voucher's tier — picking
             a tier here should be fresh, without reciprocity pressure. */
          onVouchSaved={handleVouchSaved}
        />
      )}
    </div>
  );
}
