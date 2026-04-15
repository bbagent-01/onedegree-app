"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  stayConfirmationId: string | null;
  listingTitle: string;
  hostName: string;
}

function StarPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div>
      <div className="text-sm font-medium">{label}</div>
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
                  filled
                    ? "fill-amber-400 text-amber-400"
                    : "text-zinc-300"
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ReviewModal({
  open,
  onOpenChange,
  bookingId,
  stayConfirmationId,
  listingTitle,
  hostName,
}: Props) {
  const router = useRouter();
  const [hostRating, setHostRating] = useState(0);
  const [listingRating, setListingRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!hostRating || !listingRating) {
      toast.error("Please rate both your host and the place");
      return;
    }
    setSubmitting(true);
    try {
      // Ensure a stay_confirmation row exists (auto-created on accept,
      // but old accepted bookings predate that logic).
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

      const res = await fetch(`/api/stay-confirmations/${stayId}/guest-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostRating,
          listingRating,
          hostReviewText: text || null,
          listingReviewText: text || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Couldn't save review");
        return;
      }
      toast.success("Thanks for the review!");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Leave a review</DialogTitle>
          <DialogDescription>
            How was your stay at {listingTitle}? Your review helps other guests.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-5">
          <StarPicker
            label={`How was ${hostName} as a host?`}
            value={hostRating}
            onChange={setHostRating}
          />
          <StarPicker
            label="How was the place itself?"
            value={listingRating}
            onChange={setListingRating}
          />
          <div>
            <div className="text-sm font-medium">Anything to share? (optional)</div>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tell future guests what made this stay great…"
              className="mt-1.5 w-full resize-none rounded-lg border border-border bg-white p-3 text-sm focus:border-foreground focus:outline-none"
              maxLength={1000}
            />
          </div>
          <Button
            onClick={submit}
            disabled={submitting}
            className="h-11 w-full rounded-lg bg-brand text-base font-semibold text-white hover:bg-brand-600"
          >
            {submitting ? "Submitting…" : "Submit review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
