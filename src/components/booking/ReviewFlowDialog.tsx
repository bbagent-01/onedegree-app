"use client";

/**
 * Unified review + optional vouch flow. One dialog, two viewers
 * (guest or host), two steps:
 *
 *   1. Review — star ratings + optional text. Payload differs by
 *      role: guest submits host_rating + listing_rating; host
 *      submits guest_rating.
 *   2. Vouch — only shown when the reviewer hasn't yet vouched for
 *      the counterparty. Type (standard / inner_circle) + years-
 *      known bucket inline, no wizard, so the whole post-stay
 *      moment closes inside a single dialog.
 *
 * Triggered from the thread (ReviewPromptCard) or any sidebar
 * "Leave a review" button, so reviewing + vouching no longer
 * requires a navigation to /trips or /hosting.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  VOUCH_TYPES,
  YEARS_KNOWN_BUCKETS,
  type VouchType,
  type YearsKnownBucket,
} from "@/lib/vouch-constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewerRole: "guest" | "host";
  bookingId: string;
  stayConfirmationId: string | null;
  otherUser: { id: string; name: string };
  listingTitle: string;
  /** Has the reviewer already vouched for the counterparty? If
   *  true, the vouch step is skipped and the dialog closes on
   *  review submit. */
  alreadyVouched: boolean;
}

type Step = "review" | "vouch" | "done";

