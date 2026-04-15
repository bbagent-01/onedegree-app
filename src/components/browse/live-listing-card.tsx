"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Heart, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { toast } from "sonner";
import type { BrowseListing } from "@/lib/browse-data";

const PLACEHOLDER =
  "https://placehold.co/600x400/e2e8f0/475569?text=No+photo";

interface Props {
  listing: BrowseListing;
  /** Initial saved state for the heart button. */
  initialSaved?: boolean;
  /** Called with new saved state after a successful toggle. */
  onSaveChange?: (listingId: string, saved: boolean) => void;
}

export function LiveListingCard({
  listing,
  initialSaved = false,
  onSaveChange,
}: Props) {
  const images = listing.photos.length
    ? listing.photos.map((p) => p.public_url)
    : [PLACEHOLDER];

  const [currentImage, setCurrentImage] = useState(0);
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

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

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    // Optimistic update — flip immediately, rollback on error.
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    setPending(true);

    try {
      const res = await fetch("/api/wishlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });
      if (res.status === 401) {
        setIsSaved(!nextSaved);
        toast.error("Sign in to save listings");
        return;
      }
      if (!res.ok) {
        setIsSaved(!nextSaved);
        toast.error("Couldn't update wishlist");
        return;
      }
      const data = (await res.json()) as { saved: boolean };
      setIsSaved(data.saved);
      onSaveChange?.(listing.id, data.saved);
    } catch {
      setIsSaved(!nextSaved);
      toast.error("Network error");
    } finally {
      setPending(false);
    }
  };

  const rating = listing.avg_listing_rating ?? 0;
  const price = listing.price_min ?? listing.price_max ?? 0;

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[currentImage]}
          alt={listing.title}
          className="h-full w-full object-cover"
        />

        <button
          onClick={toggleSave}
          aria-label={isSaved ? "Remove from wishlist" : "Save to wishlist"}
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
  );
}
