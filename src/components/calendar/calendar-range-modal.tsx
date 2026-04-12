"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { AvailabilityStatus } from "./types";

const STATUS_OPTIONS: {
  value: AvailabilityStatus;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    value: "available",
    label: "Available",
    description: "Open for booking requests",
    color: "border-emerald-300 bg-emerald-50 text-emerald-800",
  },
  {
    value: "possibly_available",
    label: "Possibly Available",
    description: "Guests can inquire",
    color: "border-amber-300 bg-amber-50 text-amber-800",
  },
  {
    value: "blocked",
    label: "Blocked",
    description: "Not available",
    color: "border-gray-300 bg-gray-50 text-gray-600",
  },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface CalendarRangeModalProps {
  open: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  onSave: (data: {
    status: AvailabilityStatus;
    custom_price_per_night: number | null;
    note: string | null;
  }) => void;
  saving: boolean;
}

export function CalendarRangeModal({
  open,
  onClose,
  startDate,
  endDate,
  onSave,
  saving,
}: CalendarRangeModalProps) {
  const [status, setStatus] = useState<AvailabilityStatus>("available");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");

  function handleSave() {
    onSave({
      status,
      custom_price_per_night: price ? parseFloat(price) : null,
      note: note.trim() || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Availability</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-foreground-secondary">
          {formatDate(startDate)} — {formatDate(endDate)}
        </p>

        <div className="space-y-4 mt-2">
          {/* Status picker */}
          <div className="space-y-2">
            <Label className="block">Status</Label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    "rounded-xl border-2 p-3 text-center text-xs font-medium transition-all",
                    status === opt.value
                      ? opt.color
                      : "border-border bg-white text-foreground-secondary hover:border-foreground-tertiary"
                  )}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className="mt-0.5 text-[10px] opacity-70">
                    {opt.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom price */}
          {status !== "blocked" && (
            <div>
              <Label className="mb-1.5 block">
                Custom Price / Night (optional)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-tertiary">
                  $
                </span>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Use listing default"
                  min={0}
                  className="pl-7"
                />
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <Label className="mb-1.5 block">Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Holiday pricing, hosting family..."
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
