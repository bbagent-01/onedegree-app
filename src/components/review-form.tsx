"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/star-rating";
import { AlertCircle } from "lucide-react";

interface ReviewFormProps {
  stayId: string;
  role: "host" | "guest";
  counterpartName: string;
  listingTitle?: string;
  onSuccess?: () => void;
}

export function ReviewForm({
  stayId,
  role,
  counterpartName,
  listingTitle,
  onSuccess,
}: ReviewFormProps) {
  const [guestRating, setGuestRating] = useState(0);
  const [hostRating, setHostRating] = useState(0);
  const [listingRating, setListingRating] = useState(0);
  const [guestReviewText, setGuestReviewText] = useState("");
  const [hostReviewText, setHostReviewText] = useState("");
  const [listingReviewText, setListingReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (role === "host" && guestRating === 0) {
      setError("Please rate the guest.");
      return;
    }
    if (role === "guest" && (hostRating === 0 || listingRating === 0)) {
      setError("Please rate both the host and the listing.");
      return;
    }

    setSubmitting(true);
    try {
      const body =
        role === "host"
          ? {
              action: "review",
              guestRating,
              guestReviewText: guestReviewText.trim() || null,
            }
          : {
              action: "review",
              hostRating,
              listingRating,
              hostReviewText: hostReviewText.trim() || null,
              listingReviewText: listingReviewText.trim() || null,
            };

      const res = await fetch(`/api/stay-confirmations/${stayId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "Failed to submit review");
      }

      setSuccess(true);
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-6">
        <p className="text-sm font-semibold text-foreground">
          Review submitted!
        </p>
        <p className="text-xs text-foreground-secondary mt-1">
          Thank you for your feedback.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {role === "host" ? (
        <>
          <div>
            <Label className="mb-2 block">
              Rate {counterpartName} as a guest *
            </Label>
            <StarRating value={guestRating} onChange={setGuestRating} size="lg" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">
              Write a review (optional)
            </Label>
            <Textarea
              value={guestReviewText}
              onChange={(e) => setGuestReviewText(e.target.value)}
              placeholder="How was your experience hosting this guest?"
              rows={3}
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <Label className="mb-2 block">Rate {counterpartName} as a host *</Label>
            <StarRating value={hostRating} onChange={setHostRating} size="lg" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">
              Review the host (optional)
            </Label>
            <Textarea
              value={hostReviewText}
              onChange={(e) => setHostReviewText(e.target.value)}
              placeholder="How was your experience with this host?"
              rows={2}
            />
          </div>
          <div>
            <Label className="mb-2 block">
              Rate the place itself *
              {listingTitle && (
                <span className="text-foreground-secondary font-normal">
                  {" "}
                  — {listingTitle}
                </span>
              )}
            </Label>
            <StarRating
              value={listingRating}
              onChange={setListingRating}
              size="lg"
            />
            <p className="text-[10px] text-foreground-tertiary mt-1">
              Cleanliness, accuracy, amenities
            </p>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">
              Review the listing (optional)
            </Label>
            <Textarea
              value={listingReviewText}
              onChange={(e) => setListingReviewText(e.target.value)}
              placeholder="How was the place itself?"
              rows={2}
            />
          </div>
        </>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full"
        size="lg"
      >
        {submitting ? "Submitting..." : "Submit Review"}
      </Button>
    </div>
  );
}
