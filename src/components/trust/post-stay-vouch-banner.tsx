"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { VouchModal } from "./vouch-modal";
import { Shield, X } from "lucide-react";

interface PostStayVouchBannerProps {
  targetId: string;
  targetName: string;
  targetAvatar?: string | null;
  /** Context label, e.g. "You stayed at Lakehouse Retreat" */
  contextLabel: string;
  bookingId: string;
  /** Called when vouch is saved */
  onVouchSaved?: (score: number) => void;
}

export function PostStayVouchBanner({
  targetId,
  targetName,
  targetAvatar,
  contextLabel,
  bookingId,
  onVouchSaved,
}: PostStayVouchBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [vouchOpen, setVouchOpen] = useState(false);
  const [vouched, setVouched] = useState(false);

  if (dismissed || vouched) return null;

  const firstName = targetName.split(" ")[0];

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-brand/20 bg-brand/5 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Shield className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {contextLabel}. Would you like to vouch for {firstName}?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vouching helps build their trust profile on 1&deg; B&B.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setVouchOpen(true)}>
                <Shield className="h-3.5 w-3.5" />
                Vouch for {firstName}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDismissed(true)}
                className="text-muted-foreground"
              >
                Not now
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <VouchModal
        open={vouchOpen}
        onOpenChange={setVouchOpen}
        target={{
          id: targetId,
          name: targetName,
          avatar_url: targetAvatar,
        }}
        isPostStay
        sourceBookingId={bookingId}
        onVouchSaved={(score) => {
          setVouched(true);
          onVouchSaved?.(score);
        }}
      />
    </>
  );
}
