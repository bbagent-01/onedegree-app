"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  VOUCH_TYPES,
  YEARS_KNOWN_BUCKETS,
  computeVouchScore,
  normalizeBucket,
  type VouchType,
  type YearsKnownBucket,
} from "@/lib/vouch-constants";
import { Shield, Star, Check, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface VouchTarget {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface ExistingVouch {
  vouch_type: VouchType;
  years_known_bucket: string; // could be old or new format
  vouch_score?: number | null;
}

interface VouchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: VouchTarget;
  /** Pre-existing vouch to update (null = new vouch) */
  existingVouch?: ExistingVouch | null;
  /** Post-stay vouch locks years_known to lt1 */
  isPostStay?: boolean;
  /** Booking ID that triggered this vouch */
  sourceBookingId?: string | null;
  /** Callback after vouch is successfully saved */
  onVouchSaved?: (score: number) => void;
  /** Callback after vouch is removed */
  onVouchRemoved?: () => void;
}

type Step = "type" | "years" | "confirm";

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

export function VouchModal({
  open,
  onOpenChange,
  target,
  existingVouch,
  isPostStay = false,
  sourceBookingId,
  onVouchSaved,
  onVouchRemoved,
}: VouchModalProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const prevOpenRef = useRef(false);

  const [step, setStep] = useState<Step>("type");
  const [vouchType, setVouchType] = useState<VouchType | null>(null);
  const [yearsKnown, setYearsKnown] = useState<YearsKnownBucket | null>(null);
  const [stakeAcknowledged, setStakeAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [savedScore, setSavedScore] = useState<number | null>(null);

  // Only reset state on open transition (false → true), not on every prop change
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      const normalizedBucket = existingVouch
        ? normalizeBucket(existingVouch.years_known_bucket)
        : null;
      setStep("type");
      setVouchType(existingVouch?.vouch_type ?? null);
      setYearsKnown(normalizedBucket ?? (isPostStay ? "lt1" : null));
      setStakeAcknowledged(false);
      setSaving(false);
      setRemoving(false);
      setSavedScore(null);
    }
    prevOpenRef.current = open;
  }, [open, existingVouch, isPostStay]);

  const computedScore =
    vouchType && yearsKnown ? computeVouchScore(vouchType, yearsKnown) : null;

  const handleSubmit = useCallback(async () => {
    if (!vouchType || !yearsKnown) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vouches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: target.id,
          vouchType,
          yearsKnownBucket: yearsKnown,
          isPostStay,
          sourceBookingId: sourceBookingId ?? undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save vouch");
      }
      const data = await res.json();
      const score = data.vouchScore ?? computedScore ?? 0;
      setSavedScore(score);
      setStep("confirm");
      onVouchSaved?.(score);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save vouch");
    } finally {
      setSaving(false);
    }
  }, [
    vouchType,
    yearsKnown,
    target.id,
    isPostStay,
    sourceBookingId,
    computedScore,
    onVouchSaved,
  ]);

  const handleRemove = useCallback(async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/vouches", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: target.id }),
      });
      if (!res.ok) throw new Error("Failed to remove vouch");
      toast.success("Vouch removed");
      onVouchRemoved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove vouch");
    } finally {
      setRemoving(false);
    }
  }, [target.id, onVouchRemoved, onOpenChange]);

  const isUpdate = !!existingVouch;
  const firstName = target.name.split(" ")[0];
  const title =
    step === "confirm"
      ? ""
      : isUpdate
        ? `Update vouch for ${firstName}`
        : `Vouch for ${firstName}`;

  const content = (
    <div className="relative min-h-[280px]">
      {/* Step 1: Vouch Type */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          step === "type"
            ? "translate-x-0 opacity-100"
            : "-translate-x-full absolute inset-0 opacity-0 pointer-events-none"
        )}
      >
        <p className="mb-4 text-sm text-muted-foreground">
          How do you know {firstName}?
        </p>
        <div className="space-y-3">
          {VOUCH_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setVouchType(t.value)}
              className={cn(
                "w-full rounded-xl border-2 p-4 text-left transition-all",
                vouchType === t.value
                  ? "border-brand bg-brand/5 ring-1 ring-brand/20"
                  : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    t.value === "inner_circle"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700"
                  )}
                >
                  {t.value === "inner_circle" ? (
                    <Star className="h-4 w-4" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{t.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.basePoints} pts base
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.description}
                  </p>
                </div>
                {vouchType === t.value && (
                  <Check className="h-4 w-4 shrink-0 text-brand" />
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between">
          {isUpdate && (
            <Button
              variant="destructive"
              size="lg"
              disabled={removing}
              onClick={handleRemove}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
              {removing ? "Removing..." : "Remove vouch"}
            </Button>
          )}
          {!isUpdate && <div />}
          <Button
            size="lg"
            disabled={!vouchType}
            onClick={() => setStep("years")}
            className="gap-1"
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Step 2: Years Known */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          step === "years"
            ? "translate-x-0 opacity-100"
            : step === "type"
              ? "translate-x-full absolute inset-0 opacity-0 pointer-events-none"
              : "-translate-x-full absolute inset-0 opacity-0 pointer-events-none"
        )}
      >
        <p className="mb-4 text-sm text-muted-foreground">
          How long have you known {firstName}?
        </p>
        {isPostStay && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Since you connected through 1&deg; B&B, this defaults to less than 1
            year.
          </div>
        )}
        <div className="space-y-2">
          {YEARS_KNOWN_BUCKETS.map((b) => {
            const locked = isPostStay && b.value !== "lt1";
            return (
              <button
                key={b.value}
                type="button"
                disabled={locked}
                onClick={() => !locked && setYearsKnown(b.value)}
                className={cn(
                  "w-full rounded-lg border px-4 py-3 text-left text-sm transition-all",
                  locked && "cursor-not-allowed opacity-40",
                  yearsKnown === b.value
                    ? "border-brand bg-brand/5 font-medium ring-1 ring-brand/20"
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <span>{b.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {b.multiplier}x
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Reputation stake acknowledgment */}
        <label className="mt-4 flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={stakeAcknowledged}
            onChange={(e) => setStakeAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border accent-brand"
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            I understand that {firstName}&apos;s guest rating will affect my vouch power.
          </span>
        </label>

        <div className="mt-5 flex items-center justify-between">
          <Button variant="ghost" size="lg" onClick={() => setStep("type")}>
            Back
          </Button>
          <Button
            size="lg"
            disabled={!yearsKnown || !stakeAcknowledged || saving}
            onClick={handleSubmit}
          >
            {saving
              ? "Saving..."
              : isUpdate
                ? "Update vouch"
                : `Vouch for ${firstName}`}
          </Button>
        </div>
      </div>

      {/* Step 3: Confirmation */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          step === "confirm"
            ? "translate-x-0 opacity-100"
            : "translate-x-full absolute inset-0 opacity-0 pointer-events-none"
        )}
      >
        <div className="flex flex-col items-center py-4 text-center">
          <Link href={`/profile/${target.id}`} className="relative group">
            <Avatar className="h-16 w-16 ring-2 ring-transparent group-hover:ring-brand/30 transition-all">
              {target.avatar_url && (
                <AvatarImage src={target.avatar_url} alt={target.name} />
              )}
              <AvatarFallback className="text-lg">
                {initials(target.name)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm animate-in zoom-in-50 duration-300">
              <Check className="h-4 w-4" />
            </div>
          </Link>
          <h3 className="mt-4 text-lg font-semibold">
            You&rsquo;ve vouched for{" "}
            <Link href={`/profile/${target.id}`} className="hover:underline">
              {target.name}
            </Link>
          </h3>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm">
            <span className="capitalize">
              {vouchType === "inner_circle" ? "Inner Circle" : "Standard"}
            </span>
            <span className="text-muted-foreground">&middot;</span>
            <span>
              {YEARS_KNOWN_BUCKETS.find((b) => b.value === yearsKnown)?.label}
            </span>
            <span className="text-muted-foreground">&middot;</span>
            <span className="font-semibold">{savedScore ?? computedScore} pts</span>
          </div>
          <div className="mt-6">
            <Button
              size="lg"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          {step !== "confirm" && (
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
          )}
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8 pt-5">
        {step !== "confirm" && (
          <SheetHeader className="p-0 pb-3">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
        )}
        {content}
      </SheetContent>
    </Sheet>
  );
}
