"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_OPTIONS = [
  {
    value: "minor",
    label: "Minor",
    desc: "Dishes, small mess, forgot to lock up",
  },
  {
    value: "moderate",
    label: "Moderate",
    desc: "Noise complaints, minor damage, broken rules",
  },
  {
    value: "serious",
    label: "Serious",
    desc: "Significant damage, unauthorized guests, safety issues",
  },
];

const HANDLING_OPTIONS = [
  {
    value: "excellent",
    label: "Excellent",
    desc: "Owned it immediately, offered to fix/pay",
  },
  {
    value: "responsive",
    label: "Responsive",
    desc: "Handled when raised",
  },
  {
    value: "poor",
    label: "Poor",
    desc: "Didn't disclose, host discovered it",
  },
  {
    value: "terrible",
    label: "Terrible",
    desc: "Ghosted, denied responsibility",
  },
];

interface IncidentFormProps {
  reportedUserId: string;
  stayConfirmationId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function IncidentForm({
  reportedUserId,
  stayConfirmationId,
  onSuccess,
  onCancel,
}: IncidentFormProps) {
  const [severity, setSeverity] = useState<string | null>(null);
  const [handling, setHandling] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!severity || !handling) {
      setError("Please select both severity and handling.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedUserId,
          stayConfirmationId,
          severity,
          handling,
          description: description.trim() || null,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "Failed to submit");
      }

      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-foreground-secondary">
        <AlertTriangle className="size-4" />
        <p className="text-sm font-medium">Report an Incident</p>
      </div>
      <p className="text-xs text-foreground-tertiary">
        This data is recorded for future reference. No score impact at this time.
      </p>

      {/* Severity */}
      <div>
        <Label className="mb-2 block">Severity</Label>
        <div className="space-y-1.5">
          {SEVERITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSeverity(opt.value)}
              className={cn(
                "flex w-full flex-col rounded-lg border px-4 py-2.5 text-left transition-all",
                severity === opt.value
                  ? "border-primary bg-primary-light"
                  : "border-border hover:border-foreground-tertiary"
              )}
            >
              <span className="text-sm font-medium text-foreground">
                {opt.label}
              </span>
              <span className="text-xs text-foreground-secondary">
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Handling */}
      <div>
        <Label className="mb-2 block">How was it handled?</Label>
        <div className="space-y-1.5">
          {HANDLING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setHandling(opt.value)}
              className={cn(
                "flex w-full flex-col rounded-lg border px-4 py-2.5 text-left transition-all",
                handling === opt.value
                  ? "border-primary bg-primary-light"
                  : "border-border hover:border-foreground-tertiary"
              )}
            >
              <span className="text-sm font-medium text-foreground">
                {opt.label}
              </span>
              <span className="text-xs text-foreground-secondary">
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <Label className="mb-1.5 block text-xs">Description (optional)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened?"
          rows={3}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={submitting || !severity || !handling}
          className="flex-1"
        >
          {submitting ? "Submitting..." : "Submit Report"}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Skip
          </Button>
        )}
      </div>
    </div>
  );
}
