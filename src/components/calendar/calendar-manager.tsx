"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CalendarGrid } from "./calendar-grid";
import { CalendarRangeModal } from "./calendar-range-modal";
import { CalendarSettingsPanel } from "./calendar-settings";
import { CalendarDays, Loader2, Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const BULK_OPTIONS: { status: AvailabilityStatus; label: string; color: string }[] = [
  { status: "available", label: "Available", color: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" },
  { status: "possibly_available", label: "Possibly Available", color: "bg-amber-100 text-amber-800 hover:bg-amber-200" },
  { status: "blocked", label: "Blocked", color: "bg-gray-100 text-gray-600 hover:bg-gray-200" },
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

  // Bulk set dropdown
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

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

  async function handleBulkSet(status: AvailabilityStatus) {
    setBulkSaving(true);
    setBulkOpen(false);

    // Set all unset days for the next N months (from settings.availability_window_months)
    const windowMonths = settings.availability_window_months || 12;
    const today = new Date();
    const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const endD = new Date(today);
    endD.setMonth(endD.getMonth() + windowMonths);
    const endDate = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, "0")}-${String(endD.getDate()).padStart(2, "0")}`;

    try {
      const res = await fetch(`/api/listings/${listingId}/availability/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          status,
        }),
      });
      if (res.ok) {
        await fetchRanges();
      }
    } finally {
      setBulkSaving(false);
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

        {/* Bulk set button (edit mode only) */}
        {mode === "edit" && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkOpen(!bulkOpen)}
              disabled={bulkSaving}
              className="text-xs gap-1.5"
            >
              <Paintbrush className="size-3.5" />
              {bulkSaving ? "Setting..." : "Set all unset days"}
            </Button>

            {bulkOpen && (
              <>
                {/* Backdrop to close */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setBulkOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-52 rounded-lg border border-border bg-white p-2 shadow-lg">
                  <p className="text-[10px] text-foreground-tertiary px-2 pb-2">
                    Only affects dates with no status set. Already-set dates and booked stays are not changed.
                  </p>
                  {BULK_OPTIONS.map((opt) => (
                    <button
                      key={opt.status}
                      onClick={() => handleBulkSet(opt.status)}
                      className={`w-full text-left rounded-md px-3 py-2 text-xs font-medium transition-colors ${opt.color}`}
                    >
                      Mark all unset as {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
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
          onBookedStayClick={mode === "edit" ? handleBookedStayClick : undefined}
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
