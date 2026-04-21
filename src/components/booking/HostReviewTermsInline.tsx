"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  Loader2,
  Receipt,
  RotateCcw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CANCELLATION_APPROACHES,
  CANCELLATION_PRESETS,
  buildPolicyFromPreset,
  type CancellationApproach,
  type CancellationPolicy,
  type CancellationPreset,
} from "@/lib/cancellation";
import { CancellationPolicyCard } from "./CancellationPolicyCard";

interface Props {
  bookingId: string;
  /** Initial total from the original request. Editable. */
  initialTotal: number | null;
  /** Currently-resolved policy (listing override → host default) —
   *  seeds the form so the host isn't starting from scratch. */
  initialPolicy: CancellationPolicy;
  guestFirstName: string;
}

/**
 * Inline "Review & send terms" card. Renders directly inside the
 * message thread when the host is viewing a pending request, so
 * editing the offer feels like part of the conversation instead of
 * popping a modal over the top. After the host sends, the thread
 * gets a terms_offered system message and this card drops out.
 *
 * Kept separate from CancellationPolicyForm because this is the
 * quick-edit flow (approach + preset + total). Full custom-schedule
 * edits still live on /settings/hosting and the listing edit page.
 */
export function HostReviewTermsInline({
  bookingId,
  initialTotal,
  initialPolicy,
  guestFirstName,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"approve" | "decline" | null>(
    null
  );
  const [totalStr, setTotalStr] = useState<string>(
    initialTotal && initialTotal > 0 ? String(initialTotal) : ""
  );
  const [approach, setApproach] = useState<CancellationApproach>(
    initialPolicy.approach
  );
  const initialPreset =
    initialPolicy.preset === "custom"
      ? "moderate"
      : (initialPolicy.preset as Exclude<CancellationPreset, "custom">);
  const [preset, setPreset] =
    useState<Exclude<CancellationPreset, "custom">>(initialPreset);

  const previewPolicy: CancellationPolicy = useMemo(
    () => buildPolicyFromPreset(approach, preset),
    [approach, preset]
  );

  const send = async (decision: "accepted" | "declined") => {
    setSubmitting(decision === "accepted" ? "approve" : "decline");
    try {
      const totalNum = totalStr.trim() ? Number(totalStr.trim()) : undefined;
      if (
        decision === "accepted" &&
        totalStr.trim() &&
        (!Number.isFinite(totalNum) || (totalNum as number) < 0)
      ) {
        throw new Error("Total price must be a non-negative number");
      }
      const res = await fetch(`/api/contact-requests/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: decision,
          ...(decision === "accepted"
            ? {
                total_price: totalNum,
                cancellation_approach: approach,
                cancellation_preset: preset,
              }
            : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      toast.success(
        decision === "accepted"
          ? `Terms sent to ${guestFirstName}`
          : "Request declined"
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border-2 border-amber-300 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <Check className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-amber-900">
            Review &amp; send terms to {guestFirstName}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-900/80">
            Adjust the total and cancellation policy if you want — these
            numbers lock when {guestFirstName} confirms. The reservation
            isn&apos;t final until they accept.
          </p>
        </div>
      </div>

      <div className="space-y-5 p-4">
        {/* Total price */}
        <section>
          <label
            htmlFor={`total-${bookingId}`}
            className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold"
          >
            <Receipt className="h-3.5 w-3.5" />
            Total for this stay
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
              $
            </span>
            <input
              id={`total-${bookingId}`}
              type="number"
              min="0"
              step="1"
              value={totalStr}
              onChange={(e) => setTotalStr(e.target.value)}
              placeholder="e.g. 450"
              className="h-11 w-full rounded-lg border-2 border-border !bg-white pl-7 pr-3 text-sm font-medium shadow-sm focus:border-foreground focus:outline-none"
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Editable until the guest accepts. Leave blank to keep their
            submitted estimate.
          </p>
        </section>

        {/* Approach toggle */}
        <section>
          <div className="mb-1.5 text-sm font-semibold">
            Cancellation approach
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {CANCELLATION_APPROACHES.map((a) => {
              const Icon = a.key === "installments" ? CalendarClock : RotateCcw;
              const active = approach === a.key;
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => setApproach(a.key)}
                  className={cn(
                    "rounded-xl border-2 p-3 text-left transition",
                    active
                      ? "border-brand bg-brand/5"
                      : "border-border bg-white hover:border-foreground/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <div className="text-sm font-semibold">{a.title}</div>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {a.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Preset pills */}
        <section>
          <div className="mb-1.5 text-sm font-semibold">Preset</div>
          <div className="flex flex-wrap gap-2">
            {CANCELLATION_PRESETS.map((p) => {
              const active = preset === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPreset(p.key)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-semibold transition",
                    active
                      ? "border-brand bg-brand text-white"
                      : "border-border bg-white text-foreground hover:border-foreground/30"
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Need a fully custom schedule? Set it on your listing edit
            page under the Cancellation tab — your overrides apply
            automatically to new requests.
          </p>
        </section>

        {/* Preview */}
        <section>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Preview — what {guestFirstName} will see
          </div>
          <CancellationPolicyCard policy={previewPolicy} scope="reservation" />
        </section>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 p-4 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={() => send("declined")}
          disabled={submitting !== null}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
        >
          <X className="h-4 w-4" />
          {submitting === "decline" ? "Declining…" : "Decline request"}
        </button>
        <button
          type="button"
          onClick={() => send("accepted")}
          disabled={submitting !== null}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting === "approve" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Approve &amp; send terms
            </>
          )}
        </button>
      </div>
    </div>
  );
}
