import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * Reusable milestone card for plain-ish system messages that don't
 * carry their own rich state (reservation request, check-in reminder,
 * future lifecycle pings). Mirrors the Dev1 milestone-card pattern
 * used by TermsOfferedCard / PaymentDueCard so every system event
 * renders at the same visual weight in the thread feed.
 *
 * Deliberately no actions — the request-to-reserve action (Review &
 * send terms) lives inline at the end of the thread for hosts, and
 * reminders are informational only.
 */
interface Props {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  /** Accent color for the icon chip. */
  tone?: "neutral" | "emerald" | "amber" | "brand";
}

export function SystemMilestoneCard({
  icon: Icon,
  title,
  subtitle,
  tone = "neutral",
}: Props) {
  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-white p-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            tone === "emerald" && "bg-emerald-100 text-emerald-700",
            tone === "amber" && "bg-amber-100 text-amber-700",
            tone === "brand" && "bg-brand/15 text-brand",
            tone === "neutral" && "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{title}</div>
          {subtitle && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
