import { cn } from "@/lib/utils";
import { trustTier } from "@/lib/trust-data";

interface Props {
  /**
   * Per-connector path strength, sorted strongest → weakest by the
   * caller. Each dot is colored by its own strength bucket.
   */
  strengths: number[];
  /** Tailwind size utility. "h-2.5 w-2.5" for micro, "h-3 w-3" for medium. */
  size?: string;
  className?: string;
}

const MAX_DOTS = 4;

/**
 * Overlapping colored dots representing each connector's individual
 * path strength. When there are more than four connectors, the fifth
 * bubble shows a "+" count overlay instead of another dot.
 */
export function ConnectorDots({
  strengths,
  size = "h-3 w-3",
  className,
}: Props) {
  if (!strengths.length) return null;
  const visible = strengths.slice(0, MAX_DOTS);
  const overflow = strengths.length - visible.length;

  return (
    <div className={cn("flex items-center -space-x-1", className)}>
      {visible.map((s, i) => {
        const tier = trustTier(s);
        return (
          <span
            key={i}
            className={cn(
              "inline-block rounded-full ring-2 ring-white",
              size,
              tier.dotClass
            )}
            title={`${tier.label} · strength ${Math.round(s)}`}
          />
        );
      })}
      {overflow > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-zinc-500 text-[9px] font-semibold text-white ring-2 ring-white",
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
