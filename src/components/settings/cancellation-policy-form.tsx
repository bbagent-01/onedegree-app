"use client";

import { useState } from "react";
import {
  Check,
  Loader2,
  Plus,
  Trash2,
  CalendarClock,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CANCELLATION_PRESETS,
  OFF_PLATFORM_PAYMENT_NOTE,
  PLATFORM_NEUTRALITY_NOTE,
  buildPolicyFromPreset,
  type AmountType,
  type CancellationApproach,
  type CancellationPolicy,
  type CancellationPreset,
  type DueAt,
  type PaymentScheduleEntry,
  type RefundWindow,
} from "@/lib/cancellation";

interface Props {
  initial: CancellationPolicy | null;
  /**
   * API endpoint to PUT the policy payload. Defaults to the
   * host-default route so existing call sites don't need to change.
   * Listing-override callers pass a listing-scoped URL.
   */
  endpoint?: string;
  /**
   * Hide the amber platform-neutrality banner. The /settings/hosting
   * page is where the banner lives canonically; when the same editor
   * appears on a listing edit page (underneath the host-defaults one),
   * re-rendering the banner is noise.
   */
  suppressPlatformBanner?: boolean;
  /** Optional callback once a save succeeds. */
  onSaved?: (policy: CancellationPolicy) => void;
}

const DUE_AT_OPTIONS: { value: DueAt; label: string }[] = [
  { value: "booking", label: "At time of booking" },
  { value: "days_before_checkin", label: "Days before check-in" },
  { value: "check_in", label: "At check-in" },
];

function defaultPaymentEntry(): PaymentScheduleEntry {
  return {
    due_at: "days_before_checkin",
    days_before_checkin: 3,
    amount_type: "percentage",
    amount: 25,
  };
}

function defaultRefundWindow(): RefundWindow {
  return { cutoff_days_before_checkin: 3, refund_pct: 50 };
}

/**
 * Host-level cancellation + payment editor with the two-approach
 * toggle at the top. Changing the approach re-applies the preset
 * template for that approach so the rows stay coherent. Any row-
 * level edit flips `preset` to "custom" so save-time intent is
 * preserved.
 */
