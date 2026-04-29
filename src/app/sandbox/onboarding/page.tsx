"use client";

import { useEffect, useRef, useState } from "react";
import { Home, Users, Shield, ArrowLeft, ArrowRight } from "lucide-react";

type Slide = {
  icon: typeof Home;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: Home,
    title: "Trustead is invitation-only home rental",
    body: "A small, private network of homes opened up to people inside it. No public listings, no cold bookings — every stay starts from a personal connection.",
  },
  {
    icon: Users,
    title: "Trust comes from people you actually know",
    body: "Your degree of separation from a host or guest is what unlocks a stay. The closer your tie, the more you can do here.",
  },
  {
    icon: Shield,
    title: "Find a place. Vouch for a friend. Stay safer.",
    body: "Browse homes hosted by your network. Vouch for friends to bring them in. Every booking strengthens the web you stay inside of.",
  },
];

const SWIPE_THRESHOLD_PX = 50;

export default function SandboxOnboardingPage() {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const isLast = index === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      setDismissed(true);
      return;
    }
    setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
  };

  const prev = () => {
    setIndex((i) => Math.max(i - 1, 0));
  };

  const skip = () => setDismissed(true);

  useEffect(() => {
    if (dismissed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismissed, isLast]);

  if (dismissed) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-background px-6 text-center text-foreground">
        <p className="font-mono text-sm text-muted-foreground">
          Sandbox dismissed (in-memory only — refresh to reset)
        </p>
      </main>
    );
  }

  const slide = SLIDES[index];
  const Icon = slide.icon;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const dx = end - start;
    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  return (
    <main
      className="relative flex h-screen w-screen flex-col bg-background text-foreground"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        type="button"
        onClick={skip}
        className="absolute right-5 top-5 z-20 rounded-pill px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground sm:right-8 sm:top-8"
      >
        Skip
      </button>

      {index > 0 && (
        <button
          type="button"
          onClick={prev}
          aria-label="Previous slide"
          className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-pill border border-border bg-secondary p-3 text-foreground transition hover:bg-accent sm:left-8"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}

      <button
        type="button"
        onClick={next}
        aria-label={isLast ? "Get started" : "Next slide"}
        className={
          isLast
            ? "absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-pill bg-brand-300 px-5 py-3 text-sm font-semibold text-brand-foreground shadow-card transition hover:bg-brand-400 sm:right-8"
            : "absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-pill bg-brand-300 p-3 text-brand-foreground shadow-card transition hover:bg-brand-400 sm:right-8"
        }
      >
        {isLast ? "Get started" : <ArrowRight className="h-5 w-5" />}
      </button>

      <div className="flex flex-1 items-center justify-center px-6">
        <div className="flex max-w-xl flex-col items-center gap-8 text-center">
          {/* ILLUSTRATION SLOT — Lucide placeholder, swap with real artwork later */}
          <div className="flex h-32 w-32 items-center justify-center rounded-full border border-border bg-secondary">
            <Icon className="h-14 w-14 text-brand-300" strokeWidth={1.5} />
          </div>

          <h1 className="font-serif text-3xl leading-tight sm:text-4xl">
            {slide.title}
          </h1>

          <p className="text-base text-muted-foreground sm:text-lg">
            {slide.body}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 pb-10">
        {SLIDES.map((_, i) => (
          <span
            key={i}
            aria-label={`Slide ${i + 1}${i === index ? " (current)" : ""}`}
            className={
              i === index
                ? "h-2 w-6 rounded-pill bg-brand-300 transition-all"
                : "h-2 w-2 rounded-pill bg-border transition-all"
            }
          />
        ))}
      </div>
    </main>
  );
}
