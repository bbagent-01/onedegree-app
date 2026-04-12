"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarGrid } from "./calendar-grid";
import { CalendarRangeModal } from "./calendar-range-modal";
import { CalendarSettingsPanel } from "./calendar-settings";
import { CalendarDays, Loader2 } from "lucide-react";
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
};

export function CalendarManager({
  listingId,
  mode,
  initialSettings,
  bookedStays = [],
}: CalendarManagerProps) {
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
      <div className="flex items-center gap-2">
        <CalendarDays className="size-5 text-primary" />
        <h2 className="text-xl text-foreground">
          {mode === "edit" ? "Manage Availability" : "Availability"}
        </h2>
      </div>

      {mode === "edit" && (
        <p className="text-sm text-foreground-secondary -mt-4">
          Click a date, then click another to select a range. Set availability
          status and optional pricing for each range.
        </p>
      )}

      {/* Calendar grid */}
      <div className="rounded-xl border border-border bg-white p-4 md:p-5">
        <CalendarGrid
          ranges={ranges}
          bookedStays={bookedStays}
          prepDays={settings.prep_days}
          mode={mode}
          onSelectRange={mode === "edit" ? handleSelectRange : undefined}
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
