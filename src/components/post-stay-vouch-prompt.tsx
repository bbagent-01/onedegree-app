"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { VouchModal } from "@/components/vouch/VouchModal";
import { Shield } from "lucide-react";

interface PostStayVouchPromptProps {
  guestId: string;
  guestName: string;
  stayConfirmationId: string;
}

export function PostStayVouchPrompt({
  guestId,
  guestName,
  stayConfirmationId,
}: PostStayVouchPromptProps) {
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [vouched, setVouched] = useState(false);

  if (dismissed || vouched) {
    return vouched ? (
      <div className="rounded-xl border border-trust-solid/20 bg-trust-solid/5 p-4 text-center">
        <p className="text-sm font-medium text-trust-solid">
          Vouch submitted for {guestName}!
        </p>
      </div>
    ) : null;
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-white p-4">
        <p className="text-sm font-medium text-foreground mb-1">
          Vouch for {guestName}?
        </p>
        <p className="text-xs text-foreground-secondary mb-3">
          Would you like to vouch for {guestName} to your network? This is
          optional — a good review doesn&apos;t have to mean an endorsement.
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Shield className="size-3.5 mr-1" />
            Yes, vouch
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDismissed(true)}>
            No thanks
          </Button>
        </div>
      </div>

      {showModal && (
        <VouchModal
          targetUserId={guestId}
          targetName={guestName}
          lockedYearsKnownBucket="lt1yr"
          stayConfirmationId={stayConfirmationId}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            setVouched(true);
          }}
        />
      )}
    </>
  );
}
