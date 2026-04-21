"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  Loader2,
  RotateCcw,
  X,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Initial total from the original request. Editable. */
  initialTotal: number | null;
  /** The currently-resolved policy (listing override → host default).
   *  Used as the default approach/preset the host can tweak. */
  initialPolicy: CancellationPolicy;
  guestFirstName: string;
}

/**
 * Host-side modal that replaces the old instant "Approve" action.
 * Shows the inbound terms the guest would lock to, lets the host
 * edit the total price + cancellation approach/preset, and sends
 * a single PATCH with the edits. Backend snapshots whatever the
 * host submits onto the contact_request.
 *
 * Design intent: the host's approval IS the offer — the guest then
 * confirms via the inline Accept button in the thread's
 * terms_offered system message.
 */
export function HostReviewTermsModal({
  bookingId,
  open,
  onOpenChange,
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
  // Host can only pick a named preset from the quick editor. Custom
  // policies still have to be set via the full form on the listing
  // edit / settings pages.
  const initialPreset =
    initialPolicy.preset === "custom"
      ? "moderate"
      : (initialPolicy.preset as Exclude<CancellationPreset, "custom">);
  const [preset, setPreset] =
    useState<Exclude<CancellationPreset, "custom">>(initialPreset);

  // Live preview — matches what the terms_offered card will render.
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
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      toast.success(
        decision === "accepted"
          ? `Terms sent to ${guestFirstName}`
          : "Request declined"
      );
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review &amp; send terms</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Adjust the total and cancellation policy if you want — these
          numbers lock when {guestFirstName} accepts. The reservation
          isn&apos;t final until they confirm.
        </p>

        {/* Total price */}
        <section>
          <label
            htmlFor="total-price"
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
              id="total-price"
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
            Editable until the guest accepts. Leave blank to keep the
            estimate the guest submitted.
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

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            onClick={() => send("declined")}
            disabled={submitting !== null}
            className="rounded-lg text-red-700 hover:bg-red-50"
          >
            <X className="mr-1.5 h-4 w-4" />
            {submitting === "decline" ? "Declining…" : "Decline request"}
          </Button>
          <Button
            onClick={() => send("accepted")}
            disabled={submitting !== null}
            className="rounded-lg bg-brand text-white hover:bg-brand-600"
          >
            {submitting === "approve" ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-4 w-4" />
                Approve &amp; send terms
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
