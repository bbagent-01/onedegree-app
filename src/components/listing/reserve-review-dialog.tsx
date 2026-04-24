"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  CalendarDays,
  Loader2,
  Receipt,
  Users as UsersIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CancellationPolicyCard } from "@/components/booking/CancellationPolicyCard";
import type { CancellationPolicy } from "@/lib/cancellation";

interface BookingApiResponse {
  id?: string;
  threadId?: string;
  error?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  nights: number;
  pricePerNight: number;
  cleaningFee: number;
  serviceFee: number;
  total: number;
  hostFirstName: string;
  cancellationPolicy: CancellationPolicy | null;
  /** Invoked after a successful submission — typically routes the
   *  guest into the newly created thread. */
  onSent: (result: { threadId: string | null }) => void;
}

/**
 * Request-review step. Guests land here after clicking "Request to
 * stay" on the listing sidebar and confirm the full picture (dates,
 * pricing, cancellation policy) plus optionally attach a note to the
 * host before the request posts to /api/bookings.
 *
 * The booking sidebar used to submit directly on click — that shipped
 * the request with no confirmation, no policy preview, and no way to
 * send a message. Guests were blind-signing into a reservation.
 */
export function ReserveReviewDialog({
  open,
  onOpenChange,
  listingId,
  checkIn,
  checkOut,
  guests,
  nights,
  pricePerNight,
  cleaningFee,
  serviceFee,
  total,
  hostFirstName,
  cancellationPolicy,
  onSent,
}: Props) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          checkIn: format(checkIn, "yyyy-MM-dd"),
          checkOut: format(checkOut, "yyyy-MM-dd"),
          guests,
          total,
          message: message.trim() || null,
        }),
      });
      const data = (await res
        .json()
        .catch(() => ({}))) as BookingApiResponse;
      if (!res.ok) {
        toast.error(data.error || "Couldn't send request. Try again.");
        return;
      }
      toast.success("Request sent to host");
      onSent({ threadId: data.threadId ?? null });
      onOpenChange(false);
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-3xl max-h-[90vh] overflow-y-auto sm:!max-w-3xl">
        <DialogHeader>
          <DialogTitle>Review your request</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Trip summary tiles */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryTile
              icon={CalendarDays}
              label="Check-in"
              value={format(checkIn, "EEE, MMM d")}
            />
            <SummaryTile
              icon={CalendarDays}
              label="Checkout"
              value={format(checkOut, "EEE, MMM d")}
            />
            <SummaryTile
              icon={UsersIcon}
              label="Guests"
              value={`${guests} guest${guests === 1 ? "" : "s"}`}
            />
          </div>

          {/* Pricing breakdown */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Receipt className="h-3.5 w-3.5" />
              Estimated total
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  ${pricePerNight} × {nights} night{nights === 1 ? "" : "s"}
                </dt>
                <dd>${(pricePerNight * nights).toLocaleString()}</dd>
              </div>
              {cleaningFee > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Cleaning fee</dt>
                  <dd>${cleaningFee.toLocaleString()}</dd>
                </div>
              )}
              {serviceFee > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Service fee</dt>
                  <dd>${serviceFee.toLocaleString()}</dd>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <dt>Total</dt>
                <dd>${total.toLocaleString()}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Payment arranged directly with {hostFirstName} after they
              confirm — Trustead doesn&rsquo;t process payments.
            </p>
          </div>

          {/* Cancellation policy */}
          {cancellationPolicy && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cancellation &amp; payment policy
              </div>
              <CancellationPolicyCard
                policy={cancellationPolicy}
                scope="listing"
              />
            </div>
          )}

          {/* Optional note */}
          <div>
            <label
              htmlFor="reserve-message"
              className="mb-1.5 block text-sm font-semibold"
            >
              Message to {hostFirstName}{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <Textarea
              id="reserve-message"
              placeholder={`Introduce yourself and your plans for the stay. Anything ${hostFirstName} should know?`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Back
          </Button>
          <Button
            onClick={submit}
            disabled={submitting}
            className="bg-brand hover:bg-brand-600"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Send request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
