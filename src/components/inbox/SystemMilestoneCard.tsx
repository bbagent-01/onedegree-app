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
  const bodyClass =
    tone === "amber"
      ? "border-amber-300 bg-amber-50"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50"
        : tone === "brand"
          ? "border-brand/40 bg-brand/5"
          : "border-border bg-white";

  // Amber body uses high-contrast dark amber text. Other tones rely
  // on the body's own foreground (cream on neutral via glass rules,
  // dark on emerald/brand cream-tinted bodies via tone-fg flip).
  const titleClass = tone === "amber" ? "text-amber-900" : "";
  const subtitleClass =
    tone === "amber" ? "text-amber-800/80" : "text-muted-foreground";

  return (
    <div className={cn("mx-auto w-full max-w-xl rounded-2xl border p-4", bodyClass)}>
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
