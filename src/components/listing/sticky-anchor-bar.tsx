"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

interface Props {
  pricePerNight: number;
  avgRating: number | null;
  reviewCount: number;
}

/**
 * Airbnb-style sticky top bar that appears when the user scrolls past the
 * booking sidebar. Shows price, rating, section anchors, and Reserve.
 * Watches `#booking-sentinel` (placed at the top of the sidebar column) and
 * reveals itself once that sentinel scrolls above the viewport.
 */
export function StickyAnchorBar({ pricePerNight, avgRating, reviewCount }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById("booking-sentinel");
    if (!sentinel) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        // Reveal once sentinel has scrolled above the top of the viewport
        setVisible(entry.boundingClientRect.top < 0 && !entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "0px" }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const reserve = () => {
    document.getElementById("booking-reserve")?.click();
  };

  return (
    <div
      // Sits flush below the site header (sticky top-0 z-50 h-16). Needs
      // z > the map's leaflet panes (which top out around 800 in their own
      // container) — but the map will be `isolate`d, so z-[55] is enough.
      className={`pointer-events-none fixed inset-x-0 top-16 z-[55] hidden border-b border-border/60 bg-white transition-all duration-200 md:block ${
        visible ? "translate-y-0 opacity-100 pointer-events-auto" : "-translate-y-full opacity-0"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <nav className="flex items-center gap-6 text-sm font-medium">
          <button onClick={() => scrollTo("photos")} className="py-2 hover:text-foreground/70">Photos</button>
          <button onClick={() => scrollTo("amenities")} className="py-2 hover:text-foreground/70">Amenities</button>
          <button onClick={() => scrollTo("reviews")} className="py-2 hover:text-foreground/70">Reviews</button>
          <button onClick={() => scrollTo("location")} className="py-2 hover:text-foreground/70">Location</button>
        </nav>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[15px] font-semibold">${pricePerNight} <span className="font-normal text-muted-foreground">night</span></div>
            {avgRating && reviewCount > 0 && (
              <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-foreground text-foreground" />
                <span className="font-semibold text-foreground">{avgRating.toFixed(2)}</span>
                <span>·</span>
                <span>{reviewCount} reviews</span>
              </div>
            )}
          </div>
          <Button
            onClick={reserve}
            className="h-10 rounded-lg bg-[#E31C5F] px-6 font-semibold hover:bg-[#c01851]"
          >
            Reserve
          </Button>
        </div>
      </div>
    </div>
  );
}
