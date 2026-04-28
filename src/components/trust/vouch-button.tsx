"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { VouchModal } from "./vouch-modal";
import { Shield } from "lucide-react";
import type { VouchType } from "@/lib/vouch-constants";

interface VouchButtonProps {
  targetId: string;
  targetName: string;
  targetAvatar?: string | null;
  /** Hide button if viewer is the target */
  isOwnProfile?: boolean;
  /** Post-stay mode locks years to lt1 */
  isPostStay?: boolean;
  sourceBookingId?: string | null;
  /** Button variant */
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  /** Called when vouch is saved */
  onVouchSaved?: (score: number) => void;
}

interface ExistingVouch {
  vouch_type: VouchType;
  years_known_bucket: string;
  vouch_score?: number | null;
}

export function VouchButton({
  targetId,
  targetName,
  targetAvatar,
  isOwnProfile = false,
  isPostStay = false,
  sourceBookingId,
  variant = "default",
  size = "default",
  className,
  onVouchSaved,
}: VouchButtonProps) {
  const [open, setOpen] = useState(false);
  const [existingVouch, setExistingVouch] = useState<ExistingVouch | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOwnProfile) {
      setLoading(false);
      return;
    }
    fetch(`/api/vouches?targetId=${targetId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.vouch) {
          setExistingVouch(data.vouch);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [targetId, isOwnProfile]);

  if (isOwnProfile || loading) return null;

  const firstName = targetName.split(" ")[0];
  const label = existingVouch
    ? `Update vouch for ${firstName}`
    : `Vouch for ${firstName}`;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Shield className="h-4 w-4" />
        {label}
      </Button>
      <VouchModal
        open={open}
        onOpenChange={setOpen}
        target={{
          id: targetId,
          name: targetName,
          avatar_url: targetAvatar,
        }}
        existingVouch={existingVouch}
        isPostStay={isPostStay}
        sourceBookingId={sourceBookingId}
        onVouchSaved={(score) => {
          // Refresh existing vouch state
          fetch(`/api/vouches?targetId=${targetId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
              if (data?.vouch) setExistingVouch(data.vouch);
            })
            .catch(() => {});
          onVouchSaved?.(score);
        }}
        onVouchRemoved={() => {
          setExistingVouch(null);
        }}
      />
    </>
  );
}
