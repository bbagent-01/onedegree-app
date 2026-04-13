"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CalendarGrid } from "./calendar-grid";
import { CalendarRangeModal } from "./calendar-range-modal";
import { CalendarSettingsPanel } from "./calendar-settings";
import { CalendarDays, Loader2, Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  AvailabilityRange,
  AvailabilityStatus,
  BookedStay,
  CalendarSettings,
} from "./types";

interface CalendarManagerProps {
  listingId: string;
  mode: "edit" | "readonly";
  initialSettings?: CalendarSettings;
  bookedStays?: BookedStay[];
}

const DEFAULT_SETTINGS: CalendarSettings = {
  min_nights: 1,
  max_nights: 365,
  prep_days: 0,
  advance_notice_days: 1,
  availability_window_months: 12,
  checkin_time: "15:00",
  checkout_time: "11:00",
  blocked_checkin_days: [],
  blocked_checkout_days: [],
  default_availability_status: null,
};

const DEFAULT_STATUS_OPTIONS: { status: AvailabilityStatus; label: string; color: string; activeColor: string }[] = [
  { status: "available", label: "Available", color: "border-border bg-white text-foreground-secondary hover:border-emerald-300", activeColor: "border-emerald-400 bg-emerald-100 text-emerald-800" },
  { status: "possibly_available", label: "Possibly Available", color: "border-border bg-white text-foreground-secondary hover:border-amber-300", activeColor: "border-amber-400 bg-amber-100 text-amber-800" },
  { status: "blocked", label: "Blocked", color: "border-border bg-white text-foreground-secondary hover:border-gray-400", activeColor: "border-gray-400 bg-gray-200 text-gray-700" },
];

export function CalendarManager({
  listingId,
  mode,
  initialSettings,
  bookedStays = [],
}: CalendarManagerProps) {
  const router = useRouter();
  const [ranges, setRanges] = useState<AvailabilityRange[]>([]);
  const [settings, setSettings] = useState<CalendarSettings>(
    initialSettings ?? DEFAULT_SETTINGS
  );
  const [loading, setLoading] = useState(true);

  // Selection modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStart, setSelectedStart] = useState("");
  const [selectedEnd, setSelectedEnd] = useState("");
  const [saving, setSaving] = useState(false);

  // Default status saving indicator
  const [defaultSaving, setDefaultSaving] = useState(false);

  const fetchRanges = useCallback(async () => {
    try {
      const res = await fetch(`/api/listings/${listingId}/availability`);
      if (res.ok) {
        const { ranges: data } = await res.json();
        setRanges(data);
      }
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchRanges();
  }, [fetchRanges]);

  function handleSelectRange(start: string, end: string) {
    setSelectedStart(start);
    setSelectedEnd(end);
    setModalOpen(true);
  }

  function handleBookedStayClick(stayId: string) {
    router.push(`/my-trips?stay=${stayId}`);
  }

  async function handleSaveRange(data: {
    status: AvailabilityStatus;
    custom_price_per_night: number | null;
    note: string | null;
  }) {
    setSaving(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: selectedStart,
          end_date: selectedEnd,
          ...data,
        }),
      });
      if (res.ok) {
        await fetchRanges();
        setModalOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDefaultStatusChange(status: AvailabilityStatus | null) {
    // Toggle off if already selected
    const newStatus = settings.default_availability_status === status ? null : status;
    setDefaultSaving(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/calendar-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ default_availability_status: newStatus }),
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, default_availability_status: newStatus }));
      }
    } finally {
      setDefaultSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-foreground-secondary">
        <Loader2 className="size-5 animate-spin mr-2" />
        <span className="text-sm">Loading calendar...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />
          <h2 className="text-xl text-foreground">
            {mode === "edit" ? "Manage Availability" : "Availability"}
          </h2>
        </div>
      </div>

      {mode === "edit" && (
        <p className="text-sm text-foreground-secondary -mt-4">
          Click a date, then click another to select a range. Set availability
          status and optional pricing for each range.
        </p>
      )}

      {/* Default status for unset days (edit mode only) */}
      {mode === "edit" && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-foreground-secondary mr-1">
            <Paintbrush className="size-3.5" />
            <span>Default for unset days:</span>
          </div>
          {DEFAULT_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.status}
              onClick={() => handleDefaultStatusChange(opt.status)}
              disabled={defaultSaving}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                settings.default_availability_status === opt.status
                  ? opt.activeColor
                  : opt.color
              )}
            >
              {opt.label}
            </button>
          ))}
          {settings.default_availability_status && (
            <button
              onClick={() => handleDefaultStatusChange(null)}
              disabled={defaultSaving}
              className="text-[10px] text-foreground-tertiary hover:text-foreground-secondary underline"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Calendar grid */}
      <div className="rounded-xl border border-border bg-white p-4 md:p-5">
        <CalendarGrid
          ranges={ranges}
          bookedStays={bookedStays}
          prepDays={settings.prep_days}
          mode={mode}
          onSelectRange={mode === "edit" ? handleSelectRange : undefined}
          onBookedStayClick={mode === "edit" ? handleBookedStayClick : undefined}
          defaultStatus={settings.default_availability_status}
        />
      </div>

      {/* Settings (edit mode only) */}
      {mode === "edit" && (
        <CalendarSettingsPanel
          listingId={listingId}
          settings={settings}
          onSettingsChange={setSettings}
        />
      )}

      {/* Range modal */}
      {mode === "edit" && (
        <CalendarRangeModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          startDate={selectedStart}
          endDate={selectedEnd}
          onSave={handleSaveRange}
          saving={saving}
        />
      )}
    </div>
  );
}
