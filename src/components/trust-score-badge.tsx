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
  if (score >= 81) return "bg-purple-50 border-purple-200";
  if (score >= 61) return "bg-emerald-50 border-emerald-200";
  if (score >= 31) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
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
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 backdrop-blur-md",
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
              className="text-background-dark"
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
                filter: score >= 81 ? `drop-shadow(0 0 6px ${color})` : undefined,
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
            <span className="text-xs text-foreground-secondary">
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
            className="text-background-dark"
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
              filter: score >= 81 ? `drop-shadow(0 0 4px ${color})` : undefined,
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
            <span className="text-[10px] text-foreground-secondary">
              {vouchCount} vouches
            </span>
          )}
        </div>
      )}
    </div>
  );
}
