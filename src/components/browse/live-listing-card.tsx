"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Heart, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { toast } from "sonner";
import type { BrowseListing } from "@/lib/browse-data";
import { SaveToWishlistDialog } from "@/components/wishlist/save-to-wishlist-dialog";
import { TrustTag } from "@/components/trust/trust-tag";
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
  const allImages = listing.photos.length
    ? listing.photos.map((p) => p.public_url)
    : [PLACEHOLDER];

  // Preview set: only host-curated `is_preview` photos. Used for the
  // gated card variant so locked viewers see the host's intended
  // teaser photos (or fall back to the placeholder).
  const previewSet = listing.photos
    .filter((p) => p.is_preview)
    .map((p) => p.public_url);
  const previewImages = previewSet.length > 0 ? previewSet : [PLACEHOLDER];

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

  const price = listing.price_min ?? listing.price_max ?? 0;

  // Choose which images set to use based on access level. The card
  // is now strictly binary (full or gated), so per-field preview
  // toggles (show_title, show_rating, etc.) no longer apply on the
  // browse grid — they still gate the listing-detail page render.
  const images = canSeeFull ? allImages : previewImages;

  // ─────────────────────────────────────────────────────────────
  // Gated card — anything short of full access. The middle "preview"
  // tier was previously surfaced as its own card variant (lock badge
  // + full metadata), which read as the gate logic being broken
  // (S11.pre.3 D-Obs2). Browse cards are now strictly binary: fully
  // unlocked OR locked. The preview-tier listing detail page still
  // exists at /listings/[id] for hosts who configured one — it's
  // just no longer mirrored on the browse grid.
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
              src={allImages[0]}
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
            {trust && (
              <div className="mt-1.5 flex items-center gap-2">
                <TrustTag
                  size="micro"
                  score={trust.trust_score}
                  degree={trust.degree}
                  direct={trust.hasDirectVouch}
                  connectorPaths={trust.connectorPaths}
                />
              </div>
            )}
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
  // Full variant — viewer has full access.
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
          <h3 className="font-semibold text-foreground leading-tight line-clamp-1">
            {listing.area_name}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
            {listing.title}
          </p>
          {listing.host && (
            <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
              Hosted by {listing.host.name.split(" ")[0]}
            </p>
          )}
          {trust && (
            <div className="mt-1">
              <TrustTag
                size="micro"
                score={trust.trust_score}
                degree={trust.degree}
                direct={trust.hasDirectVouch}
                connectorPaths={trust.connectorPaths}
                hostRating={listing.host?.host_rating ?? null}
                hostReviewCount={listing.host?.host_review_count ?? 0}
              />
            </div>
          )}
          <p className="mt-1">
            <span className="font-semibold">${price}</span>
            <span className="text-muted-foreground"> night</span>
          </p>
        </div>
      </Link>

      {/* Trust indicator placeholder (wired in CC-C4) */}
      <div data-trust-indicator className="hidden" />

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
