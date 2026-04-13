"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";
import { TrustBadge } from "@/components/trust-badge";

export interface ListingCardProps {
  id: string;
  title: string;
  location: string;
  images: string[];
  pricePerNight: number;
  rating: number | null;
  reviewCount: number;
  isFavorited: boolean;
  trustScore: number | null;
  connectionLabel: string | null;
  category: string;
  onFavoriteToggle?: (id: string) => void;
}

export function ListingCard({
  id,
  title,
  location,
  images,
  pricePerNight,
  rating,
  reviewCount,
  isFavorited,
  trustScore,
  connectionLabel,
  onFavoriteToggle,
}: ListingCardProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [activeIndex, setActiveIndex] = useState(0);
  const [favorited, setFavorited] = useState(isFavorited);

  const scrollPrev = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      emblaApi?.scrollPrev();
    },
    [emblaApi]
  );

  const scrollNext = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      emblaApi?.scrollNext();
    },
    [emblaApi]
  );

  const handleSelect = useCallback(() => {
    if (!emblaApi) return;
    setActiveIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  // Attach select listener
  useState(() => {
    if (emblaApi) emblaApi.on("select", handleSelect);
  });

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorited((f) => !f);
    onFavoriteToggle?.(id);
  };

  return (
    <Link href={`/listing/${id}`} className="group block">
      {/* Image carousel */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-surface">
        <div ref={emblaRef} className="h-full overflow-hidden">
          <div className="flex h-full">
            {images.map((src, i) => (
              <div key={i} className="flex-[0_0_100%] min-w-0 relative h-full">
                <Image
                  src={src}
                  alt={`${title} photo ${i + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Favorite button */}
        <button
          onClick={handleFavorite}
          className="absolute top-3 right-3 z-10"
          aria-label={favorited ? "Remove from wishlist" : "Save to wishlist"}
        >
          <Heart
            className={cn(
              "h-6 w-6 drop-shadow-md transition-colors",
              favorited
                ? "fill-danger text-danger"
                : "fill-black/30 text-white hover:fill-black/50"
            )}
          />
        </button>

        {/* Trust badge */}
        {trustScore !== null && (
          <div className="absolute bottom-3 right-3 z-10">
            <TrustBadge score={trustScore} size="sm" />
          </div>
        )}

        {/* Carousel arrows (desktop hover) */}
        {images.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:scale-105"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-4 w-4 text-foreground" />
            </button>
            <button
              onClick={scrollNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:scale-105"
              aria-label="Next photo"
            >
              <ChevronRight className="h-4 w-4 text-foreground" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  i === activeIndex ? "bg-white" : "bg-white/50"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="mt-3 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground line-clamp-1">
            {location}
          </h3>
          {rating !== null && (
            <div className="flex items-center gap-1 shrink-0 text-sm">
              <svg
                className="h-3.5 w-3.5 text-foreground"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
              {reviewCount > 0 && (
                <span className="text-muted-foreground">({reviewCount})</span>
              )}
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-1">{title}</p>

        {connectionLabel && (
          <p className="text-sm text-brand font-medium">{connectionLabel}</p>
        )}

        <p className="text-base pt-1">
          <span className="font-semibold">${pricePerNight}</span>
          <span className="text-muted-foreground"> night</span>
        </p>
      </div>
    </Link>
  );
}
