"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Grid3x3, X } from "lucide-react";
import { cn } from "@/lib/utils";

const PLACEHOLDER =
  "https://placehold.co/1200x800/e2e8f0/475569?text=No+photo";

interface Props {
  photos: { public_url: string }[];
  title: string;
}

export function PhotoGallery({ photos, title }: Props) {
  const images = photos.length
    ? photos.map((p) => p.public_url)
    : [PLACEHOLDER];

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Lightbox is now a long vertical scroll of all photos — just open it;
  // the user scrolls through the stack. No internal index to track.
  const open = () => setLightboxOpen(true);

  const carouselPrev = () =>
    setCarouselIndex((i) => (i - 1 + images.length) % images.length);
  const carouselNext = () =>
    setCarouselIndex((i) => (i + 1) % images.length);

  return (
    <>
      {/* Desktop grid — adapts to photo count */}
      <div className="relative hidden md:block">
        {images.length >= 4 ? (
          // 4-col × 2-row grid. Hero takes left half (2×2). Right half
          // holds thumbnails:
          //   - 4 photos total (3 thumbs): top row = 2 single thumbs,
          //     bottom row = 1 wide thumb (col-span-2). No empty cells.
          //   - 5+ photos (4 thumbs): all 4 single cells, classic layout.
          <div className="grid h-[420px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-xl lg:h-[480px]">
            <button
              onClick={() => open()}
              className="relative col-span-2 row-span-2 overflow-hidden bg-muted group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[0]} alt={`${title} — photo 1`} className="h-full w-full object-cover transition-opacity group-hover:opacity-90" />
            </button>
            {(images.length === 4 ? [1, 2, 3] : [1, 2, 3, 4]).map((i, idx, arr) => {
              // With exactly 4 images, the last thumb spans 2 cols to fill
              // the bottom-right row with no gap.
              const spanLast = images.length === 4 && idx === arr.length - 1;
              return (
                <button
                  key={i}
                  onClick={() => open()}
                  className={cn(
                    "relative overflow-hidden bg-muted group",
                    spanLast && "col-span-2"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={images[i]} alt={`${title} — photo ${i + 1}`} className="h-full w-full object-cover transition-opacity group-hover:opacity-90" />
                </button>
              );
            })}
          </div>
        ) : images.length === 3 ? (
          <div className="grid h-[420px] grid-cols-2 grid-rows-2 gap-2 overflow-hidden rounded-xl lg:h-[480px]">
            <button onClick={() => open()} className="relative row-span-2 overflow-hidden bg-muted group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[0]} alt={`${title} — photo 1`} className="h-full w-full object-cover transition-opacity group-hover:opacity-90" />
            </button>
            {[1, 2].map((i) => (
              <button key={i} onClick={() => open()} className="relative overflow-hidden bg-muted group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={images[i]} alt={`${title} — photo ${i + 1}`} className="h-full w-full object-cover transition-opacity group-hover:opacity-90" />
              </button>
            ))}
          </div>
        ) : images.length === 2 ? (
          <div className="grid h-[420px] grid-cols-2 gap-2 overflow-hidden rounded-xl lg:h-[480px]">
            {[0, 1].map((i) => (
              <button key={i} onClick={() => open()} className="relative overflow-hidden bg-muted group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={images[i]} alt={`${title} — photo ${i + 1}`} className="h-full w-full object-cover transition-opacity group-hover:opacity-90" />
              </button>
            ))}
          </div>
        ) : (
          <div className="h-[420px] overflow-hidden rounded-xl lg:h-[480px]">
            <button onClick={() => open()} className="relative h-full w-full overflow-hidden bg-muted group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[0]} alt={`${title} — photo 1`} className="h-full w-full object-cover transition-opacity group-hover:opacity-90" />
            </button>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => open()}
          className="absolute bottom-4 right-4 h-9 gap-2 rounded-lg border-foreground/20 bg-white font-semibold shadow-sm hover:bg-white"
        >
          <Grid3x3 className="h-4 w-4" />
          Show all photos
        </Button>
      </div>

      {/* Mobile carousel */}
      <div className="relative md:hidden">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[carouselIndex]}
            alt={`${title} — photo ${carouselIndex + 1}`}
            className="h-full w-full object-cover"
            onClick={() => open()}
          />
          {images.length > 1 && (
            <>
              <button
                onClick={carouselPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow"
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={carouselNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow"
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-colors",
                      i === carouselIndex ? "bg-white" : "bg-white/50"
                    )}
                  />
                ))}
              </div>
              <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                {carouselIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lightbox — all photos stacked vertically in a scroll container.
          No arrow nav; user just scrolls. Close button is a big, obvious
          circle in the top-right that stays pinned over the scroll. */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          showCloseButton={false}
          className="inset-0 left-0 top-0 h-[100dvh] max-w-none w-screen translate-x-0 translate-y-0 gap-0 overflow-hidden border-0 bg-black p-0 ring-0 rounded-none sm:max-w-none"
        >
          {/* Sticky close button — top right, always visible on top of
              the scroll contents with a subtle background so it's
              discoverable over any photo. */}
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close photos"
            className="fixed right-4 top-4 z-[80] flex h-11 w-11 items-center justify-center rounded-full bg-white text-foreground shadow-lg hover:bg-white/90"
            style={{ top: "calc(1rem + env(safe-area-inset-top))" }}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Scrollable photo column */}
          <div
            className="h-[100dvh] w-full overflow-y-auto overscroll-contain bg-black"
            style={{
              paddingTop: "calc(1rem + env(safe-area-inset-top))",
              paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
            }}
          >
            <div className="mx-auto flex max-w-4xl flex-col gap-3 px-3 md:gap-4 md:px-6">
              <h2 className="sr-only">{title} — photos</h2>
              {images.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="w-full overflow-hidden rounded-lg bg-black/50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${title} — photo ${i + 1}`}
                    className="block h-auto w-full object-contain"
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
