"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  PAYMENT_METHOD_META,
  paymentMethodMeta,
  type PaymentMethod,
  type PaymentMethodType,
} from "@/lib/payment-methods";

interface Props {
  initial: PaymentMethod[];
}

/**
 * Host-level payment methods editor. Each row captures:
 *   - type  (venmo / zelle / paypal / wise / offline_other)
 *   - handle (receive-only — Venmo username, Zelle email/phone, etc.)
 *   - note   (optional; required for offline_other)
 *   - enabled toggle
 *
 * Posts the whole array to PUT /api/users/payment-methods on save.
 * We deliberately don't store bank routing numbers — the spec is
 * "receive-only identifiers, no bank details".
 */
export function PaymentMethodsForm({ initial }: Props) {
  const [methods, setMethods] = useState<PaymentMethod[]>(initial);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const usedTypes = new Set(methods.map((m) => m.type));
  // offline_other can appear more than once (different situations);
  // the branded rails are one-per-host since the handle is unique.
  const availableToAdd = PAYMENT_METHOD_META.filter(
    (m) => m.key === "offline_other" || !usedTypes.has(m.key)
  );

  const addMethod = (type: PaymentMethodType) => {
    setMethods((prev) => [
      ...prev,
      { type, handle: "", note: null, enabled: true },
    ]);
    setAddOpen(false);
  };

  const updateAt = (idx: number, patch: Partial<PaymentMethod>) => {
    setMethods((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, ...patch } : m))
    );
  };

  const removeAt = (idx: number) => {
    setMethods((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    setSaving(true);
    try {
      // Strip rows that have no handle AND no note. The API
      // normalizes the same way, but pruning here keeps the
      // toast message honest.
      const payload = methods.filter(
        (m) =>
          m.handle.trim().length > 0 ||
          (m.type === "offline_other" && (m.note ?? "").trim().length > 0)
      );
      const res = await fetch("/api/users/payment-methods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methods: payload }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Save failed (${res.status})`);
      }
      const data = (await res.json()) as { methods: PaymentMethod[] };
      setMethods(data.methods);
      toast.success("Payment methods saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {methods.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
          <p className="text-sm font-medium text-foreground">
            No payment methods yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add at least one so guests know where to send money once you
            approve a stay. You stay in control — payment happens off-platform.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map((m, idx) => {
            const meta = paymentMethodMeta(m.type);
            return (
              <div
                key={idx}
                className={cn(
                  "rounded-xl border border-border bg-white p-4",
                  !m.enabled && "opacity-60"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{meta.label}</span>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={m.enabled}
                        onChange={(e) =>
                          updateAt(idx, { enabled: e.target.checked })
                        }
                        className="h-3.5 w-3.5 rounded border-border"
                      />
                      {m.enabled ? "Enabled" : "Paused"}
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Remove method"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {m.type === "offline_other" ? "Label" : "Handle"}
                    </label>
                    <input
                      type="text"
                      value={m.handle}
                      onChange={(e) =>
                        updateAt(idx, { handle: e.target.value })
                      }
                      placeholder={meta.handlePlaceholder}
                      className="h-11 w-full rounded-lg border-2 border-border !bg-white px-3 text-sm font-medium shadow-sm focus:border-foreground focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {meta.helper}
                    </p>
                  </div>
                  {m.type === "offline_other" && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Instructions
                      </label>
                      <textarea
                        value={m.note ?? ""}
                        onChange={(e) =>
                          updateAt(idx, { note: e.target.value || null })
                        }
                        rows={2}
                        placeholder="e.g. Leave cash in the lockbox on arrival, or ACH to the account I'll share in a message."
                        className="min-h-[72px] w-full rounded-lg border-2 border-border !bg-white px-3 py-2 text-sm font-medium shadow-sm focus:border-foreground focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add-method picker */}
      {availableToAdd.length > 0 && (
        <div className="relative">
          {!addOpen ? (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              Add payment method
            </button>
          ) : (
            <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Pick a method to add
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {availableToAdd.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => addMethod(opt.key)}
                    className="rounded-lg border border-border p-3 text-left transition hover:border-foreground"
                  >
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {opt.helper}
                    </div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
        <p className="text-[11px] text-muted-foreground">
          Payment methods are shown to approved guests only — never on the
          public listing page.
        </p>
        <Button
          onClick={save}
          disabled={saving}
          className="h-10 rounded-lg bg-brand text-sm font-semibold text-white hover:bg-brand-600"
        >
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Save payment methods"
          )}
        </Button>
      </div>
    </div>
  );
}
