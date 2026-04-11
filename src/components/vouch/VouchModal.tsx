"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { VouchForm, type VouchFormData } from "./VouchForm";
import {
  VOUCH_TYPE_POINTS,
  YEARS_KNOWN_BUCKETS,
  type VouchType,
  type YearsKnownBucket,
} from "@/lib/vouch-constants";

interface VouchModalProps {
  targetUserId: string;
  targetName: string;
  lockedYearsKnownBucket?: YearsKnownBucket;
  stayConfirmationId?: string;
  onClose: () => void;
  onSuccess: (points: number) => void;
}

export function VouchModal({
  targetUserId,
  targetName,
  lockedYearsKnownBucket,
  stayConfirmationId,
  onClose,
  onSuccess,
}: VouchModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdate, setIsUpdate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<{
    vouchType: VouchType;
    yearsKnownBucket: YearsKnownBucket;
    reputationStakeConfirmed: boolean;
  } | undefined>(undefined);

  // Load existing vouch if any
  useEffect(() => {
    async function loadExisting() {
      try {
        const res = await fetch(`/api/vouches?targetId=${targetUserId}`);
        if (!res.ok) throw new Error();
        const { vouch } = await res.json();
        if (vouch) {
          setInitialData({
            vouchType: vouch.vouch_type as VouchType,
            yearsKnownBucket: vouch.years_known_bucket as YearsKnownBucket,
            reputationStakeConfirmed: vouch.reputation_stake_confirmed,
          });
          setIsUpdate(true);
        }
      } catch {
        // No existing vouch — that's fine
      }
      setLoading(false);
    }
    loadExisting();
  }, [targetUserId]);

  const handleSubmit = useCallback(async (data: VouchFormData) => {
    setError(null);
    setSubmitting(true);

    const basePoints = VOUCH_TYPE_POINTS[data.vouchType];
    const multiplier = YEARS_KNOWN_BUCKETS.find(
      (b) => b.value === data.yearsKnownBucket
    )!.multiplier;
    const totalPoints = Math.round(basePoints * multiplier * 10) / 10;

    try {
      const res = await fetch("/api/vouches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          vouchType: data.vouchType,
          yearsKnownBucket: data.yearsKnownBucket,
          ...(stayConfirmationId ? { stayConfirmationId } : {}),
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "Failed to save vouch");
      }

      onSuccess(totalPoints);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }, [targetUserId, stayConfirmationId, onSuccess]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent showCloseButton className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isUpdate ? "Update Vouch" : "Vouch for"} {targetName}
          </DialogTitle>
          {isUpdate && (
            <DialogDescription>
              Updating your existing vouch
            </DialogDescription>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-foreground-tertiary" />
          </div>
        ) : (
          <VouchForm
            initialData={initialData}
            lockedYearsKnownBucket={lockedYearsKnownBucket}
            error={error}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitLabel={isUpdate ? "Update Vouch" : "Submit Vouch"}
          />
        )}

        {!loading && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
