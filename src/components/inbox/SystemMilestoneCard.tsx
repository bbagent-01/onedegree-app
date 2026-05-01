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
  /**
   * Color family for the body + icon chip. Each tone is a complete
   * style — pick the tone and you get the matched body, chip, and
   * text colors. tone="neutral" stays white-on-glass; the colored
   * tones get tinted bodies so every "Heads up"/system-event card
   * pulls from the same set of styles regardless of caller.
   */
  tone?: "neutral" | "emerald" | "amber" | "brand";
}

export function SystemMilestoneCard({
  icon: Icon,
  title,
  subtitle,
  tone = "neutral",
}: Props) {
  // Translucent tinted bodies for each tone so milestone cards
  // sit on the dark forest bg without becoming light-theme islands.
  const bodyClass =
    tone === "amber"
      ? "border-amber-400/30 bg-amber-400/10"
      : tone === "emerald"
        ? "border-[var(--tt-mint-mid)]/40 bg-[var(--tt-mint-mid)]/10"
        : tone === "brand"
          ? "border-brand/40 bg-brand/5"
          : "border-border bg-white";

  // Each tone gets a foreground that reads against its tinted body.
  const titleClass =
    tone === "amber" ? "text-amber-100" : "";
  const subtitleClass =
    tone === "amber" ? "text-amber-200/80" : "text-muted-foreground";

  return (
    <div className={cn("mx-auto w-full max-w-xl rounded-2xl border p-4", bodyClass)}>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            tone === "emerald" && "bg-[var(--tt-mint-mid)]/25 text-[var(--tt-mint)]",
            tone === "amber" && "bg-amber-400/20 text-amber-200",
            tone === "brand" && "bg-brand/15 text-brand",
            tone === "neutral" && "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn("text-sm font-semibold", titleClass)}>
            {title}
          </div>
          {subtitle && (
            <div className={cn("mt-0.5 text-xs", subtitleClass)}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
