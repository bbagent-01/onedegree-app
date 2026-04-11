"use client";

import { useState } from "react";
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
import { Shield, CalendarDays, Users, AlertCircle } from "lucide-react";

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
        <DialogContent showCloseButton className="sm:max-w-lg">
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
              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block text-xs">
                    <CalendarDays className="size-3 inline mr-1" />
                    Check-in
                  </Label>
                  <Input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">
                    <CalendarDays className="size-3 inline mr-1" />
                    Check-out
                  </Label>
                  <Input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                </div>
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
