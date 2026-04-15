"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Heart, ChevronLeft, ChevronRight, Lock, Star } from "lucide-react";
import { toast } from "sonner";
import type { BrowseListing } from "@/lib/browse-data";
import { SaveToWishlistDialog } from "@/components/wishlist/save-to-wishlist-dialog";
import { TrustBadge } from "@/components/trust-badge";
import { GatedListingDialog } from "./gated-listing-dialog";
import type { BrowseListingTrust } from "./browse-layout";

const PLACEHOLDER =
  "https://placehold.co/600x400/e2e8f0/475569?text=No+photo";

interface Props {
  listing: BrowseListing;
  /** Initial saved state for the heart button. True if the listing is
   *  in any of the signed-in user's wishlists. */
  initialSaved?: boolean;
  /** Called after the user makes changes in the wishlist picker. */
  onSaveChange?: (listingId: string, saved: boolean) => void;
  /** Viewer's trust info for this listing's host. */
  trust?: BrowseListingTrust;
  /** True if the viewer is signed in. */
  isSignedIn?: boolean;
}

export function LiveListingCard({
  listing,
  initialSaved = false,
  onSaveChange,
  trust,
  isSignedIn = false,
}: Props) {
  const images = listing.photos.length
    ? listing.photos.map((p) => p.public_url)
    : [PLACEHOLDER];

  const [currentImage, setCurrentImage] = useState(0);
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gateDialogOpen, setGateDialogOpen] = useState(false);

  const canSeeFull = trust?.canSeeFull ?? true;

  const prev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImage((i) => (i === 0 ? images.length - 1 : i - 1));
  };
  const next = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImage((i) => (i === images.length - 1 ? 0 : i + 1));
  };

  const openPicker = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Quick auth check — if the user isn't signed in, nudge them
    // without opening an empty dialog.
    try {
      const probe = await fetch("/api/wishlists?listingId=" + listing.id);
      if (probe.status === 401) {
        toast.error("Sign in to save listings");
        return;
      }
    } catch {
      toast.error("Network error");
      return;
    }
    setDialogOpen(true);
  };

  const rating = listing.avg_listing_rating ?? 0;
  const price = listing.price_min ?? listing.price_max ?? 0;

  // ─────────────────────────────────────────────────────────────
  // Gated variant — viewer can't access this listing yet.
  // Blurred photo, hidden title, overlay CTA that opens a modal.
  // ─────────────────────────────────────────────────────────────
  if (!canSeeFull) {
    const mutuals = trust?.mutualConnections ?? [];
    const openGate = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setGateDialogOpen(true);
    };
    return (
      <>
        <button
          type="button"
          onClick={openGate}
          className="group block w-full text-left"
          aria-label="Private listing — requires trust connection"
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[0]}
              alt="Private listing"
              className="h-full w-full scale-110 object-cover blur-lg"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-black/5" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/40 backdrop-blur">
                <Lock className="h-4 w-4" />
              </div>
              <div className="text-sm font-semibold drop-shadow">
                Private listing
              </div>
              <div className="text-xs text-white/90 drop-shadow">
                Requires trust connection
              </div>
            </div>
            {trust && trust.score > 0 && (
              <div className="absolute left-3 top-3">
                <TrustBadge score={trust.score} size="sm" />
              </div>
            )}
          </div>

          <div className="mt-3">
            <h3 className="font-semibold text-foreground leading-tight line-clamp-1">
              {listing.area_name}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {mutuals.length > 0
                ? `${mutuals.length} of your connections could introduce you`
                : isSignedIn
                  ? "Not connected yet"
                  : "Sign in to see your connection"}
            </p>
          </div>
        </button>

        <GatedListingDialog
          open={gateDialogOpen}
          onOpenChange={setGateDialogOpen}
          listing={listing}
          trust={trust}
          isSignedIn={isSignedIn}
        />
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Standard variant — viewer has full access.
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <Link href={`/listings/${listing.id}`} className="group block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[currentImage]}
            alt={listing.title}
            className="h-full w-full object-cover"
          />

          {trust && trust.score > 0 && (
            <div className="absolute left-3 top-3">
              <TrustBadge score={trust.score} size="sm" />
            </div>
          )}

          <button
            onClick={openPicker}
            aria-label={
              isSaved ? "Edit wishlists for this listing" : "Save to wishlist"
            }
            aria-pressed={isSaved}
            className="absolute right-3 top-3 z-10"
          >
            <Heart
              className={cn(
                "h-6 w-6 drop-shadow-md transition-colors",
                isSaved ? "fill-red-500 text-red-500" : "fill-black/30 text-white"
              )}
            />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={prev}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1 opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={next}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1 opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-colors",
                      i === currentImage ? "bg-white" : "bg-white/50"
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground leading-tight line-clamp-1">
              {listing.area_name}
            </h3>
            {rating > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
                <span>{rating.toFixed(2)}</span>
              </div>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
            {listing.title}
          </p>
          {listing.host && (
            <p className="text-sm text-muted-foreground">
              Hosted by {listing.host.name}
            </p>
          )}
          <p className="mt-1">
            <span className="font-semibold">${price}</span>
            <span className="text-muted-foreground"> night</span>
          </p>
        </div>
      </Link>

      <SaveToWishlistDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        listingId={listing.id}
        listingTitle={listing.title}
        onSaved={(savedIn) => {
          const saved = savedIn.length > 0;
          setIsSaved(saved);
          onSaveChange?.(listing.id, saved);
        }}
      />
    </>
  );
}
