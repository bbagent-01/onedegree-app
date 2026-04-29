"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Home, Share2, Compass, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Slide = {
  icon: LucideIcon;
  heading: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: Home,
    heading: "Welcome to Trustead",
    body: "An invitation-only home rental platform built on real-life trust.",
  },
  {
    icon: Share2,
    heading: "How trust works",
    body: "Listings are visible only to people in your network. Stays only happen between people connected through someone they both trust.",
  },
  {
    icon: Compass,
    heading: "Get started",
    body: "Browse listings vouched into your network · Post a trip wish · Vouch for friends to grow your circle.",
  },
];

const SWIPE_THRESHOLD = 50;

export function OnboardingSwiper({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll while overlay is open. Without this, mobile users can
  // pan the page underneath the swiper.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const isLast = index === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      onClose();
    } else {
      setIndex((i) => i + 1);
    }
  };
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  // Arrow keys on desktop
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isLast]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  }
  function handleTouchMove(e: React.TouchEvent) {
    touchEndX.current = e.touches[0].clientX;
  }
  function handleTouchEnd() {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const dx = touchEndX.current - touchStartX.current;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  }

  if (!mounted) return null;

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Trustead"
      className="fixed inset-0 z-[100] flex flex-col bg-white overflow-hidden overscroll-contain"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Skip — always top-right, always visible */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Skip onboarding"
        className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground md:right-6 md:top-6"
      >
        Skip
        <X className="h-4 w-4" />
      </button>

      {/* Slide track — transform-based so swipe stays fluid and there is
          no horizontal page-scroll spillover. */}
      <div className="relative flex-1 overflow-hidden">
        <div
          className="flex h-full w-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {SLIDES.map((slide, i) => (
            <SlideView key={i} slide={slide} active={i === index} />
          ))}
        </div>
      </div>

      {/* Bottom rail — dots + primary CTA */}
      <div className="shrink-0 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 md:pb-8">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5">
          <div
            className="flex items-center gap-2"
            role="tablist"
            aria-label="Onboarding progress"
          >
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Go to slide ${i + 1} of ${SLIDES.length}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index ? "w-6 bg-brand" : "w-2 bg-border hover:bg-subtle"
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-brand px-6 text-base font-semibold text-brand-foreground shadow-sm transition-colors hover:bg-brand-600"
          >
            {isLast ? "Explore →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

function SlideView({ slide, active }: { slide: Slide; active: boolean }) {
  const Icon = slide.icon;
  return (
    <section
      aria-hidden={!active}
      className="flex h-full w-full shrink-0 flex-col items-center justify-center px-6 text-center"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        {/* ILLUSTRATION SLOT — swap to custom SVG later */}
        <div
          aria-hidden
          className="flex h-40 w-40 items-center justify-center rounded-full bg-brand-50 md:h-48 md:w-48"
        >
          <Icon
            className="h-20 w-20 text-brand md:h-24 md:w-24"
            strokeWidth={1.5}
          />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {slide.heading}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
            {slide.body}
          </p>
        </div>
      </div>
    </section>
  );
}
