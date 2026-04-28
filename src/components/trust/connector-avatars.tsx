import { User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AvatarConnector {
  id: string;
  name: string;
  avatar_url: string | null;
  /** True iff the viewer has a direct relationship with this connector.
   *  Unknown intermediaries are rendered as a silhouette to preserve
   *  the privacy of the chain. */
  viewer_knows: boolean;
}

interface Props {
  connectors: AvatarConnector[];
  /** Tailwind size utility for each avatar bubble. */
  size?: string;
  className?: string;
}

const MAX_AVATARS = 4;

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "•"
  );
}

/**
 * Overlapping connector avatars. Unknown intermediaries get a neutral
 * silhouette — the spec's strict anonymity rule says we never reveal
 * identity of people the viewer doesn't directly know.
 */
export function ConnectorAvatars({
  connectors,
  size = "h-6 w-6",
  className,
}: Props) {
  if (!connectors.length) return null;
  const visible = connectors.slice(0, MAX_AVATARS);
  const overflow = connectors.length - visible.length;

  return (
    <div className={cn("flex items-center -space-x-1.5", className)}>
      {visible.map((c, i) => (
        <span
          key={c.id || i}
          className={cn(
            "inline-flex items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-semibold text-foreground/70 ring-2 ring-white",
            size
          )}
          title={c.viewer_knows ? c.name : "Mutual connection"}
        >
          {c.viewer_knows && c.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.avatar_url}
              alt={c.name}
              className="h-full w-full object-cover"
            />
          ) : c.viewer_knows ? (
            initials(c.name)
          ) : (
            <User className="h-3 w-3 text-muted-foreground" />
          )}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-zinc-600 text-[10px] font-semibold text-white ring-2 ring-white",
            size
          )}
          title={`+${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
