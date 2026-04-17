import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { trustTier } from "@/lib/trust-data";

interface Props {
  /** Trust score the shield represents. Determines the stroke color. */
  score?: number;
  /**
   * Force a muted / disconnected tone regardless of score. Used for the
   * 2°+ and not-connected tags where the shield shouldn't carry a
   * trust-bucket color.
   */
  muted?: boolean;
  /** Tailwind size utility pair (e.g. "h-4 w-4"). Defaults to h-4 w-4. */
  size?: string;
  className?: string;
}

/**
 * Outline shield rendered in the score's tier color. The icon itself
 * is always outlined — the color change signals strength without
 * needing a filled badge.
 */
export function ShieldIcon({
  score = 0,
  muted = false,
  size = "h-4 w-4",
  className,
}: Props) {
  const tier = trustTier(score);
  const color = muted ? "text-zinc-400" : tier.textClass;
  return <Shield className={cn(size, "shrink-0", color, className)} strokeWidth={2} />;
}
