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
} from "@/lib/vouch-constants";
import {
  yearsKnownLabel,
  type YearsKnownBucketAny,
} from "@/lib/trust/years-known-labels";
import { Shield, Star, Check, ChevronRight, Trash2, Info } from "lucide-react";
import { toast } from "sonner";

interface VouchTarget {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface ExistingVouch {
  vouch_type: VouchType;
  years_known_bucket: string;
  vouch_score?: number | null;
}

interface VouchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: VouchTarget;
  existingVouch?: ExistingVouch | null;
  isPostStay?: boolean;
  sourceBookingId?: string | null;
  onVouchSaved?: (score: number) => void;
  onVouchRemoved?: () => void;
}

type Step = "type" | "years" | "confirm" | "remove_confirm";

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
  const [yearsKnown, setYearsKnown] = useState<YearsKnownBucketAny | null>(
    null
  );
  const [stakeAcknowledged, setStakeAcknowledged] = useState(false);
  const [showVouchPowerInfo, setShowVouchPowerInfo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeReason, setRemoveReason] = useState("");
  const [savedScore, setSavedScore] = useState<number | null>(null);
  const [savedVouchPower, setSavedVouchPower] = useState<number | null>(null);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      const normalizedBucket = existingVouch
        ? normalizeBucket(existingVouch.years_known_bucket)
        : null;
      setStep("type");
      setVouchType(existingVouch?.vouch_type ?? null);
      setYearsKnown(
        normalizedBucket ?? (isPostStay ? "platform_met" : null)
      );
      setStakeAcknowledged(false);
      setShowVouchPowerInfo(false);
      setSaving(false);
      setRemoving(false);
      setRemoveReason("");
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
      setSavedVouchPower(
        typeof data.vouchPower === "number" ? data.vouchPower : null
      );
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
        body: JSON.stringify({
          targetUserId: target.id,
          reason: removeReason.trim() || undefined,
        }),
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
  }, [target.id, removeReason, onVouchRemoved, onOpenChange]);

  const isUpdate = !!existingVouch;
  const firstName = target.name.split(" ")[0];

  const stepTitle: Record<Step, string> = {
    type: isUpdate ? `Update vouch for ${firstName}` : `Vouch for ${firstName}`,
    years: isUpdate ? `Update vouch for ${firstName}` : `Vouch for ${firstName}`,
    confirm: "",
    remove_confirm: `Remove vouch for ${firstName}`,
  };

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
          {isUpdate ? (
            <Button
              variant="ghost"
              size="lg"
              className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setStep("remove_confirm")}
            >
              <Trash2 className="h-4 w-4" />
              Remove vouch
            </Button>
          ) : (
            <div />
          )}
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

      {/* Step 2: Years Known + Acknowledgment */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          step === "years"
            ? "translate-x-0 opacity-100"
            : step === "type" || step === "remove_confirm"
              ? "translate-x-full absolute inset-0 opacity-0 pointer-events-none"
              : "-translate-x-full absolute inset-0 opacity-0 pointer-events-none"
        )}
      >
        {isPostStay ? (
          <>
            <div className="rounded-xl border-2 border-brand bg-brand/5 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Relationship
              </div>
              <div className="mt-0.5 text-sm font-semibold">
                {yearsKnownLabel("platform_met")}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Auto-set because you met {firstName} through this platform.
                Counts less than vouching for someone you knew before.
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              How long have you known {firstName}?
            </p>
            <div className="space-y-2">
              {YEARS_KNOWN_BUCKETS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => setYearsKnown(b.value)}
                  className={cn(
                    "w-full rounded-lg border px-4 py-3 text-left text-sm transition-all",
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
              ))}
            </div>
          </>
        )}

        {/* Reputation stake acknowledgment with inline info toggle */}
        <label className="mt-4 flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={stakeAcknowledged}
            onChange={(e) => setStakeAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border accent-brand"
          />
          <div className="flex-1">
            <span className="text-sm text-muted-foreground leading-relaxed">
              I understand that {firstName}&apos;s guest rating will affect my
              vouch power.{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowVouchPowerInfo(!showVouchPowerInfo);
                }}
                className="inline-flex items-center align-middle"
                aria-label="What is vouch power?"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/40 text-[10px] font-semibold text-muted-foreground hover:bg-muted-foreground/10 transition-colors">
                  i
                </span>
              </button>
            </span>
            {showVouchPowerInfo && (
              <div className="mt-2 rounded border border-border bg-white p-2.5 text-xs text-muted-foreground leading-relaxed animate-in fade-in-0 slide-in-from-top-1 duration-200">
                <strong className="text-foreground">Vouch power</strong> determines
                how much weight your vouches carry. It&apos;s based on the average
                guest rating of people you&apos;ve vouched for. If they&apos;re great
                guests, your vouch power goes up. If they&apos;re not, it goes down.
                This only affects how much your vouch counts — it does not affect
                your own guest rating.
              </div>
            )}
          </div>
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

      {/* Remove Confirmation */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          step === "remove_confirm"
            ? "translate-x-0 opacity-100"
            : "translate-x-full absolute inset-0 opacity-0 pointer-events-none"
        )}
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to remove your vouch for{" "}
          <span className="font-medium text-foreground">{target.name}</span>?
          This will affect their 1&deg; Score with anyone connected through you.
        </p>

        <div className="mt-4">
          <label className="text-sm font-medium text-foreground">
            Reason{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            value={removeReason}
            onChange={(e) => setRemoveReason(e.target.value)}
            placeholder="Can you tell us why?"
            className="mt-1.5 w-full rounded-xl border-2 border-border bg-white px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground/60 focus:border-brand focus:outline-none resize-none"
            rows={3}
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Button variant="ghost" size="lg" onClick={() => setStep("type")}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="lg"
            disabled={removing}
            onClick={handleRemove}
            className="gap-1"
          >
            <Trash2 className="h-4 w-4" />
            {removing ? "Removing..." : "Confirm removal"}
          </Button>
        </div>
      </div>

      {/* Confirmation */}
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
            <span>{yearsKnownLabel(yearsKnown)}</span>
            <span className="text-muted-foreground">&middot;</span>
            <span className="font-semibold">{savedScore ?? computedScore} pts</span>
          </div>

          {savedVouchPower !== null && (
            <div className="mt-4 max-w-sm text-sm text-muted-foreground">
              <p>
                Your vouch power (
                <span className="font-semibold text-foreground">
                  {savedVouchPower.toFixed(2)}&times;
                </span>
                ) multiplies this vouch&rsquo;s impact on {firstName}&rsquo;s
                trust connections.
              </p>
              {savedVouchPower < 1 && (
                <p className="mt-2 text-amber-700">
                  Your recent vouchees&rsquo; guest ratings have reduced your
                  vouch power. Ratings 4.0+ bring it back up.
                </p>
              )}
              {savedVouchPower > 1 && (
                <p className="mt-2 text-emerald-700">
                  Your vouchees consistently earn high guest ratings &mdash;
                  your endorsements carry more weight.
                </p>
              )}
            </div>
          )}

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
              <DialogTitle>{stepTitle[step]}</DialogTitle>
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
            <SheetTitle>{stepTitle[step]}</SheetTitle>
          </SheetHeader>
        )}
        {content}
      </SheetContent>
    </Sheet>
  );
}
