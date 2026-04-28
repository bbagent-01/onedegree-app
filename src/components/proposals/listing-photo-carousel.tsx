"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  photos: string[];
  title: string;
}

/**
 * Minimal photo carousel used inside a Host Offer card's visual pane.
 * Click/tap the right/left chevrons to cycle through the linked
 * listing's photos. Keeps arrows hidden on a single-photo listing so
 * the card doesn't show dead affordances.
 */
export function ListingPhotoCarousel({ photos, title }: Props) {
  const [idx, setIdx] = useState(0);
  const safePhotos = photos.length > 0 ? photos : [];
  const current = safePhotos[idx] ?? safePhotos[0];

  const advance = (e: React.MouseEvent, delta: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx((i) => (i + delta + safePhotos.length) % safePhotos.length);
  };

  return (
    <div className="relative h-56 w-full overflow-hidden bg-muted md:h-full md:min-h-[260px]">
      {current && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current}
          alt={title}
          className="h-full w-full object-cover"
        />
      )}
      {safePhotos.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => advance(e, -1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-foreground shadow hover:bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => advance(e, 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-foreground shadow hover:bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
            {safePhotos.map((_, i) => (
              <span
                key={i}
                className={
                  i === idx
                    ? "block h-1.5 w-4 rounded-full bg-white/95"
                    : "block h-1.5 w-1.5 rounded-full bg-white/60"
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
