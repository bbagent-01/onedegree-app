"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrustGate } from "@/components/trust/trust-gate";
import type { BrowseListing } from "@/lib/browse-data";
import type { BrowseListingTrust } from "./browse-layout";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: BrowseListing;
  trust?: BrowseListingTrust;
  isSignedIn?: boolean;
}

/**
 * Explains why a listing is gated and lets the viewer either sign in
 * (if logged out) or see who could introduce them (if logged in).
 */
export function GatedListingDialog({
  open,
  onOpenChange,
  listing,
  trust,
  isSignedIn = false,
}: Props) {
  const score = trust?.score ?? 0;
  const required = listing.min_trust_gate;
  const mutuals = trust?.mutualConnections ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Private listing
            </span>
          </div>
          <DialogTitle className="mt-1 text-xl">
            Stay in {listing.area_name}
          </DialogTitle>
          <DialogDescription>
            One Degree B&amp;B listings are private by default — hosts choose
            how close a guest must be before seeing details.
          </DialogDescription>
        </DialogHeader>

        {isSignedIn ? (
          <TrustGate
            userScore={score}
            requiredScore={required}
            mutualConnections={mutuals}
            className="mt-2"
          />
        ) : (
          <div className="mt-2 rounded-2xl border border-border bg-muted/40 px-4 py-4 text-sm">
            <div className="font-semibold text-foreground">
              Sign in to see your connection
            </div>
            <p className="mt-0.5 text-muted-foreground">
              If you share friends with this host, you&apos;ll unlock the
              listing automatically.
            </p>
          </div>
        )}

        <div className="mt-2 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!isSignedIn && (
            <Link
              href="/sign-in"
              className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Sign in
            </Link>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
