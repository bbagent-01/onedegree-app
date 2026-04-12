"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarSettings as CalendarSettingsType } from "./types";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const ADVANCE_NOTICE_OPTIONS = [
  { value: 0, label: "Same day" },
  { value: 1, label: "1 day" },
  { value: 2, label: "2 days" },
  { value: 3, label: "3 days" },
  { value: 7, label: "7 days" },
];

const WINDOW_OPTIONS = [
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 9, label: "9 months" },
  { value: 12, label: "12 months" },
  { value: 24, label: "24 months" },
];

const PREP_OPTIONS = [
  { value: 0, label: "None" },
  { value: 1, label: "1 night" },
  { value: 2, label: "2 nights" },
];

interface CalendarSettingsProps {
  listingId: string;
  settings: CalendarSettingsType;
  onSettingsChange: (settings: CalendarSettingsType) => void;
}

export function CalendarSettingsPanel({
  listingId,
  settings,
  onSettingsChange,
}: CalendarSettingsProps) {
  const [local, setLocal] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setLocal(settings);
    setDirty(false);
  }, [settings]);

  function update(partial: Partial<CalendarSettingsType>) {
    setLocal((prev) => ({ ...prev, ...partial }));
    setDirty(true);
    setSaved(false);
  }

  function toggleDay(
    field: "blocked_checkin_days" | "blocked_checkout_days",
    day: string
  ) {
    const current = local[field];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    update({ [field]: next });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/calendar-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(local),
      });
      if (res.ok) {
        onSettingsChange(local);
        setDirty(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Settings className="size-4 text-foreground-secondary" />
        <h3 className="text-sm font-semibold text-foreground">Stay Rules</h3>
      </div>

      {/* Min/Max Nights */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 block text-xs">Minimum Nights</Label>
          <Input
            type="number"
            min={1}
            value={local.min_nights}
            onChange={(e) =>
              update({ min_nights: parseInt(e.target.value) || 1 })
            }
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Maximum Nights</Label>
          <Input
            type="number"
            min={1}
            value={local.max_nights}
            onChange={(e) =>
              update({ max_nights: parseInt(e.target.value) || 365 })
            }
          />
        </div>
      </div>

      {/* Prep Days */}
      <div>
        <Label className="mb-1 block text-xs">Preparation Time</Label>
        <div className="flex gap-2">
          {PREP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ prep_days: opt.value })}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                local.prep_days === opt.value
                  ? "border-primary bg-primary-light text-primary"
                  : "border-border bg-white text-foreground-secondary hover:border-foreground-tertiary"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advance Notice */}
      <div>
        <Label className="mb-1 block text-xs">Advance Notice</Label>
        <select
          value={local.advance_notice_days}
          onChange={(e) =>
            update({ advance_notice_days: parseInt(e.target.value) })
          }
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
        >
          {ADVANCE_NOTICE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Availability Window */}
      <div>
        <Label className="mb-1 block text-xs">Availability Window</Label>
        <select
          value={local.availability_window_months}
          onChange={(e) =>
            update({ availability_window_months: parseInt(e.target.value) })
          }
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
        >
          {WINDOW_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Check-in / Check-out Times */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 block text-xs">Check-in Time</Label>
          <Input
            type="time"
            value={local.checkin_time}
            onChange={(e) => update({ checkin_time: e.target.value })}
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Check-out Time</Label>
          <Input
            type="time"
            value={local.checkout_time}
            onChange={(e) => update({ checkout_time: e.target.value })}
          />
        </div>
      </div>

      {/* Blocked Check-in Days */}
      <div>
        <Label className="mb-1 block text-xs">No Check-in On</Label>
        <div className="flex flex-wrap gap-1.5">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={`ci-${day}`}
              type="button"
              onClick={() => toggleDay("blocked_checkin_days", day)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all",
                local.blocked_checkin_days.includes(day)
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-border bg-white text-foreground-secondary hover:border-foreground-tertiary"
              )}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Blocked Check-out Days */}
      <div>
        <Label className="mb-1 block text-xs">No Check-out On</Label>
        <div className="flex flex-wrap gap-1.5">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={`co-${day}`}
              type="button"
              onClick={() => toggleDay("blocked_checkout_days", day)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all",
                local.blocked_checkout_days.includes(day)
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-border bg-white text-foreground-secondary hover:border-foreground-tertiary"
              )}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving || !dirty}
        className="w-full"
        variant={dirty ? "default" : "outline"}
      >
        {saving ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : saved ? (
          <>
            <Check className="size-4 mr-2" />
            Saved
          </>
        ) : (
          "Save Settings"
        )}
      </Button>
    </div>
  );
}
