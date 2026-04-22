"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { ReportUserModal } from "./report-user-modal";

interface Props {
  reportedUserId: string;
  reportedUserName: string;
  /** Context for admins — defaults to {source: "profile"}. */
  sourceContext?: Record<string, unknown>;
  /** Surface variant:
   *   - "outline" — muted secondary button (profile header)
   *   - "ghost"   — low-ink sidebar link */
  variant?: "outline" | "ghost";
  /** Override the visible label. Defaults to "Report". */
  label?: string;
  className?: string;
}

/**
 * Visible "Report" entry point. Opens the shared ReportUserModal.
 * Kept one level less prominent than primary actions — secondary
 * styling so it doesn't get mistaken for a main CTA, but not hidden
 * in a 3-dot menu either.
 */
export function ReportUserButton({
  reportedUserId,
  reportedUserName,
  sourceContext,
  variant = "outline",
  label = "Report",
  className,
}: Props) {
  const [open, setOpen] = useState(false);

  // Outline matches the Contact button on the profile header so the
  // trio (Vouch / Contact / Report) reads as a single action row.
  // Ghost is the full-width boxed surface in the thread sidebar,
  // shape-matched to the "View full trip details" link right above
  // it, with the Report color treatment.
  const base =
    "inline-flex items-center gap-2 text-sm font-semibold transition";
  const variantClass =
    variant === "ghost"
      ? "w-full rounded-xl border border-border bg-white px-4 py-3 text-muted-foreground hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
      : "rounded-lg border border-border bg-white px-5 py-2.5 text-muted-foreground hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${base} ${variantClass} ${className ?? ""}`.trim()}
      >
        <Flag className="h-3.5 w-3.5" />
        {label}
      </button>
      <ReportUserModal
        open={open}
        onOpenChange={setOpen}
        reportedUserId={reportedUserId}
        reportedUserName={reportedUserName}
        sourceContext={sourceContext}
      />
    </>
  );
}
