"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Shield, Users, AlertCircle } from "lucide-react";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import type { AvailabilityRange, BookedStay } from "@/components/calendar/types";

interface ContactRequestFormProps {
  listingId: string;
  listingTitle: string;
  hostName: string;
  onSuccess?: () => void;
}

export function ContactRequestForm({
  listingId,
  listingTitle,
  hostName,
  onSuccess,
}: ContactRequestFormProps) {
  const [open, setOpen] = useState(false);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Availability data for the mini calendar
  const [ranges, setRanges] = useState<AvailabilityRange[]>([]);
  const [bookedStays, setBookedStays] = useState<BookedStay[]>([]);
  const [defaultStatus, setDefaultStatus] = useState<"available" | "possibly_available" | "blocked" | null>(null);
  const [loadingCal, setLoadingCal] = useState(false);

  const fetchAvailability = useCallback(async () => {
    setLoadingCal(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/availability`);
      if (res.ok) {
        const data = await res.json();
        setRanges(data.ranges || []);
        setBookedStays(data.bookedStays || []);
        setDefaultStatus(data.defaultStatus || null);
      }
    } finally {
      setLoadingCal(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (open) {
      fetchAvailability();
    }
  }, [open, fetchAvailability]);

  function handleCalendarSelect(start: string, end: string) {
    setCheckIn(start);
    setCheckOut(end);
  }

  function formatDisplayDate(dateStr: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  async function handleSubmit() {
    if (!message.trim()) {
      setError("Please write a message to the host.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/contact-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          checkIn: checkIn || null,
          checkOut: checkOut || null,
          guestCount,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "Failed to send request");
      }

      setSuccess(true);
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="lg" className="w-full">
        <Shield className="size-4 mr-2" />
        Request to Book
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request to Stay</DialogTitle>
            <DialogDescription>
              Send a request to {hostName} for {listingTitle}
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-trust-solid/10">
                <Shield className="size-6 text-trust-solid" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Request Sent!
              </p>
              <p className="text-sm text-foreground-secondary mt-1">
                {hostName} will review your request and respond soon.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Calendar for date selection */}
              <div>
                <Label className="mb-2 block text-xs font-medium">
                  Select your dates
                </Label>
                {loadingCal ? (
                  <div className="flex items-center justify-center py-8 text-foreground-secondary text-sm">
                    Loading availability...
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-background-mid/30 p-3">
                    <CalendarGrid
                      ranges={ranges}
                      bookedStays={bookedStays}
                      prepDays={0}
                      mode="edit"
                      onSelectRange={handleCalendarSelect}
                      selectedRange={
                        checkIn && checkOut
                          ? { start: checkIn, end: checkOut }
                          : null
                      }
                      defaultStatus={defaultStatus}
                    />
                  </div>
                )}

                {/* Selected dates display */}
                {(checkIn || checkOut) && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="text-foreground-secondary">Selected:</span>
                    <span className="font-medium text-foreground">
                      {formatDisplayDate(checkIn)}
                      {checkOut && checkOut !== checkIn && (
                        <> — {formatDisplayDate(checkOut)}</>
                      )}
                    </span>
                    <button
                      onClick={() => { setCheckIn(""); setCheckOut(""); }}
                      className="text-xs text-foreground-tertiary hover:text-foreground-secondary underline ml-auto"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Guest count */}
              <div>
                <Label className="mb-1.5 block text-xs">
                  <Users className="size-3 inline mr-1" />
                  Number of guests
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                />
              </div>

              {/* Message */}
              <div>
                <Label className="mb-1.5 block text-xs">
                  Message to host *
                </Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell the host why you'd like to stay and a bit about yourself..."
                  rows={4}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={submitting || !message.trim()}
                className="w-full"
                size="lg"
              >
                {submitting ? "Sending..." : "Send Request"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
