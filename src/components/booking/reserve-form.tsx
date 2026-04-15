"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
}

export function ReserveForm({
  listingId,
  checkIn,
  checkOut,
  guests,
  total,
}: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          checkIn,
          checkOut,
          guests,
          total,
          message: message.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        threadId?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error || "Couldn't send request. Try again.");
        return;
      }
      toast.success("Reservation request sent");
      if (data.threadId) {
        router.push(`/inbox/${data.threadId}?sent=1`);
      } else {
        router.push("/inbox?sent=1");
      }
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <textarea
        rows={5}
        placeholder="Hi! I'm visiting for a few days and would love to stay at your place…"
        className="w-full resize-none rounded-xl border border-border bg-white p-4 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={2000}
      />
      <Button
        onClick={submit}
        disabled={submitting}
        className="h-12 w-full rounded-lg bg-brand text-base font-semibold text-white hover:bg-brand-600"
      >
        {submitting ? "Sending…" : "Confirm and reserve"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        You won&apos;t be charged. The host reviews and confirms.
      </p>
    </div>
  );
}
