"use client";

/**
 * Thread action button that opens the "Report an issue" modal.
 * Renders on the thread action row between the checked-in and
 * reviewed stages. Stage gating lives in the parent — this
 * component just renders the trigger + modal and owns form state.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  IssueCategory,
  IssueSeverity,
} from "@/lib/issue-reports-data";

interface Props {
  threadId: string;
}

const CATEGORY_OPTIONS: { value: IssueCategory; label: string; hint: string }[] = [
  { value: "damage", label: "Damage", hint: "Something broken or damaged" },
  { value: "access", label: "Access", hint: "Can't get in / lockbox issues" },
  { value: "amenity", label: "Amenity", hint: "Heat, AC, wifi, appliance" },
  { value: "safety", label: "Safety", hint: "Something unsafe" },
  { value: "noise", label: "Noise", hint: "Disruptive sound" },
  { value: "other", label: "Other", hint: "Something else" },
];

const SEVERITY_OPTIONS: { value: IssueSeverity; label: string; hint: string }[] = [
  { value: "low", label: "Low", hint: "Annoyance, not urgent" },
  { value: "medium", label: "Medium", hint: "Needs a fix soon" },
  { value: "high", label: "High", hint: "Urgent — blocks the stay" },
];

export function ReportIssueButton({ threadId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<IssueCategory>("amenity");
  const [severity, setSeverity] = useState<IssueSeverity>("medium");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const disabled = submitting || description.trim().length < 20;

  const submit = async () => {
    if (disabled) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/issue-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          category,
          severity,
          description: description.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      toast.success("Issue reported");
      setOpen(false);
      setDescription("");
      setCategory("amenity");
      setSeverity("medium");
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inbox:thread-refresh"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted/50"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Report an issue
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Report an issue</DialogTitle>
            <DialogDescription>
              Flag a problem during or after the stay. Both sides
              see the report in the thread so nothing gets buried.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Category
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setCategory(opt.value)}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2 text-left text-sm transition",
                      category === opt.value
                        ? "border-foreground bg-muted/50"
                        : "border-border bg-white hover:border-foreground/40"
                    )}
                  >
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {opt.hint}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Severity
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {SEVERITY_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setSeverity(opt.value)}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2 text-center text-sm transition",
                      severity === opt.value
                        ? "border-foreground bg-muted/50"
                        : "border-border bg-white hover:border-foreground/40"
                    )}
                  >
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {opt.hint}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What happened?
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Describe the issue in at least 20 characters."
                className="h-32 w-full rounded-xl border-2 border-border !bg-white px-4 py-3 text-sm font-medium shadow-sm focus:border-foreground focus:outline-none"
              />
              <div className="mt-1 text-[11px] text-muted-foreground">
                {description.trim().length}/20 min
              </div>
            </div>
          </div>

          <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={disabled}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Submit report
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
