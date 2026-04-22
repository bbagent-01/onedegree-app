"use client";

/**
 * Thread card for the `__type:issue_report:<id>__` structured
 * message. Same header + collapsible body + tinted footer pattern
 * as TermsOfferedCard, with the footer action driven by the
 * viewer's role (reporter vs counterparty) and the issue's live
 * status (open → acknowledged → resolved).
 *
 * Alpha-C S4 Chunk 5 — report payload is informational. No auto-
 * refunds, no admin queue. Escalations go through Loren manually
 * via Supabase.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Hammer,
  KeyRound,
  Loader2,
  ShieldAlert,
  Sparkles,
  Volume2,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  IssueCategory,
  IssueReport,
  IssueSeverity,
} from "@/lib/issue-reports-data";

interface Props {
  report: IssueReport;
  viewerId: string;
}

const CATEGORY_META: Record<
  IssueCategory,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  damage: { label: "Damage", icon: Hammer },
  access: { label: "Access", icon: KeyRound },
  amenity: { label: "Amenity", icon: Sparkles },
  safety: { label: "Safety", icon: ShieldAlert },
  noise: { label: "Noise", icon: Volume2 },
  other: { label: "Other", icon: HelpCircle },
};

const SEVERITY_META: Record<
  IssueSeverity,
  { label: string; cls: string }
> = {
  low: {
    label: "Low",
    cls: "bg-slate-100 text-slate-800",
  },
  medium: {
    label: "Medium",
    cls: "bg-amber-100 text-amber-800",
  },
  high: {
    label: "High",
    cls: "bg-red-100 text-red-800",
  },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function IssueReportCard({ report, viewerId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"ack" | "resolve" | null>(null);
  const [showResolve, setShowResolve] = useState(false);
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState(
    report.description.length > 160
  );

  const isReporter = viewerId === report.reporter_id;
  const isCounterparty = !isReporter;
  const isOpen = report.status === "open";
  const isAck = report.status === "acknowledged";
  const isResolved = report.status === "resolved";

  const categoryMeta = CATEGORY_META[report.category];
  const CategoryIcon = categoryMeta.icon;
  const severityMeta = SEVERITY_META[report.severity];

  const statusPill = (() => {
    if (isResolved) {
      return {
        label: "Resolved",
        cls: "bg-emerald-100 text-emerald-800",
      };
    }
    if (isAck) {
      return { label: "Acknowledged", cls: "bg-sky-100 text-sky-800" };
    }
    return { label: "Open", cls: "bg-red-100 text-red-800" };
  })();

  const acknowledge = async () => {
    if (busy) return;
    setBusy("ack");
    try {
      const res = await fetch(
        `/api/issue-reports/${report.id}/acknowledge`,
        { method: "POST" }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      toast.success("Marked as acknowledged");
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inbox:thread-refresh"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't acknowledge");
    } finally {
      setBusy(null);
    }
  };

  const resolve = async () => {
    if (busy) return;
    setBusy("resolve");
    try {
      const res = await fetch(`/api/issue-reports/${report.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      toast.success("Marked as resolved");
      setShowResolve(false);
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inbox:thread-refresh"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't resolve");
    } finally {
      setBusy(null);
    }
  };

  const description = report.description;
  const truncated = description.length > 160 && !expanded;
  const shownDescription = truncated
    ? description.slice(0, 160).trimEnd() + "…"
    : description;

  const iconBgCls = isResolved
    ? "bg-emerald-100 text-emerald-700"
    : isAck
      ? "bg-sky-100 text-sky-700"
      : "bg-red-100 text-red-700";

  return (
    <div className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border-2 border-border bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            iconBgCls
          )}
        >
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold">
              Issue reported
              {isReporter ? " · by you" : ""}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                statusPill.cls
              )}
            >
              {statusPill.label}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
              <CategoryIcon className="h-3 w-3" />
              {categoryMeta.label}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                severityMeta.cls
              )}
            >
              {severityMeta.label} severity
            </span>
            <span>· {fmtDate(report.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {shownDescription}
        </p>
        {description.length > 160 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:underline"
          >
            {expanded ? "Show less" : "Show more"}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                expanded && "rotate-180"
              )}
            />
          </button>
        )}

        {isResolved && report.resolution_note && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            <div className="font-semibold">Resolution note</div>
            <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">
              {report.resolution_note}
            </p>
          </div>
        )}
      </div>

      {/* Footer actions */}
      {isResolved ? (
        <div className="flex items-center gap-2 border-t border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900">
          <Check className="h-3.5 w-3.5" />
          Resolved{" "}
          {report.resolved_at ? `on ${fmtDate(report.resolved_at)}` : ""}.
        </div>
      ) : showResolve ? (
        <div className="space-y-2 border-t border-border bg-muted/30 p-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Resolution note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Replaced the shower head — all good now."
            className="w-full resize-none rounded-lg border-2 border-border bg-white px-3 py-2 text-sm shadow-sm focus:border-foreground focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowResolve(false)}
              className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={resolve}
              disabled={busy === "resolve"}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy === "resolve" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Resolving…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Mark resolved
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-3">
          <div className="text-xs text-muted-foreground">
            {isAck
              ? `Acknowledged${
                  report.acknowledged_at
                    ? ` on ${fmtDate(report.acknowledged_at)}`
                    : ""
                }.`
              : isReporter
                ? "Waiting for the other party to acknowledge."
                : "This was reported to you."}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isCounterparty && isOpen && (
              <button
                type="button"
                onClick={acknowledge}
                disabled={busy === "ack"}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
              >
                {busy === "ack" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Acknowledging…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Acknowledge
                  </>
                )}
              </button>
            )}
            {(isOpen || isAck) && (
              <button
                type="button"
                onClick={() => setShowResolve(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/50"
              >
                Mark resolved
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
