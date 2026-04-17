"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

interface Props {
  pricePerNight: number;
  avgRating: number | null;
  reviewCount: number;
  /** When false, the price + Reserve cluster is suppressed because the
   *  viewer is gated out of requesting to book. */
  canBook?: boolean;
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
export function StickyAnchorBar({
  pricePerNight,
  avgRating,
  reviewCount,
  canBook = true,
}: Props) {
  const [mounted, setMounted] = useState(false);
  // Two-stage visibility: anchors appear once scrolled past the photo
  // gallery, then price+Reserve gets added once scrolled past the booking
  // sidebar's reserve button.
  const [showAnchors, setShowAnchors] = useState(false);
  const [showReserve, setShowReserve] = useState(false);
  const [hasDates, setHasDates] = useState(false);
  const [dateLabel, setDateLabel] = useState("");
  const [centerSlot, setCenterSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setCenterSlot(document.getElementById("nav-center-slot"));
  }, []);

  // Track whether dates have been selected by observing the booking sidebar's
  // reserve button `disabled` state.
  // Listen for booking-range-change events from BookingSidebar to keep
  // hasDates + dateLabel in sync.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ label: string; hasRange: boolean }>)
        .detail;
      if (!detail) return;
      setHasDates(detail.hasRange);
      setDateLabel(detail.label);
    };
    window.addEventListener("booking-range-change", handler);
    return () => window.removeEventListener("booking-range-change", handler);
  }, []);

  // Observe the photo gallery bottom — anchors appear as soon as user
  // scrolls past photos.
  useEffect(() => {
    const sentinel = document.getElementById("photos-sentinel");
    if (!sentinel) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setShowAnchors(entry.boundingClientRect.top < 0 && !entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "0px" }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  // Observe the end of the booking grid — price+Reserve joins the bar
  // only after the original reserve card has scrolled out of view.
  useEffect(() => {
    const sentinel = document.getElementById("booking-sentinel");
    if (!sentinel) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setShowReserve(entry.boundingClientRect.top < 0 && !entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "0px" }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  // Toggle a flag on <html> so DesktopNav can hide primary-nav contents at
  // narrow viewports while the sticky nav is active.
  useEffect(() => {
    const el = document.documentElement;
    if (showAnchors) el.classList.add("listing-sticky-active");
    else el.classList.remove("listing-sticky-active");
    return () => el.classList.remove("listing-sticky-active");
  }, [showAnchors]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const reserve = () => {
    document.getElementById("booking-reserve")?.click();
  };

  const selectDates = () => {
    document
      .getElementById("booking-card")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (!mounted || !showAnchors) return null;

  // Single portaled row constrained to the listing content width (1280).
  // Section anchors appear first (post-photos); price + Reserve joins
  // once the user has scrolled past the booking sidebar.
  const barContent = (
    <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-6 px-6">
      <nav className="hidden items-center gap-8 text-sm font-medium lg:flex">
        <button onClick={() => scrollTo("photos")} className="py-2 hover:text-foreground/70">Photos</button>
        <button onClick={() => scrollTo("amenities")} className="py-2 hover:text-foreground/70">Amenities</button>
        <button onClick={() => scrollTo("reviews")} className="py-2 hover:text-foreground/70">Reviews</button>
        <button onClick={() => scrollTo("location")} className="py-2 hover:text-foreground/70">Location</button>
      </nav>
      {showReserve && canBook && (
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[15px] font-semibold">${pricePerNight} <span className="font-normal text-muted-foreground">night</span></div>
            {hasDates && dateLabel ? (
              <div className="text-xs text-muted-foreground underline">
                {dateLabel}
              </div>
            ) : (
              avgRating && reviewCount > 0 && (
                <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-foreground text-foreground" />
                  <span className="font-semibold text-foreground">{avgRating.toFixed(2)}</span>
                  <span>·</span>
                  <span>{reviewCount} reviews</span>
                </div>
              )
            )}
          </div>
          {hasDates ? (
            <Button
              onClick={reserve}
              className="h-10 rounded-lg bg-brand px-6 font-semibold text-white hover:bg-brand-600"
            >
              Contact Host
            </Button>
          ) : (
            <button
              type="button"
              onClick={selectDates}
              className="h-10 rounded-lg px-4 text-sm font-semibold text-foreground underline underline-offset-2 hover:text-brand"
            >
              Select dates
            </button>
          )}
        </div>
      )}
    </div>
  );

  return centerSlot ? createPortal(barContent, centerSlot) : null;
}
