"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

interface Props {
  pricePerNight: number;
  avgRating: number | null;
  reviewCount: number;
}

/**
 * Airbnb-style morphing header content for the listing page. When the user
 * scrolls past the booking grid (tracked via `#booking-sentinel`), this
 * component portals:
 *  - Section anchor links into `#nav-center-slot` in DesktopNav
 *  - Price + Reserve button into `#nav-right-slot` in DesktopNav
 * When not scrolled past, both slots are empty and DesktopNav shows only
 * the logo/user controls. The Reserve button delegates a click to the
 * actual booking sidebar button so all state stays in one place.
 */
export function StickyAnchorBar({ pricePerNight, avgRating, reviewCount }: Props) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [centerSlot, setCenterSlot] = useState<HTMLElement | null>(null);
  const [rightSlot, setRightSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setCenterSlot(document.getElementById("nav-center-slot"));
    setRightSlot(document.getElementById("nav-right-slot"));
  }, []);

  useEffect(() => {
    const sentinel = document.getElementById("booking-sentinel");
    if (!sentinel) return;
    const io = new IntersectionObserver(
      ([entry]) => {
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

  if (!mounted || !visible) return null;

  const centerContent = (
    <nav className="hidden items-center gap-8 text-sm font-medium lg:flex">
      <button onClick={() => scrollTo("photos")} className="py-2 hover:text-foreground/70">Photos</button>
      <button onClick={() => scrollTo("amenities")} className="py-2 hover:text-foreground/70">Amenities</button>
      <button onClick={() => scrollTo("reviews")} className="py-2 hover:text-foreground/70">Reviews</button>
      <button onClick={() => scrollTo("location")} className="py-2 hover:text-foreground/70">Location</button>
    </nav>
  );

  const rightContent = (
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
        className="h-10 rounded-lg bg-brand px-6 font-semibold text-white hover:bg-brand-600"
      >
        Reserve
      </Button>
    </div>
  );

  return (
    <>
      {centerSlot && createPortal(centerContent, centerSlot)}
      {rightSlot && createPortal(rightContent, rightSlot)}
    </>
  );
}
