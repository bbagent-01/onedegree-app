"use client";

/**
 * Shared abuse-report modal. Rendered from the profile 3-dot menu
 * ("Report user") and from the per-message thread menu ("Report
 * message"). Writes to /api/incidents with the abuse-report shape:
 * { reportedUserId, reason, description, sourceContext? }.
 *
 * No admin UI this session — reports land in the DB and Loren
 * reviews via Supabase directly.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type ReportReason =
  | "harassment"
  | "safety_concern"
  | "misrepresentation"
  | "scam"
  | "other";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "harassment", label: "Harassment" },
  { value: "safety_concern", label: "Safety concern" },
  { value: "misrepresentation", label: "Misrepresentation" },
  { value: "scam", label: "Scam / fraud" },
  { value: "other", label: "Other" },
];

const MIN_DETAILS = 50;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId: string;
  reportedUserName: string;
  /**
   * Structured origin written to incidents.source_context so admins
   * can jump to the surface that prompted the report.
   */
  sourceContext?: Record<string, unknown>;
}

export function ReportUserModal({
  open,
  onOpenChange,
  reportedUserId,
  reportedUserName,
  sourceContext,
}: Props) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setDetails("");
      setSubmitting(false);
    }
  }, [open]);

  const submit = async () => {
    if (submitting) return;
    if (!reason) {
      toast.error("Please pick a reason");
      return;
    }
    if (details.trim().length < MIN_DETAILS) {
      toast.error(`Please add at least ${MIN_DETAILS} characters of detail.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedUserId,
          reason,
          description: details.trim(),
          sourceContext: sourceContext ?? { source: "profile" },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Couldn't submit report");
        return;
      }
      toast.success("Report submitted. Our team will review.");
      onOpenChange(false);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Report {reportedUserName.split(" ")[0]}
          </DialogTitle>
          <DialogDescription>
            We review every report. Nothing is shared with the person you
            report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Reason</label>
            <div className="mt-2 space-y-1.5">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-white px-3 py-2 text-sm transition hover:bg-muted/40 has-[:checked]:border-brand has-[:checked]:bg-brand/5"
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="h-4 w-4 accent-brand"
                  />
                  <span className="font-medium">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="report-details" className="text-sm font-medium">
              What happened?{" "}
              <span className="text-xs text-muted-foreground">
                (at least {MIN_DETAILS} characters)
              </span>
            </label>
            <textarea
              id="report-details"
              rows={5}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Give us enough detail to investigate — who, what, when."
              maxLength={2000}
              className="mt-1.5 w-full resize-none rounded-lg border-2 border-border bg-white p-3 text-sm shadow-sm focus:border-foreground/60 focus:outline-none"
            />
            <div className="mt-1 text-right text-xs text-muted-foreground">
              {details.trim().length} / {MIN_DETAILS}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={submitting}
              className="flex-1 bg-brand text-white hover:bg-brand-600"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit report"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
