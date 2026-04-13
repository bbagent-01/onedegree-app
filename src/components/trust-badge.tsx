import { cn } from "@/lib/utils";

interface TrustBadgeProps {
  score: number;
  size?: "sm" | "md";
}

function getTrustTier(score: number) {
  if (score >= 80) return { label: "Exceptional", color: "bg-trust-exceptional text-white" };
  if (score >= 60) return { label: "Solid", color: "bg-trust-solid text-white" };
  if (score >= 40) return { label: "Building", color: "bg-trust-building text-white" };
  return { label: "New", color: "bg-trust-low text-white" };
}

export function TrustBadge({ score, size = "md" }: TrustBadgeProps) {
  const tier = getTrustTier(score);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill font-mono font-medium shadow-sm",
        tier.color,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      )}
    >
      {score}
    </span>
  );
}
