"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  hostFirstName?: string;
  listingTitle?: string;
  /** Strongest mutual connector's display name — appended as a short
   *  trust-context sentence to the pre-filled message. */
  strongestConnector?: string | null;
}

function formatShortDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function ReserveForm({
  listingId,
  checkIn,
  checkOut,
  guests,
  total,
  hostFirstName,
  listingTitle,
  strongestConnector,
}: Props) {
  const router = useRouter();

  const prefill = useMemo(() => {
    const host = hostFirstName || "there";
    const title = listingTitle || "your place";
    const dates =
      checkIn && checkOut
        ? ` for ${formatShortDate(checkIn)}\u2013${formatShortDate(checkOut)}`
        : "";
    const trustLine = strongestConnector
      ? ` We're connected through ${strongestConnector}.`
      : "";
    return `Hi ${host}, I'm interested in staying at ${title}${dates}.${trustLine}`;
  }, [hostFirstName, listingTitle, checkIn, checkOut, strongestConnector]);

  const [message, setMessage] = useState(prefill);
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
        toast.error(data.error || "Couldn't send message. Try again.");
        return;
      }
      toast.success("Message sent to host");
      if (data.threadId) {
        const isDesktop =
          typeof window !== "undefined" &&
          window.matchMedia("(min-width: 768px)").matches;
        router.push(
          isDesktop
            ? `/inbox?thread=${data.threadId}&sent=1`
            : `/inbox/${data.threadId}?sent=1`
        );
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
        placeholder="Write a short note to the host…"
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
        {submitting ? "Sending\u2026" : "Send message"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Payment arranged directly with your host &mdash; 1&deg; B&amp;B
        doesn&apos;t process payments.
      </p>
    </div>
  );
}
