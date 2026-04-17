"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MockListing } from "@/lib/mock-listings";
import { TrustTag } from "./trust/trust-tag";
import { Heart, ChevronLeft, ChevronRight, Star } from "lucide-react";

interface ListingCardBProps {
  listing: MockListing;
  className?: string;
}

export function ListingCardB({ listing, className }: ListingCardBProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  function prevImage(e: React.MouseEvent) {
    e.preventDefault();
    setCurrentImage((i) => (i === 0 ? listing.images.length - 1 : i - 1));
  }

  function nextImage(e: React.MouseEvent) {
    e.preventDefault();
    setCurrentImage((i) => (i === listing.images.length - 1 ? 0 : i + 1));
  }

  return (
    <div className={cn("group", className)}>
      {/* Image carousel */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
        <img
          src={listing.images[currentImage]}
          alt={listing.title}
          className="h-full w-full object-cover transition-opacity duration-300"
        />

        {/* Heart / save button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setIsSaved(!isSaved);
          }}
          className="absolute right-3 top-3 z-10"
        >
          <Heart
            className={cn(
              "h-6 w-6 drop-shadow-md transition-colors",
              isSaved ? "fill-red-500 text-red-500" : "fill-black/30 text-white"
            )}
          />
        </button>

        {/* Trust badge */}
        <div className="absolute left-3 top-3 z-10">
          <TrustTag size="micro" score={listing.trustScore} degree={1} />
        </div>

        {/* Carousel arrows (show on hover) */}
        {listing.images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1 opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1 opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {listing.images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
            {listing.images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  i === currentImage ? "bg-white" : "bg-white/50"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mt-3">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-foreground leading-tight">{listing.location}</h3>
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
            <span>{listing.rating}</span>
          </div>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{listing.distance}</p>
        <p className="text-sm text-muted-foreground">{listing.dates}</p>
        {listing.connectionLabel && (
          <p className="mt-0.5 text-sm text-brand font-medium">{listing.connectionLabel}</p>
        )}
        <p className="mt-1">
          <span className="font-semibold">${listing.price}</span>
          <span className="text-muted-foreground"> night</span>
        </p>
      </div>
    </div>
  );
}