function StarPicker({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div>
      <div className="text-sm font-medium">{label}</div>
      {hint && (
        <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
      )}
      <div className="mt-1.5 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = (hover || value) >= n;
          return (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => onChange(n)}
              className="rounded p-0.5 transition-transform hover:scale-110"
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
            >
              <Star
                className={cn(
                  "h-7 w-7",
                  filled ? "fill-amber-400 text-amber-400" : "text-zinc-300"
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ReviewFlowDialog({
  open,
  onOpenChange,
  viewerRole,
  bookingId,
  stayConfirmationId,
  otherUser,
  listingTitle,
  alreadyVouched,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("review");
  const [submitting, setSubmitting] = useState(false);

  // Guest-only fields
  const [hostRating, setHostRating] = useState(0);
  const [listingRating, setListingRating] = useState(0);
  // Host-only field
  const [guestRating, setGuestRating] = useState(0);
  // Shared text
  const [reviewText, setReviewText] = useState("");

  // Vouch step state
  const [vouchType, setVouchType] = useState<VouchType | null>(null);
  const [yearsKnown, setYearsKnown] =
    useState<YearsKnownBucket | null>("lt1");

  const otherFirst = otherUser.name.split(" ")[0] || "them";

  // Reset on each open so a closed-and-reopened dialog starts fresh.
  useEffect(() => {
    if (open) {
      setStep("review");
      setSubmitting(false);
      setHostRating(0);
      setListingRating(0);
      setGuestRating(0);
      setReviewText("");
      setVouchType(null);
      setYearsKnown("lt1");
    }
  }, [open]);

  const submitReview = async () => {
    if (submitting) return;
    if (viewerRole === "guest" && (!hostRating || !listingRating)) {
      toast.error("Please rate both your host and the place");
      return;
    }
    if (viewerRole === "host" && !guestRating) {
      toast.error("Please rate your guest");
      return;
    }
    setSubmitting(true);
    try {
      // Ensure a stay_confirmation row exists (older accepted rows
      // predate auto-creation).
      let stayId = stayConfirmationId;
      if (!stayId) {
        const createRes = await fetch(`/api/stay-confirmations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactRequestId: bookingId }),
        });
        const createData = (await createRes.json().catch(() => ({}))) as {
          id?: string;
          error?: string;
        };
        if (!createRes.ok || !createData.id) {
          toast.error(createData.error || "Couldn't create review");
          return;
        }
        stayId = createData.id;
      }

      const endpoint =
        viewerRole === "guest"
          ? `/api/stay-confirmations/${stayId}/guest-review`
          : `/api/stay-confirmations/${stayId}/host-review`;
      const payload =
        viewerRole === "guest"
          ? {
              hostRating,
              listingRating,
              hostReviewText: reviewText || null,
              listingReviewText: reviewText || null,
            }
          : {
              guestRating,
              guestReviewText: reviewText || null,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error || "Couldn't save review");
        return;
      }
      toast.success("Review saved");

      if (alreadyVouched) {
        onOpenChange(false);
        router.refresh();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("inbox:thread-refresh"));
        }
      } else {
        setStep("vouch");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const submitVouch = async () => {
    if (submitting) return;
    if (!vouchType || !yearsKnown) {
      toast.error("Pick a vouch type and how long you've known them");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/vouches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: otherUser.id,
          vouchType,
          yearsKnownBucket: yearsKnown,
          isPostStay: true,
          sourceBookingId: bookingId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to vouch");
      toast.success(`Vouched for ${otherFirst}`);
      setStep("done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save vouch");
    } finally {
      setSubmitting(false);
    }
  };

  const finish = () => {
    onOpenChange(false);
    router.refresh();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("inbox:thread-refresh"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {step === "review" && (
          <>
            <DialogHeader>
              <DialogTitle>
                {viewerRole === "guest"
                  ? "Leave a review"
                  : "Review your guest"}
              </DialogTitle>
              <DialogDescription>
                {viewerRole === "guest"
                  ? `How was your stay at ${listingTitle}? Your review helps other guests.`
                  : "Your rating helps the network stay high-trust."}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 space-y-5">
              {viewerRole === "guest" && (
                <>
                  <StarPicker
                    label={`How was ${otherFirst} as a host?`}
                    hint="Communication, check-in, helpfulness."
                    value={hostRating}
                    onChange={setHostRating}
                  />
                  <StarPicker
                    label="How was the place?"
                    hint="Accuracy, cleanliness, location, amenities."
                    value={listingRating}
                    onChange={setListingRating}
                  />
                </>
              )}
              {viewerRole === "host" && (
                <StarPicker
                  label={`How was ${otherFirst} as a guest?`}
                  hint="Cleanliness, communication, respect for house rules."
                  value={guestRating}
                  onChange={setGuestRating}
                />
              )}
              <div>
                <div className="text-sm font-medium">
                  Anything to share? (optional)
                </div>
                <textarea
                  rows={4}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder={
                    viewerRole === "guest"
                      ? "Tell future guests what made this stay great…"
                      : `Tell future hosts what ${otherFirst} was like…`
                  }
                  className="mt-1.5 w-full resize-none rounded-lg border border-border bg-white p-3 text-sm focus:border-foreground focus:outline-none"
                  maxLength={1000}
                />
              </div>
              <Button
                onClick={submitReview}
                disabled={submitting}
                className="h-11 w-full rounded-lg bg-brand text-base font-semibold text-white hover:bg-brand-600"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit review"
                )}
              </Button>
            </div>
          </>
        )}

        {step === "vouch" && (
          <>
            <DialogHeader>
              <DialogTitle>
                Want to vouch for {otherFirst} too?
              </DialogTitle>
              <DialogDescription>
                Vouching adds {otherFirst} to your trust graph so people
                connected to you see them too.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 space-y-5">
              <div>
                <div className="text-sm font-medium">Vouch type</div>
                <div className="mt-1.5 space-y-2">
                  {VOUCH_TYPES.map((t) => (
                    <label
                      key={t.value}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition",
                        vouchType === t.value
                          ? "border-brand bg-brand/5"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <input
                        type="radio"
                        name="vouch-type"
                        checked={vouchType === t.value}
                        onChange={() => setVouchType(t.value)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{t.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">
                  How long have you known {otherFirst}?
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {YEARS_KNOWN_BUCKETS.map((b) => (
                    <button
                      key={b.value}
                      type="button"
                      onClick={() => setYearsKnown(b.value)}
                      className={cn(
                        "rounded-lg border-2 px-3 py-2 text-xs font-semibold transition",
                        yearsKnown === b.value
                          ? "border-brand bg-brand/5 text-brand"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={finish}
                  className="flex-1"
                  disabled={submitting}
                >
                  Skip
                </Button>
                <Button
                  onClick={submitVouch}
                  disabled={submitting || !vouchType || !yearsKnown}
                  className="flex-1 bg-brand text-white hover:bg-brand-600"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Shield className="mr-1.5 h-4 w-4" />
                      Vouch
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle>All done</DialogTitle>
              <DialogDescription>
                Review saved and you&apos;re now vouching for {otherFirst}.
              </DialogDescription>
            </DialogHeader>
            <Button
              onClick={finish}
              className="mt-4 h-11 w-full rounded-lg bg-brand text-white hover:bg-brand-600"
            >
              Done
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
