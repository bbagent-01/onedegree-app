"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  approachLabel,
  estimateRefundForCancel,
  type CancellationPolicy,
} from "@/lib/cancellation";

interface Props {
  bookingId: string;
  policy: CancellationPolicy;
  checkIn: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Cancel-reservation confirmation dialog with a refund callout
 * computed from the snapshotted cancellation policy + today's
 * distance to check-in. The platform doesn't process payments, so
 * the number shown is expectation-setting — the actual refund is a
 * direct conversation between host and guest.
 */
export function CancelTripDialog({
  bookingId,
  policy,
  checkIn,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const estimate = estimateRefundForCancel(policy, checkIn);

  const cancel = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/contact-requests/${bookingId}/cancel`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || `Failed (${res.status})`);
      }
      toast.success("Reservation cancelled");
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't cancel");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel this reservation?</DialogTitle>
          <DialogDescription>
            Your host will be notified. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>

        {estimate && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-900/80">
              Expected refund
            </div>

            {estimate.approach === "installments" ? (
              <div className="mt-1 space-y-1.5">
                <p className="text-sm font-semibold text-amber-900">
                  Any money already collected is nonrefundable.
                </p>
                <p className="text-xs leading-relaxed text-amber-900/80">
                  {approachLabel(estimate.approach)} — the host treats each
                  installment as locked in once paid. You and your host can
                  still negotiate directly, but the snapshot terms say
                  there&apos;s no refund obligation.
                </p>
              </div>
            ) : (
              <div className="mt-1 space-y-1.5">
                <p className="text-lg font-bold text-amber-900">
                  {estimate.refund_pct ?? 0}% refund
                </p>
                <p className="text-xs leading-relaxed text-amber-900/80">
                  {checkIn && estimate.days_until_checkin >= 0
                    ? `${estimate.days_until_checkin} day${
                        estimate.days_until_checkin === 1 ? "" : "s"
                      } until check-in. `
                    : ""}
                  {estimate.matched_window
                    ? `Falls into the "${describeWindow(
                        estimate.matched_window.cutoff_days_before_checkin
                      )}" window on the snapshotted policy.`
                    : "Past every refund cutoff — no refund is owed under the snapshot."}
                </p>
              </div>
            )}

            <p className="mt-2 text-[11px] leading-relaxed text-amber-900/70">
              1° B&amp;B doesn&apos;t process payments or manage refunds.
              Final amount is settled directly between you and your host.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="rounded-lg"
          >
            Keep reservation
          </Button>
          <Button
            onClick={cancel}
            disabled={submitting}
            className="rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Cancelling…
              </>
            ) : (
              <>
                <X className="mr-1.5 h-4 w-4" />
                Cancel reservation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function describeWindow(cutoffDays: number): string {
  if (cutoffDays === 0) return "Day of check-in onward";
  if (cutoffDays === 1) return "Up to 24 hours before check-in";
  return `Up to ${cutoffDays} days before check-in`;
}
