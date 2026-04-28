"use client";

import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AmountType,
  DueAt,
  PaymentScheduleEntry,
  RefundWindow,
} from "@/lib/cancellation";

/**
 * Shared row editors for cancellation + payment schedules. Extracted
 * from /settings/hosting so the inline "Review & send terms" card
 * can offer the same add/remove-row + amount-per-row editing without
 * duplicating the UI. Both callers handle marking the preset as
 * "custom" whenever a row-level edit lands.
 */

const DUE_AT_OPTIONS: { value: DueAt; label: string }[] = [
  { value: "booking", label: "At time of booking" },
  { value: "days_before_checkin", label: "Days before check-in" },
  { value: "check_in", label: "At check-in" },
];

export function defaultPaymentEntry(): PaymentScheduleEntry {
  return {
    due_at: "days_before_checkin",
    days_before_checkin: 3,
    amount_type: "percentage",
    amount: 25,
  };
}

export function defaultRefundWindow(): RefundWindow {
  return { cutoff_days_before_checkin: 3, refund_pct: 50 };
}

interface PaymentRowsProps {
  rows: PaymentScheduleEntry[];
  onChange: (next: PaymentScheduleEntry[]) => void;
  addLabel: string;
  emptyHint?: string;
}

export function PaymentRows({
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
          row.due_at === "days_before_checkin"
            ? "md:col-span-2"
            : "md:col-span-3"
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

export function RefundRows({
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
