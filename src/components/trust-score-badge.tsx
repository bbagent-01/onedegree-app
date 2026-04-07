"use client";

import { cn } from "@/lib/utils";

function getTrustColor(score: number): string {
  if (score >= 81) return "var(--trust-exceptional)";
  if (score >= 61) return "var(--trust-solid)";
  if (score >= 31) return "var(--trust-building)";
  return "var(--trust-low)";
}

function getTrustLabel(score: number): string {
  if (score >= 81) return "Exceptional";
  if (score >= 61) return "Solid";
  if (score >= 31) return "Building";
  return "New";
}

function getTrustColorClass(score: number): string {
  if (score >= 81) return "text-trust-exceptional";
  if (score >= 61) return "text-trust-solid";
  if (score >= 31) return "text-trust-building";
  return "text-trust-low";
}

function getTrustBgClass(score: number): string {
  if (score >= 81) return "bg-cyan-500/10 border-cyan-500/20";
  if (score >= 61) return "bg-emerald-500/10 border-emerald-500/20";
  if (score >= 31) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
}

interface TrustScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  vouchCount?: number;
  className?: string;
}

export function TrustScoreBadge({
  score,
  size = "md",
  showLabel = false,
  vouchCount,
  className,
}: TrustScoreBadgeProps) {
  const color = getTrustColor(score);
  const label = getTrustLabel(score);
  const colorClass = getTrustColorClass(score);
  const bgClass = getTrustBgClass(score);
  const circumference = 2 * Math.PI * 18;
  const filled = (score / 100) * circumference;

  if (size === "sm") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5",
          bgClass,
          className
        )}
      >
        <span className={cn("font-mono text-xs font-semibold", colorClass)}>
          {score}
        </span>
      </div>
    );
  }

  if (size === "lg") {
    return (
      <div className={cn("flex flex-col items-center gap-2", className)}>
        <div className="relative">
          <svg width="80" height="80" viewBox="0 0 44 44" className="-rotate-90">
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-muted/50"
            />
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - filled}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
              style={{
                filter: score >= 81 ? `drop-shadow(0 0 4px ${color})` : undefined,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={cn("font-mono text-xl font-bold", colorClass)}
            >
              {score}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className={cn("text-xs font-medium uppercase tracking-wider", colorClass)}>
            {label}
          </span>
          {vouchCount !== undefined && (
            <span className="text-xs text-muted-foreground">
              {vouchCount} vouch{vouchCount !== 1 ? "es" : ""}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Medium (default)
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="relative">
        <svg width="36" height="36" viewBox="0 0 44 44" className="-rotate-90">
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted/50"
          />
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - filled}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            style={{
              filter: score >= 81 ? `drop-shadow(0 0 3px ${color})` : undefined,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-mono text-[10px] font-bold", colorClass)}>
            {score}
          </span>
        </div>
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <span className={cn("text-xs font-medium", colorClass)}>{label}</span>
          {vouchCount !== undefined && (
            <span className="text-[10px] text-muted-foreground">
              {vouchCount} vouches
            </span>
          )}
        </div>
      )}
    </div>
  );
}
