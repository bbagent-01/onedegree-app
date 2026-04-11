"use client";

import { useState } from "react";
import { Star, Shield, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  VOUCH_TYPE_POINTS,
  YEARS_KNOWN_BUCKETS,
  type VouchType,
  type YearsKnownBucket,
} from "@/lib/vouch-constants";

export interface VouchFormData {
  vouchType: VouchType;
  yearsKnownBucket: YearsKnownBucket;
}

interface VouchFormProps {
  initialData?: {
    vouchType: VouchType;
    yearsKnownBucket: YearsKnownBucket;
    reputationStakeConfirmed: boolean;
  };
  lockedYearsKnownBucket?: YearsKnownBucket;
  error?: string | null;
  onSubmit: (data: VouchFormData) => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function VouchForm({
  initialData,
  lockedYearsKnownBucket,
  error,
  onSubmit,
  submitting,
  submitLabel = "Submit Vouch",
}: VouchFormProps) {
  const [vouchType, setVouchType] = useState<VouchType | null>(
    initialData?.vouchType ?? null
  );
  const [yearsBucket, setYearsBucket] = useState<YearsKnownBucket | null>(
    lockedYearsKnownBucket ?? initialData?.yearsKnownBucket ?? null
  );
  const [stakeConfirmed, setStakeConfirmed] = useState(
    initialData?.reputationStakeConfirmed ?? false
  );
  const [stakeWarning, setStakeWarning] = useState(false);

  const basePoints = vouchType ? VOUCH_TYPE_POINTS[vouchType] : 0;
  const multiplier = yearsBucket
    ? YEARS_KNOWN_BUCKETS.find((b) => b.value === yearsBucket)!.multiplier
    : 0;
  const totalPoints = Math.round(basePoints * multiplier * 10) / 10;

  function handleSubmit() {
    setStakeWarning(false);
    if (!vouchType || !yearsBucket) return;
    if (!stakeConfirmed) {
      setStakeWarning(true);
      return;
    }
    onSubmit({ vouchType, yearsKnownBucket: yearsBucket });
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Vouch Type */}
      <div>
        <Label className="mb-3 block">
          Step 1 — Vouch Type
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
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
            type="button"
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
        <Label className="mb-3 block">
          Step 2 — How long have you known them?
        </Label>
        {lockedYearsKnownBucket ? (
          <div>
            <div className="rounded-lg border border-foreground-tertiary bg-background-mid px-4 py-2.5 text-sm text-foreground-secondary">
              <span>
                {YEARS_KNOWN_BUCKETS.find((b) => b.value === lockedYearsKnownBucket)?.label}
              </span>
              <span className="text-xs font-mono text-foreground-tertiary ml-2">
                {YEARS_KNOWN_BUCKETS.find((b) => b.value === lockedYearsKnownBucket)?.multiplier}×
              </span>
            </div>
            <p className="text-[10px] text-foreground-tertiary mt-1.5">
              Post-stay vouches use the &lt;1 year multiplier automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {YEARS_KNOWN_BUCKETS.map((bucket) => (
              <button
                key={bucket.value}
                type="button"
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
        )}
      </div>

      {/* Step 3: Reputation Stake */}
      <div>
        <Label className="mb-3 block">
          Step 3 — Reputation Stake
        </Label>
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

      {/* Submit */}
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !vouchType || !yearsBucket}
        className="w-full"
        size="lg"
      >
        {submitting ? "Submitting..." : submitLabel}
      </Button>
    </div>
  );
}
