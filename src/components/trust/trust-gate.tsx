import { CheckCircle2, Lock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrustPathUser } from "@/lib/trust-data";

interface TrustGateProps {
  /** The viewer's current trust score to the host. 0 if no connection. */
  userScore: number;
  /** The host's min_trust_gate — score required for full access. */
  requiredScore: number;
  /** Mutual connections who could introduce the viewer. May be empty. */
  mutualConnections: TrustPathUser[];
  className?: string;
}

/**
 * Explains to a viewer why a listing is gated, and suggests the path
 * forward. Three states:
 *
 *   1. Trusted — green, checkmark, "You're trusted"
 *   2. Under-gate — orange, lock, mutual connection suggestion
 *   3. Disconnected — gray, lock, ask for introduction
 */
export function TrustGate({
  userScore,
  requiredScore,
  mutualConnections,
  className,
}: TrustGateProps) {
  const isTrusted = userScore >= requiredScore && userScore > 0;
  const hasConnections = mutualConnections.length > 0;

  if (isTrusted) {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-2xl border border-[var(--tt-mint-mid)]/40 bg-[var(--tt-mint-mid)]/10 px-4 py-3",
          className
        )}
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        <div className="text-sm">
          <div className="font-semibold text-[var(--tt-mint)]">You&apos;re trusted</div>
          <p className="mt-0.5 text-[var(--tt-mint)]/80">
            Your connection to this host (score {userScore}) meets their
            required trust gate of {requiredScore}. You can message them and
            request to book.
          </p>
        </div>
      </div>
    );
  }

  if (userScore > 0 && hasConnections) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-4",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <div className="font-semibold text-amber-100">
              Requires Trust Score of {requiredScore}
            </div>
            <p className="mt-0.5 text-amber-200/80">
              Yours is {userScore}. Ask one of your mutual connections below
              for an introduction or a stronger vouch.
            </p>
          </div>
        </div>
        <MutualList mutualConnections={mutualConnections} tone="amber" />
      </div>
    );
  }

  if (hasConnections) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-4",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <div className="font-semibold text-amber-100">
              Private listing
            </div>
            <p className="mt-0.5 text-amber-200/80">
              You&apos;re not directly connected to this host, but your network
              is. Ask a mutual connection for an introduction.
            </p>
          </div>
        </div>
        <MutualList mutualConnections={mutualConnections} tone="amber" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-4",
        className
      )}
    >
      <Lock className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="text-sm">
        <div className="font-semibold text-foreground">Not connected</div>
        <p className="mt-0.5 text-muted-foreground">
          You don&apos;t share any connections with this host yet. Grow your
          network — a single vouch from a shared friend unlocks access.
        </p>
      </div>
    </div>
  );
}

function MutualList({
  mutualConnections,
  tone,
}: {
  mutualConnections: TrustPathUser[];
  tone: "amber" | "gray";
}) {
  const top = mutualConnections.slice(0, 5);
  const more = mutualConnections.length - top.length;
  const label = tone === "amber" ? "text-amber-100" : "text-foreground";

  return (
    <div className="mt-4 border-t border-amber-400/30/60 pt-3">
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide",
          label
        )}
      >
        <Users className="h-3.5 w-3.5" />
        Who could introduce you
      </div>
      <ul className="mt-2 space-y-1.5">
        {top.map((u) => (
          <li key={u.id} className="flex items-center gap-2 text-sm">
            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white text-[10px] font-semibold text-foreground/70 ring-1 ring-black/10">
              {u.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={u.avatar_url}
                  alt={u.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(u.name)
              )}
            </div>
            <span className={cn("font-medium", label)}>{u.name}</span>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <div className={cn("mt-1.5 text-xs", label)}>
          +{more} more shared {more === 1 ? "connection" : "connections"}
        </div>
      )}
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
