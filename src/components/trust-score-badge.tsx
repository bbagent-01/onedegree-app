"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Thresholds:
// <10 = red (very weak — single low vouch path)
// 10-24 = orange (building — decent but thin connection)
// 25-39 = green (solid — strong connection)
// 40+ = purple (exceptional — multiple strong paths)
function getTrustVariant(score: number) {
  if (score >= 40) return "purple" as const;
  if (score >= 25) return "success" as const;
  if (score >= 10) return "warning" as const;
  return "destructive" as const;
}

function getTrustColorClass(score: number): string {
  if (score >= 40) return "text-purple-700";
  if (score >= 25) return "text-green-700";
  if (score >= 10) return "text-orange-700";
  return "text-red-600";
}

interface TrustScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  vouchCount?: number;
  className?: string;
}

export function TrustScoreBadge({
  score,
  size = "md",
  vouchCount,
  className,
}: TrustScoreBadgeProps) {
  const variant = getTrustVariant(score);
  const colorClass = getTrustColorClass(score);

  if (size === "sm") {
    return (
      <Badge variant={variant} className={cn("font-mono font-semibold", className)}>
        {score}
      </Badge>
    );
  }

  if (size === "lg") {
    return (
      <div className={cn("flex flex-col items-center gap-1", className)}>
        <span className={cn("font-mono text-3xl font-bold", colorClass)}>
          {score}
        </span>
        {vouchCount !== undefined && (
          <span className="text-xs text-foreground-secondary">
            {vouchCount} shared connection{vouchCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    );
  }

  // Medium (default)
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Badge variant={variant} className="font-mono font-bold">
        {score}
      </Badge>
      {vouchCount !== undefined && (
        <span className="text-xs text-foreground-secondary">
          {vouchCount} connection{vouchCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
