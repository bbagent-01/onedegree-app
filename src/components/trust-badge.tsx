import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";

interface TrustBadgeProps {
  score: number;
  size?: "sm" | "md";
  className?: string;
}

function getTier(score: number) {
  if (score >= 90) return { label: "Exceptional", color: "bg-emerald-500 text-white" };
  if (score >= 80) return { label: "Solid", color: "bg-blue-500 text-white" };
  if (score >= 60) return { label: "Building", color: "bg-amber-500 text-white" };
  return { label: "New", color: "bg-gray-400 text-white" };
}

export function TrustBadge({ score, size = "sm", className }: TrustBadgeProps) {
  const tier = getTier(score);
  const isSmall = size === "sm";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        tier.color,
        isSmall ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className
      )}
    >
      <Shield className={isSmall ? "h-3 w-3" : "h-4 w-4"} />
      <span>{score}</span>
    </div>
  );
}
