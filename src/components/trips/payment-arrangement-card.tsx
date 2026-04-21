"use client";

import { useEffect, useState } from "react";
import { Wallet, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  displayHandle,
  paymentMethodMeta,
  type PaymentMethod,
} from "@/lib/payment-methods";

interface Props {
  bookingId: string;
  hostFirstName: string;
  /**
   * Host-declared payment methods. Empty when the host hasn't set any;
   * the card still renders so the reminder to pay off-platform is
   * visible.
   */
  methods: PaymentMethod[];
}

/**
 * Informational card shown on the trip detail page after a booking
 * is confirmed. 1DB does NOT process payments — this card exists
 * purely to remind the guest to settle up off-platform. When the
 * host has declared payment methods, the card also exposes handles
 * with a copy-to-clipboard shortcut. The "I've paid" checkbox is
 * local-only (no server persistence, no verification) so guests can
 * keep their own mental tally.
 */
export function PaymentArrangementCard({
  bookingId,
  hostFirstName,
  methods,
}: Props) {
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

  const copyHandle = async (method: PaymentMethod) => {
    try {
      await navigator.clipboard.writeText(displayHandle(method));
      toast.success(`${paymentMethodMeta(method.type).label} handle copied`);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-border bg-white p-5 md:p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Wallet className="h-4 w-4" />
        Payment arrangement
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Arrange payment directly with {hostFirstName}. 1&deg; B&amp;B
        doesn&rsquo;t process payments.
      </p>

      {methods.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {hostFirstName}&rsquo;s payment methods
          </p>
          {methods.map((m, i) => {
            const meta = paymentMethodMeta(m.type);
            return (
              <div
                key={`${m.type}-${i}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {meta.label}
                  </div>
                  <div className="mt-0.5 truncate text-sm font-medium">
                    {displayHandle(m)}
                  </div>
                  {m.note && (
                    <div className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                      {m.note}
                    </div>
                  )}
                </div>
                {m.handle && (
                  <button
                    type="button"
                    onClick={() => copyHandle(m)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Copy ${meta.label} handle`}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

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
