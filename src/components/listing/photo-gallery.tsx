"use client";

import { useEffect, useState, useCallback } from "react";
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
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const open = (idx: number) => {
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };

  const next = useCallback(
    () => setLightboxIndex((i) => (i + 1) % images.length),
    [images.length]
  );
  const prev = useCallback(
    () => setLightboxIndex((i) => (i - 1 + images.length) % images.length),
    [images.length]
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, next, prev]);

  const carouselPrev = () =>
    setCarouselIndex((i) => (i - 1 + images.length) % images.length);
  const carouselNext = () =>
    setCarouselIndex((i) => (i + 1) % images.length);

  return (
    <>
      {/* Desktop grid */}
      <div className="relative hidden md:block">
        <div className="grid h-[420px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-xl lg:h-[480px]">
          <button
            onClick={() => open(0)}
            className="relative col-span-2 row-span-2 overflow-hidden bg-muted group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[0]}
              alt={`${title} — photo 1`}
              className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
            />
          </button>
          {[1, 2, 3, 4].map((i) => (
            <button
              key={i}
              onClick={() => open(Math.min(i, images.length - 1))}
              className="relative overflow-hidden bg-muted group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[i] ?? images[images.length - 1]}
                alt={`${title} — photo ${i + 1}`}
                className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
              />
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => open(0)}
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
            onClick={() => open(carouselIndex)}
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

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          showCloseButton={false}
          className="h-screen max-w-none w-screen gap-0 border-0 bg-black p-0 rounded-none sm:max-w-none"
        >
          <div className="relative flex h-full w-full flex-col">
            <div className="flex items-center justify-between px-4 py-3 text-white">
              <button
                onClick={() => setLightboxOpen(false)}
                className="flex items-center gap-2 rounded-full p-2 hover:bg-white/10"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="text-sm">
                {lightboxIndex + 1} / {images.length}
              </div>
              <div className="w-9" />
            </div>

            <div className="relative flex flex-1 items-center justify-center px-2 pb-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[lightboxIndex]}
                alt={`${title} — photo ${lightboxIndex + 1}`}
                className="max-h-full max-w-full object-contain"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={next}
                    className="absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
