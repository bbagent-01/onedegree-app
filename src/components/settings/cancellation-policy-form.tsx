"use client";

import { useState } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CANCELLATION_PRESETS,
  OFF_PLATFORM_PAYMENT_NOTE,
  buildPolicyFromPreset,
  type AmountType,
  type CancellationPolicy,
  type CancellationPreset,
  type DueAt,
  type PaymentScheduleEntry,
} from "@/lib/cancellation";

interface Props {
  initial: CancellationPolicy | null;
}

const DUE_AT_OPTIONS: { value: DueAt; label: string }[] = [
  { value: "booking", label: "At time of booking" },
  { value: "days_before_checkin", label: "Days before check-in" },
  { value: "check_in", label: "At check-in" },
];

function defaultEntry(): PaymentScheduleEntry {
  return {
    due_at: "days_before_checkin",
    days_before_checkin: 3,
    amount_type: "percentage",
    amount: 25,
  };
}

/**
 * Host-level cancellation + payment schedule editor.
 *
 * Picking a preset populates the payment_schedule fields as a
 * template — hosts then edit the rows directly. Any edit pushes
 * the preset label to "Custom" so the Save action records the
 * host's actual intent rather than the starting template.
 */
export function CancellationPolicyForm({ initial }: Props) {
  const seed =
    initial ?? buildPolicyFromPreset("moderate", { securityDeposit: [] });

  const [preset, setPreset] = useState<CancellationPreset>(seed.preset);
  const [schedule, setSchedule] = useState<PaymentScheduleEntry[]>(
    seed.payment_schedule.map((e) => ({ ...e }))
  );
  const [deposit, setDeposit] = useState<PaymentScheduleEntry[]>(
    seed.security_deposit.map((e) => ({ ...e }))
  );
  const [customNote, setCustomNote] = useState<string>(
    seed.custom_note ?? ""
  );
  const [saving, setSaving] = useState(false);

  const applyPreset = (key: Exclude<CancellationPreset, "custom">) => {
    const template = buildPolicyFromPreset(key, {
      securityDeposit: deposit,
      customNote,
    });
    setPreset(key);
    setSchedule(template.payment_schedule);
  };

  const markCustom = () => {
    if (preset !== "custom") setPreset("custom");
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/cancellation-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset,
          payment_schedule: schedule,
          security_deposit: deposit,
          custom_note: customNote.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Save failed (${res.status})`);
      }
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Preset picker — templates */}
      <section>
        <h3 className="text-sm font-semibold">Start from a template</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick one and then edit the schedule below. Anything you change
          saves under the &ldquo;Custom&rdquo; label.
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
                  {p.summary}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Payment schedule editor */}
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
          Each row is a payment step. Guests see this schedule on the
          listing and again when the request is approved.
        </p>
        <ScheduleRows
          rows={schedule}
          onChange={(next) => {
            setSchedule(next);
            markCustom();
          }}
          addLabel="Add payment step"
        />
      </section>

      {/* Security deposit editor */}
      <section>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            Security deposit{" "}
            <span className="text-xs font-normal text-muted-foreground">
              optional
            </span>
          </h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          A refundable hold collected alongside payment. Leave empty to skip.
        </p>
        <ScheduleRows
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
        <label
          htmlFor="policy-note"
          className="text-sm font-semibold"
        >
          Note to guests{" "}
          <span className="text-xs font-normal text-muted-foreground">
            optional
          </span>
        </label>
        <textarea
          id="policy-note"
          value={customNote}
          onChange={(e) => {
            setCustomNote(e.target.value);
            // Note edits don't flip to custom — the schedule is the
            // canonical "custom" signal.
          }}
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
            "Save schedule"
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Row editor ──────────────────────────────────────────────

interface ScheduleRowsProps {
  rows: PaymentScheduleEntry[];
  onChange: (next: PaymentScheduleEntry[]) => void;
  addLabel: string;
  emptyHint?: string;
}

function ScheduleRows({
  rows,
  onChange,
  addLabel,
  emptyHint = "No steps yet.",
}: ScheduleRowsProps) {
  const updateRow = (i: number, next: PaymentScheduleEntry) => {
    onChange(rows.map((r, idx) => (idx === i ? next : r)));
  };
  const removeRow = (i: number) => {
    onChange(rows.filter((_, idx) => idx !== i));
  };
  const addRow = () => {
    onChange([...rows, defaultEntry()]);
  };

  return (
    <div className="mt-3 space-y-3">
      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground">
          {emptyHint}
        </div>
      )}
      {rows.map((row, i) => (
        <Row
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

function Row({
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
      {/* Due at */}
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

      {/* Days before (conditional) */}
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

      {/* Amount type */}
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

      {/* Amount */}
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

      {/* Remove */}
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
