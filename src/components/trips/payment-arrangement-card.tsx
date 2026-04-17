"use client";

import { useEffect, useState } from "react";
import { Wallet, Check } from "lucide-react";

interface Props {
  bookingId: string;
  hostFirstName: string;
}

/**
 * Informational card shown on the trip detail page after a booking
 * is confirmed. 1DB does NOT process payments — this card exists
 * purely to remind the guest to settle up off-platform. The "I've
 * paid" checkbox is local-only (no server persistence, no
 * verification) so guests can keep their own mental tally.
 */
export function PaymentArrangementCard({ bookingId, hostFirstName }: Props) {
  const storageKey = `trip-paid:${bookingId}`;
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    try {
      setPaid(window.localStorage.getItem(storageKey) === "1");
    } catch {
      // ignore — privacy mode, etc.
    }
  }, [storageKey]);

  const toggle = () => {
    const next = !paid;
    setPaid(next);
    try {
      if (next) window.localStorage.setItem(storageKey, "1");
      else window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-border bg-white p-5 md:p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Wallet className="h-4 w-4" />
        Payment arrangement
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Arrange payment directly with {hostFirstName}. Most members use Venmo
        or Zelle. 1&deg; B&amp;B doesn&rsquo;t process payments.
      </p>
      <button
        type="button"
        onClick={toggle}
        className="mt-4 inline-flex items-center gap-2 text-sm"
        aria-pressed={paid}
      >
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded border ${
            paid
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-border bg-white text-transparent"
          }`}
        >
          <Check className="h-3.5 w-3.5" />
        </span>
        <span className={paid ? "text-foreground" : "text-muted-foreground"}>
          I&rsquo;ve paid
        </span>
      </button>
    </section>
  );
}
