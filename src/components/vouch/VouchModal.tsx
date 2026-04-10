"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Star, Shield, AlertCircle, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  VOUCH_TYPE_POINTS,
  YEARS_KNOWN_BUCKETS,
  type VouchType,
  type YearsKnownBucket,
} from "@/lib/vouch-constants";

interface VouchModalProps {
  targetUserId: string;
  targetName: string;
  onClose: () => void;
  onSuccess: (points: number) => void;
}

export function VouchModal({
  targetUserId,
  targetName,
  onClose,
  onSuccess,
}: VouchModalProps) {
  const [vouchType, setVouchType] = useState<VouchType | null>(null);
  const [yearsBucket, setYearsBucket] = useState<YearsKnownBucket | null>(null);
  const [stakeConfirmed, setStakeConfirmed] = useState(false);
  const [stakeWarning, setStakeWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdate, setIsUpdate] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load existing vouch if any
  useEffect(() => {
    async function loadExisting() {
      try {
        const res = await fetch(`/api/vouches?targetId=${targetUserId}`);
        if (!res.ok) throw new Error();
        const { vouch } = await res.json();
        if (vouch) {
          setVouchType(vouch.vouch_type as VouchType);
          setYearsBucket(vouch.years_known_bucket as YearsKnownBucket);
          setStakeConfirmed(vouch.reputation_stake_confirmed);
          setIsUpdate(true);
        }
      } catch {
        // No existing vouch — that's fine
      }
      setLoading(false);
    }
    loadExisting();
  }, [targetUserId]);

  // Calculate points
  const basePoints = vouchType ? VOUCH_TYPE_POINTS[vouchType] : 0;
  const multiplier = yearsBucket
    ? YEARS_KNOWN_BUCKETS.find((b) => b.value === yearsBucket)!.multiplier
    : 0;
  const totalPoints = Math.round(basePoints * multiplier * 10) / 10;

  const handleSubmit = useCallback(async () => {
    setError(null);
    setStakeWarning(false);

    if (!vouchType || !yearsBucket) {
      setError("Please complete all fields.");
      return;
    }
    if (!stakeConfirmed) {
      setStakeWarning(true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/vouches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          vouchType,
          yearsKnownBucket: yearsBucket,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save vouch");
      }

      onSuccess(totalPoints);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }, [targetUserId, vouchType, yearsBucket, stakeConfirmed, totalPoints, onSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-border bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isUpdate ? "Update Vouch" : "Vouch for"} {targetName}
            </h2>
            {isUpdate && (
              <p className="text-sm text-foreground-secondary mt-0.5">
                Updating your existing vouch
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground-tertiary hover:bg-background-mid hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-foreground-tertiary" />
          </div>
        ) : (
          <div className="px-6 py-5 space-y-6">
            {/* Step 1: Vouch Type */}
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">
                Step 1 — Vouch Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setVouchType("standard")}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all",
                    vouchType === "standard"
                      ? "border-primary bg-primary-light"
                      : "border-border hover:border-foreground-tertiary"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Shield className="size-4 text-primary" />
                    <span className="font-medium text-sm text-foreground">
                      Standard
                    </span>
                  </div>
                  <p className="text-xs text-foreground-secondary leading-relaxed">
                    I&apos;d introduce them to a friend.
                  </p>
                  <p className="text-xs font-medium text-primary mt-2">
                    15 base pts
                  </p>
                </button>

                <button
                  onClick={() => setVouchType("inner_circle")}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all",
                    vouchType === "inner_circle"
                      ? "border-primary bg-primary-light"
                      : "border-border hover:border-foreground-tertiary"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Star className="size-4 text-primary" />
                    <span className="font-medium text-sm text-foreground">
                      Inner Circle ★
                    </span>
                  </div>
                  <p className="text-xs text-foreground-secondary leading-relaxed">
                    They&apos;re my closest people.
                  </p>
                  <p className="text-xs font-medium text-primary mt-2">
                    25 base pts
                  </p>
                </button>
              </div>
              <p className="text-xs text-foreground-tertiary mt-2">
                Inner Circle carries more weight — and more accountability.
              </p>
            </div>

            {/* Step 2: Years Known */}
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">
                Step 2 — How long have you known them?
              </label>
              <div className="space-y-1.5">
                {YEARS_KNOWN_BUCKETS.map((bucket) => (
                  <button
                    key={bucket.value}
                    onClick={() => setYearsBucket(bucket.value)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm transition-all",
                      yearsBucket === bucket.value
                        ? "border-primary bg-primary-light text-foreground"
                        : "border-border text-foreground-secondary hover:border-foreground-tertiary hover:text-foreground"
                    )}
                  >
                    <span>{bucket.label}</span>
                    <span
                      className={cn(
                        "text-xs font-mono",
                        yearsBucket === bucket.value
                          ? "text-primary"
                          : "text-foreground-tertiary"
                      )}
                    >
                      {bucket.multiplier}×
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Reputation Stake */}
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">
                Step 3 — Reputation Stake
              </label>
              <label
                className={cn(
                  "flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all",
                  stakeConfirmed
                    ? "border-primary bg-primary-light"
                    : stakeWarning
                      ? "border-destructive bg-destructive/5"
                      : "border-border hover:border-foreground-tertiary"
                )}
              >
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={stakeConfirmed}
                    onChange={(e) => {
                      setStakeConfirmed(e.target.checked);
                      if (e.target.checked) setStakeWarning(false);
                    }}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      "size-5 rounded-md border-2 flex items-center justify-center transition-colors",
                      stakeConfirmed
                        ? "border-primary bg-primary"
                        : "border-foreground-tertiary"
                    )}
                  >
                    {stakeConfirmed && (
                      <Check className="size-3.5 text-white" />
                    )}
                  </div>
                </div>
                <span className="text-sm text-foreground-secondary leading-relaxed">
                  I understand my vouching reputation will be affected if this
                  person causes problems for a host.
                </span>
              </label>
              {stakeWarning && (
                <p className="flex items-center gap-1.5 text-xs text-destructive mt-2">
                  <AlertCircle className="size-3.5" />
                  You must accept the reputation stake to submit.
                </p>
              )}
            </div>

            {/* Point Preview */}
            {vouchType && yearsBucket && (
              <div className="rounded-xl bg-background-mid border border-border px-4 py-3">
                <p className="text-sm text-foreground">
                  This vouch is worth{" "}
                  <span className="font-semibold text-primary">
                    {totalPoints} pts
                  </span>{" "}
                  <span className="text-foreground-tertiary">
                    (base {basePoints} × {multiplier}×)
                  </span>
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                <AlertCircle className="size-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !vouchType || !yearsBucket}
            >
              {submitting && <Loader2 className="size-4 animate-spin mr-1.5" />}
              {isUpdate ? "Update Vouch" : "Submit Vouch"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
