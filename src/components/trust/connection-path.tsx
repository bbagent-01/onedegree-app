import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrustPathUser } from "@/lib/trust-data";

interface ConnectionPathProps {
  /** Ordered: [viewer, ...connectors, host]. Minimum 2 (viewer + host). */
  path: TrustPathUser[];
  /** Compact renders smaller avatars + smaller labels for listing cards. */
  compact?: boolean;
  className?: string;
}

/**
 * Renders the chain of users that connects the viewer to the host.
 *   You → [connector] (8) → Host
 *
 * The number under each arrow is the trust edge strength entering the
 * next node. The first node (viewer) has no entering edge.
 */
export function ConnectionPath({
  path,
  compact = false,
  className,
}: ConnectionPathProps) {
  if (path.length < 2) return null;

  const avatarSize = compact ? "h-7 w-7 text-[10px]" : "h-10 w-10 text-xs";
  const labelClass = compact
    ? "text-[10px] leading-tight"
    : "text-xs leading-tight";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5",
        compact ? "gap-1" : "gap-1.5",
        className
      )}
    >
      {path.map((user, idx) => {
        const isLast = idx === path.length - 1;
        const isFirst = idx === 0;
        const display = isFirst ? "You" : user.name.split(" ")[0];
        return (
          <div key={`${user.id}-${idx}`} className="flex items-center gap-1.5">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center justify-center overflow-hidden rounded-full bg-muted font-semibold text-foreground/70 ring-2 ring-white",
                  avatarSize
                )}
              >
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar_url}
                    alt={display}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(display)
                )}
              </div>
              <div
                className={cn(
                  "mt-1 max-w-[56px] truncate text-center font-medium text-foreground",
                  labelClass
                )}
              >
                {display}
              </div>
            </div>
            {!isLast && (
              <div className="flex flex-col items-center">
                <ChevronRight
                  className={cn(
                    "text-muted-foreground",
                    compact ? "h-3 w-3" : "h-4 w-4"
                  )}
                />
                {path[idx + 1]?.edge != null && (
                  <span
                    className={cn(
                      "font-mono tabular-nums text-muted-foreground",
                      compact ? "text-[9px]" : "text-[10px]"
                    )}
                  >
                    {path[idx + 1]!.edge}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
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
