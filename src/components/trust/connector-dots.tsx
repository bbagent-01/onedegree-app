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
  /**
   * Color override. "mustard" renders all dots in a light/dark
   * mustard ramp instead of the default emerald trust-tier palette.
   * Used for 3° badges so every element of the tag reads mustard.
   */
  tone?: "mustard";
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
  tone,
  className,
}: Props) {
  if (!strengths.length) return null;
  const visible = strengths.slice(0, MAX_DOTS);
  const overflow = strengths.length - visible.length;

  // Mustard ramp: stronger hops get the deeper mustard, weaker hops
  // a paler tint. Two-step ramp keeps the palette consistent with
  // the pill (#bf8a0d) without inventing new shades.
  const mustardDot = (strength: number): string => {
    if (strength >= 20) return "bg-[#bf8a0d]";
    if (strength >= 10) return "bg-[#d4a024]";
    return "bg-[#e6b95c]";
  };

  return (
    <div className={cn("flex items-center -space-x-1", className)}>
      {visible.map((s, i) => {
        const tier = trustTier(s);
        const bg = tone === "mustard" ? mustardDot(s) : tier.dotClass;
        return (
          <span
            key={i}
            className={cn(
              "inline-block rounded-full ring-2 ring-white",
              size,
              bg
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
