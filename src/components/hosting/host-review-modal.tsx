"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Info } from "lucide-react";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stayConfirmationId: string;
  guestName: string;
}

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
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
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

/**
 * Post-stay review for the HOST rating the GUEST. One rating type —
 * the guest_rating that feeds vouch_power for everyone who vouched for
 * this guest. The accountability note near the submit button is
 * non-negotiable copy: it surfaces the cascade to the person making
 * the call, not buried in a FAQ.
 */
export function HostReviewModal({
  open,
  onOpenChange,
  stayConfirmationId,
  guestName,
}: Props) {
  const router = useRouter();
  const [guestRating, setGuestRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const guestFirst = guestName.split(" ")[0] || "this guest";

  const submit = async () => {
    if (!guestRating) {
      toast.error("Please rate your guest");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/stay-confirmations/${stayConfirmationId}/host-review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestRating,
            guestReviewText: text || null,
          }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Couldn't save review");
        return;
      }
      toast.success("Review saved");
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
          <DialogTitle>Review your guest</DialogTitle>
          <DialogDescription>
            Your rating helps the network stay high-trust.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-5">
          <StarPicker
            label={`How was ${guestFirst} as a guest?`}
            hint="Cleanliness, communication, respect for house rules."
            value={guestRating}
            onChange={setGuestRating}
          />
          <div>
            <div className="text-sm font-medium">
              Anything to share? (optional)
            </div>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Tell future hosts what ${guestFirst} was like…`}
              className="mt-1.5 w-full resize-none rounded-lg border border-border bg-white p-3 text-sm focus:border-foreground focus:outline-none"
              maxLength={1000}
            />
          </div>

          <div className="flex gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Your rating affects vouch power. It factors into the trust
              scores of anyone who vouched for {guestFirst}.
            </span>
          </div>

          <Button
            onClick={submit}
            disabled={submitting}
            className="h-11 w-full rounded-lg bg-brand text-base font-semibold text-white hover:bg-brand-600"
          >
            {submitting ? "Submitting\u2026" : "Submit review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
