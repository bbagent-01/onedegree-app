import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { trustTier } from "@/lib/trust-data";

interface Props {
  /** Trust score the shield represents. Determines the fill color. */
  score?: number;
  /**
   * Force a muted / disconnected tone regardless of score. Used for the
   * 2°+ and not-connected tags where the shield shouldn't carry a
   * trust-bucket color.
   */
  muted?: boolean;
  /** When true, render as an outlined shield instead of filled. */
  outlined?: boolean;
  /** Tailwind size utility pair (e.g. "h-4 w-4"). Defaults to h-4 w-4. */
  size?: string;
  className?: string;
}

/**
 * Solid shield rendered in the score's tier color. The body is filled
 * so the color reads strongly even at small sizes; pass `outlined`
 * for contexts where an outline fits better.
 */
export function ShieldIcon({
  score = 0,
  muted = false,
  outlined = false,
  size = "h-4 w-4",
  className,
}: Props) {
  const tier = trustTier(score);
  const color = muted ? "text-zinc-400" : tier.textClass;
  return (
    <Shield
      className={cn(
        size,
        "shrink-0",
        color,
        !outlined && "fill-current",
        className
      )}
      strokeWidth={outlined ? 2 : 1.5}
    />
  );
}
