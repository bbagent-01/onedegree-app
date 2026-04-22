"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AvailabilityCalendar } from "@/components/listing/availability-calendar";
import { CalendarDays, ChevronDown, ChevronUp, Loader2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  /** First name of the person receiving the intro request. Copy is
   *  role-neutral — works whether the recipient is a host or a guest. */
  recipientFirstName: string;
}

/**
 * Direct intro request modal (S2a redesign).
 *
 * The sender writes a short message (20+ chars), optionally proposes a
 * non-binding date range, and submits. The recipient sees the full
 * profile + message in their Intros inbox and decides whether to
 * accept / reply / decline / ignore.
 *
 * Copy is role-neutral — the same modal is used regardless of
 * whether a guest is requesting intro on a host's listing, or a host
 * is requesting intro on a guest's profile. The word "host" /
 * "guest" is intentionally not used.
 */
export function RequestIntroDialog({
  open,
  onOpenChange,
  listingId,
  recipientFirstName,
}: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [range, setRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const trimmed = message.trim();
  const charCount = trimmed.length;
  const tooShort = charCount < 20;

  const startIso = range?.from
    ? format(range.from, "yyyy-MM-dd")
    : undefined;
  const endIso = range?.to ? format(range.to, "yyyy-MM-dd") : undefined;

  const dateLabel = (() => {
    if (!range?.from) return "Add dates (optional)";
    if (range.to) {
      return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`;
    }
    return `${format(range.from, "MMM d")} – pick end date`;
  })();

  const submit = async () => {
    if (submitting || tooShort) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/trust/request-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          message: trimmed,
          startDate: startIso,
          endDate: endIso,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        threadId?: string;
        alreadyPending?: boolean;
        error?: string;
      };
      if (!res.ok || !data.threadId) {
        toast.error(data.error || "Couldn't send request");
        return;
      }
      toast.success(
        data.alreadyPending
          ? "You already have a pending intro — opening it"
          : `Intro sent to ${recipientFirstName}`
      );
      onOpenChange(false);
      router.push(`/inbox/${data.threadId}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            Introduce yourself to {recipientFirstName}
          </DialogTitle>
          <DialogDescription>
            They&apos;ll see your profile, how you&apos;re connected, and
            your message. Only they can decide whether to engage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Say hi, share a bit about yourself, and why you're reaching out to ${recipientFirstName}.`}
              rows={5}
              className="h-14 min-h-[120px] w-full resize-none rounded-xl border-2 border-border !bg-white px-4 py-3 text-sm font-medium shadow-sm focus:border-foreground/60 focus:outline-none"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span
                className={
                  tooShort ? "text-muted-foreground" : "text-emerald-600"
                }
              >
                {tooShort
                  ? `At least 20 characters (${charCount}/20)`
                  : `${charCount} characters`}
              </span>
            </div>
          </div>

          {/* Optional non-binding date range. Uses the same range
              calendar as the booking sidebar so the picker feels
              consistent with the rest of the app. Not a booking —
              just context for the recipient. */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dates you&apos;re exploring (optional)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCalendarOpen((v) => !v)}
                className="flex h-14 flex-1 items-center gap-2 rounded-xl border-2 border-border !bg-white px-4 text-left text-sm font-medium shadow-sm hover:bg-muted/30 focus:border-foreground/60 focus:outline-none"
                aria-expanded={calendarOpen}
              >
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span
                  className={range?.from ? "" : "text-muted-foreground"}
                >
                  {dateLabel}
                </span>
                <span className="ml-auto text-muted-foreground">
                  {calendarOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              </button>
              {range?.from && (
                <button
                  type="button"
                  aria-label="Clear dates"
                  onClick={() => setRange(undefined)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* Inline expandable calendar — dodges the Popover/Dialog
                stacking-context collision where the popover portaled
                behind the z-70 dialog overlay.
                Auto-close fires only after a TRUE range is picked
                (from < to). React-day-picker in range mode sets
                to = from on the first click, which used to trip the
                naive `r.from && r.to` check and slam the calendar
                shut before the user could pick an end date. */}
            {calendarOpen && (
              <div className="mt-2 overflow-hidden rounded-xl border-2 border-border bg-white p-2 shadow-sm">
                <AvailabilityCalendar
                  value={range}
                  onChange={(r) => {
                    setRange(r);
                    if (
                      r?.from &&
                      r?.to &&
                      r.from.getTime() !== r.to.getTime()
                    ) {
                      setCalendarOpen(false);
                    }
                  }}
                  blockedRanges={[]}
                  numberOfMonths={1}
                />
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setRange(undefined)}
                    className="font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarOpen(false)}
                    className="font-semibold text-brand hover:underline"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Not a booking — just context for {recipientFirstName}.
            </p>
          </div>

          <Button
            type="button"
            onClick={submit}
            disabled={submitting || tooShort}
            className="h-11 w-full rounded-lg bg-brand font-semibold hover:bg-brand-600"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {submitting ? "Sending…" : "Send intro request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