export function CancellationPolicyForm({
  initial,
  endpoint = "/api/users/cancellation-policy",
  suppressPlatformBanner = false,
  onSaved,
}: Props) {
  const seed =
    initial ?? buildPolicyFromPreset("installments", "moderate");

  const [approach, setApproach] = useState<CancellationApproach>(seed.approach);
  const [preset, setPreset] = useState<CancellationPreset>(seed.preset);
  const [payment, setPayment] = useState<PaymentScheduleEntry[]>(
    seed.payment_schedule.map((e) => ({ ...e }))
  );
  const [refunds, setRefunds] = useState<RefundWindow[]>(
    seed.refund_schedule.map((e) => ({ ...e }))
  );
  const [deposit, setDeposit] = useState<PaymentScheduleEntry[]>(
    seed.security_deposit.map((e) => ({ ...e }))
  );
  const [customNote, setCustomNote] = useState<string>(
    seed.custom_note ?? ""
  );
  const [saving, setSaving] = useState(false);

  const switchApproach = (next: CancellationApproach) => {
    if (next === approach) return;
    // Apply the same preset under the new approach so the rows
    // update coherently. Host can edit from there.
    const effectivePreset =
      preset === "custom" ? "moderate" : (preset as Exclude<CancellationPreset, "custom">);
    const tpl = buildPolicyFromPreset(next, effectivePreset, {
      securityDeposit: deposit,
      customNote,
    });
    setApproach(next);
    setPreset(effectivePreset);
    setPayment(tpl.payment_schedule);
    setRefunds(tpl.refund_schedule);
  };

  const applyPreset = (key: Exclude<CancellationPreset, "custom">) => {
    const tpl = buildPolicyFromPreset(approach, key, {
      securityDeposit: deposit,
      customNote,
    });
    setPreset(key);
    setPayment(tpl.payment_schedule);
    setRefunds(tpl.refund_schedule);
  };

  const markCustom = () => {
    if (preset !== "custom") setPreset("custom");
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approach,
          preset,
          payment_schedule: payment,
          refund_schedule: refunds,
          security_deposit: deposit,
          custom_note: customNote.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Save failed (${res.status})`);
      }
      toast.success("Saved");
      onSaved?.({
        approach,
        preset,
        payment_schedule: payment,
        refund_schedule: refunds,
        security_deposit: deposit,
        custom_note: customNote.trim() || null,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Platform-neutrality banner — most prominent element on the page.
          Suppressed when this editor renders nested inside a listing
          edit form where the banner would duplicate one already on screen. */}
      {!suppressPlatformBanner && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            1° B&amp;B doesn&apos;t process payments or manage refunds.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
            This is guidance hosts and guests share to set expectations.
            Every payment and refund happens directly between you — no
            money ever touches the platform.
          </p>
        </div>
      )}

      {/* Approach toggle — large, obvious choice */}
      <section>
        <h3 className="text-sm font-semibold">Choose your approach</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Two common ways hosts handle payment + cancellation. Pick
          the one that matches how you actually collect money.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <ApproachCard
            active={approach === "installments"}
            onClick={() => switchApproach("installments")}
            icon={CalendarClock}
            title="Collect in installments"
            description="Collect payment on a schedule. Each installment is nonrefundable once collected. No refund schedule to manage."
          />
          <ApproachCard
            active={approach === "refunds"}
            onClick={() => switchApproach("refunds")}
            icon={RotateCcw}
            title="Collect up front, refund on cancellation"
            description="Collect the full amount at booking, then refund on a schedule if the guest cancels. Matches Airbnb's model."
          />
        </div>
      </section>

      {/* Preset picker */}
      <section>
        <h3 className="text-sm font-semibold">Start from a template</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Picks a preset for your approach. Edit the rows below to
          customize — any change saves under the &ldquo;Custom&rdquo; label.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {CANCELLATION_PRESETS.map((p) => {
            const isActive = preset === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition",
                  isActive
                    ? "border-brand bg-brand/5"
                    : "border-border bg-white hover:border-foreground/30"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{p.label}</div>
                  {isActive && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {p.summary[approach]}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Payment schedule editor (always shown) */}
      <section>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Payment schedule</h3>
          {preset === "custom" && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
              Custom
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {approach === "installments"
            ? "Each row is an installment. Collect when each step is reached."
            : "Under the refunds approach, the entire balance is typically collected at time of booking."}
        </p>
        <PaymentRows
          rows={payment}
          onChange={(next) => {
            setPayment(next);
            markCustom();
          }}
          addLabel="Add payment step"
        />
      </section>

      {/* Refund schedule editor (only when approach = refunds) */}
      {approach === "refunds" && (
        <section>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Refund schedule</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            If the guest cancels, how much of the money you already
            collected gets refunded. Read top-down: first row is the
            most generous window, last row is the latest cutoff.
          </p>
          <RefundRows
            rows={refunds}
            onChange={(next) => {
              setRefunds(next);
              markCustom();
            }}
          />
        </section>
      )}

      {/* Security deposit editor */}
      <section>
        <h3 className="text-sm font-semibold">
          Security deposit{" "}
          <span className="text-xs font-normal text-muted-foreground">
            optional
          </span>
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          A refundable hold collected alongside payment. Leave empty to skip.
        </p>
        <PaymentRows
          rows={deposit}
          onChange={(next) => {
            setDeposit(next);
            markCustom();
          }}
          addLabel="Add deposit step"
          emptyHint="No deposit."
        />
      </section>

      {/* Custom note */}
      <section>
        <label htmlFor="policy-note" className="text-sm font-semibold">
          Note to guests{" "}
          <span className="text-xs font-normal text-muted-foreground">
            optional
          </span>
        </label>
        <textarea
          id="policy-note"
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
          placeholder="e.g. Venmo preferred. Deposit returned within 48h of checkout."
          rows={3}
          className="mt-2 w-full rounded-xl border-2 border-border !bg-white px-4 py-3 text-sm font-medium shadow-sm focus-visible:border-brand focus-visible:outline-none"
        />
      </section>

      {/* Save row + disclaimer */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground">
          {OFF_PLATFORM_PAYMENT_NOTE}
        </p>
        <Button onClick={save} disabled={saving} className="shrink-0">
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save policy"
          )}
        </Button>
      </div>

      {/* Footer note, mirrors the top banner so it lives near the Save */}
      <p className="text-[11px] text-muted-foreground">
        {PLATFORM_NEUTRALITY_NOTE}
      </p>
    </div>
  );
}

// ── Approach card ──

function ApproachCard({
  active,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-xl border-2 p-4 text-left transition",
        active
          ? "border-brand bg-brand/5"
          : "border-border bg-white hover:border-foreground/30"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          active ? "bg-brand text-white" : "bg-muted text-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">{title}</div>
          {active && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
              <Check className="h-3 w-3" />
            </div>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </button>
  );
}

// ── Payment row editor ──

interface PaymentRowsProps {
  rows: PaymentScheduleEntry[];
  onChange: (next: PaymentScheduleEntry[]) => void;
  addLabel: string;
  emptyHint?: string;
}

function PaymentRows({
  rows,
  onChange,
  addLabel,
  emptyHint = "No steps yet.",
}: PaymentRowsProps) {
  const updateRow = (i: number, next: PaymentScheduleEntry) => {
    onChange(rows.map((r, idx) => (idx === i ? next : r)));
  };
  const removeRow = (i: number) => {
    onChange(rows.filter((_, idx) => idx !== i));
  };
  const addRow = () => {
    onChange([...rows, defaultPaymentEntry()]);
  };

  return (
    <div className="mt-3 space-y-3">
      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground">
          {emptyHint}
        </div>
      )}
      {rows.map((row, i) => (
        <PaymentRow
          key={i}
          row={row}
          onChange={(next) => updateRow(i, next)}
          onRemove={() => removeRow(i)}
        />
      ))}
      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </button>
    </div>
  );
}

function PaymentRow({
  row,
  onChange,
  onRemove,
}: {
  row: PaymentScheduleEntry;
  onChange: (next: PaymentScheduleEntry) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-12 items-center gap-2 rounded-xl border border-border bg-white p-3">
      <div className="col-span-12 md:col-span-5">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Due
        </label>
        <select
          value={row.due_at}
          onChange={(e) => {
            const due_at = e.target.value as DueAt;
            onChange({
              ...row,
              due_at,
              days_before_checkin:
                due_at === "days_before_checkin"
                  ? (row.days_before_checkin ?? 3)
                  : undefined,
            });
          }}
          className="mt-1 h-10 w-full rounded-lg border border-border bg-white px-2 text-sm focus:border-foreground focus:outline-none"
        >
          {DUE_AT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {row.due_at === "days_before_checkin" && (
        <div className="col-span-6 md:col-span-2">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Days
          </label>
          <input
            type="number"
            min={0}
            value={row.days_before_checkin ?? 0}
            onChange={(e) =>
              onChange({
                ...row,
                days_before_checkin: Math.max(0, Number(e.target.value) || 0),
              })
            }
            className="mt-1 h-10 w-full rounded-lg border border-border bg-white px-2 text-sm focus:border-foreground focus:outline-none"
          />
        </div>
      )}

      <div
        className={cn(
          "col-span-6",
          row.due_at === "days_before_checkin" ? "md:col-span-2" : "md:col-span-3"
        )}
      >
        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Type
        </label>
        <select
          value={row.amount_type}
          onChange={(e) =>
            onChange({ ...row, amount_type: e.target.value as AmountType })
          }
          className="mt-1 h-10 w-full rounded-lg border border-border bg-white px-2 text-sm focus:border-foreground focus:outline-none"
        >
          <option value="percentage">%</option>
          <option value="fixed">$</option>
        </select>
      </div>

      <div className="col-span-9 md:col-span-2">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Amount
        </label>
        <input
          type="number"
          min={0}
          max={row.amount_type === "percentage" ? 100 : undefined}
          value={row.amount}
          onChange={(e) =>
            onChange({
              ...row,
              amount: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className="mt-1 h-10 w-full rounded-lg border border-border bg-white px-2 text-sm focus:border-foreground focus:outline-none"
        />
      </div>

      <div className="col-span-3 flex items-end justify-end md:col-span-1">
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Remove row"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Refund row editor ──

function RefundRows({
  rows,
  onChange,
}: {
  rows: RefundWindow[];
  onChange: (next: RefundWindow[]) => void;
}) {
  const updateRow = (i: number, next: RefundWindow) => {
    onChange(rows.map((r, idx) => (idx === i ? next : r)));
  };
  const removeRow = (i: number) => {
    onChange(rows.filter((_, idx) => idx !== i));
  };
  const addRow = () => {
    onChange([...rows, defaultRefundWindow()]);
  };

  return (
    <div className="mt-3 space-y-3">
      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground">
          No windows yet.
        </div>
      )}
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid grid-cols-12 items-center gap-2 rounded-xl border border-border bg-white p-3"
        >
          <div className="col-span-7 md:col-span-6">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Cancel up to (days before check-in)
            </label>
            <input
              type="number"
              min={0}
              value={row.cutoff_days_before_checkin}
              onChange={(e) =>
                updateRow(i, {
                  ...row,
                  cutoff_days_before_checkin: Math.max(
                    0,
                    Number(e.target.value) || 0
                  ),
                })
              }
              className="mt-1 h-10 w-full rounded-lg border border-border bg-white px-2 text-sm focus:border-foreground focus:outline-none"
            />
          </div>
          <div className="col-span-4 md:col-span-5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Refund %
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={row.refund_pct}
              onChange={(e) =>
                updateRow(i, {
                  ...row,
                  refund_pct: Math.max(
                    0,
                    Math.min(100, Number(e.target.value) || 0)
                  ),
                })
              }
              className="mt-1 h-10 w-full rounded-lg border border-border bg-white px-2 text-sm focus:border-foreground focus:outline-none"
            />
          </div>
          <div className="col-span-1 flex items-end justify-end">
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Remove row"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        Add refund window
      </button>
    </div>
  );
}
