"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Star, X, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewFlowDialog } from "@/components/booking/ReviewFlowDialog";
import { CancelTripDialog } from "./cancel-trip-dialog";
import { categorizeTrip, type TripDetail } from "@/lib/trips-data";

interface Props {
  trip: TripDetail;
  canReview: boolean;
}

export function TripDetailActions({ trip, canReview }: Props) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const cat = categorizeTrip({ status: trip.status, check_out: trip.check_out });
  const showCancel =
    cat === "upcoming" && (trip.status === "pending" || trip.status === "accepted");
  // Review button only surfaces for guest viewers. Hosts have their
  // own review path via the thread's review_prompt card (and
  // ReviewFlowDialog expects viewerRole="guest" here); gating by
  // role keeps the button semantically correct.
  const showReview =
    trip.viewer_role === "guest" &&
    canReview &&
    trip.status === "accepted" &&
    !trip.guest_left_review;
  const counterpartyFirstName =
    trip.counterparty?.name?.split(" ")[0] ?? "them";

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        {trip.thread_id && (
          <Link
            href={`/inbox/${trip.thread_id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <MessageCircle className="h-4 w-4" />
            Message {counterpartyFirstName}
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
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--tt-mint-mid)]/10 px-4 py-2 text-sm font-semibold text-[var(--tt-mint)]">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            Reviewed
          </span>
        )}
        {showCancel && (
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-400/10"
          >
            <X className="h-4 w-4" />
            Cancel reservation
          </button>
        )}
      </div>

      {trip.host && (
        <ReviewFlowDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          viewerRole="guest"
          bookingId={trip.id}
          stayConfirmationId={trip.stay_confirmation_id}
          otherUser={{ id: trip.host.id, name: trip.host.name ?? "your host" }}
          listingTitle={trip.listing?.title || "this place"}
          alreadyVouched={trip.trust_is_direct}
        />
      )}

      <CancelTripDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        bookingId={trip.id}
        policy={trip.cancellation_policy}
        checkIn={trip.check_in}
      />
    </>
  );
}
