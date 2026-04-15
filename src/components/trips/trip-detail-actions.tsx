"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Star, X, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ReviewModal } from "./review-modal";
import { categorizeTrip, type TripDetail } from "@/lib/trips-data";

interface Props {
  trip: TripDetail;
  canReview: boolean;
}

export function TripDetailActions({ trip, canReview }: Props) {
  const router = useRouter();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const cat = categorizeTrip({ status: trip.status, check_out: trip.check_out });
  const showCancel =
    cat === "upcoming" && (trip.status === "pending" || trip.status === "accepted");
  const showReview =
    canReview && trip.status === "accepted" && !trip.guest_left_review;

  const cancelTrip = async () => {
    if (cancelling) return;
    if (!confirm("Cancel this reservation? Your host will be notified.")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/contact-requests/${trip.id}/cancel`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Couldn't cancel");
        return;
      }
      toast.success("Reservation cancelled");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        {trip.thread_id && (
          <Link
            href={`/inbox/${trip.thread_id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <MessageCircle className="h-4 w-4" />
            Message host
          </Link>
        )}
        <Link
          href={`/listings/${trip.listing_id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <Home className="h-4 w-4" />
          View listing
        </Link>
        {showReview && (
          <Button
            type="button"
            onClick={() => setReviewOpen(true)}
            className="h-auto rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Star className="mr-1.5 h-4 w-4" />
            Leave a review
          </Button>
        )}
        {trip.guest_left_review && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            Reviewed
          </span>
        )}
        {showCancel && (
          <button
            type="button"
            onClick={cancelTrip}
            disabled={cancelling}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            {cancelling ? "Cancelling…" : "Cancel reservation"}
          </button>
        )}
      </div>

      <ReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        bookingId={trip.id}
        stayConfirmationId={trip.stay_confirmation_id}
        listingTitle={trip.listing?.title || "this place"}
        hostName={trip.host?.name || "your host"}
      />
    </>
  );
}
