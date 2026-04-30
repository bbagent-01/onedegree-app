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

const INTRO_DURATION_MS = 2000;
const SWIPE_THRESHOLD_PX = 50;

type Phase = "intro" | "slides" | "dismissed";

export default function SandboxOnboardingPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const isLast = index === SLIDES.length - 1;

  useEffect(() => {
    if (phase !== "intro") return;
    const t = setTimeout(() => setPhase("slides"), INTRO_DURATION_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const next = () => {
    if (isLast) {
      setPhase("dismissed");
      return;
    }
    setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
  };

  const prev = () => {
    setIndex((i) => Math.max(i - 1, 0));
  };

  const skip = () => setPhase("dismissed");
  const skipIntro = () => setPhase("slides");

  useEffect(() => {
    if (phase === "dismissed") return;
    const onKey = (e: KeyboardEvent) => {
      if (phase === "intro") {
        skipIntro();
        return;
      }
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, isLast]);

  if (phase === "dismissed") {
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
    if (phase === "intro") return;
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (phase === "intro") {
      skipIntro();
      return;
    }
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
      className="sandbox-onboarding-root relative flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={phase === "intro" ? skipIntro : undefined}
    >
      {/* Plain <style> tag (not styled-jsx) — keeps webpack compile fast and
          the rules are scoped via the .sandbox-onboarding-root class name.
          Hides the global cookie banner only on this takeover surface. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes sb-fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes sb-intro-hold { 0%, 85% { opacity: 1; } 100% { opacity: 0; } }
            .sandbox-onboarding-root .anim-step { opacity: 0; animation: sb-fade-up 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            .sandbox-onboarding-root .intro-overlay { animation: sb-intro-hold ${INTRO_DURATION_MS}ms ease-out forwards; }
            body:has(.sandbox-onboarding-root) > div.fixed.inset-x-0.bottom-0.z-40 { display: none !important; }
            @media (prefers-reduced-motion: reduce) {
              .sandbox-onboarding-root .anim-step,
              .sandbox-onboarding-root .intro-overlay {
                animation: none !important;
                opacity: 1 !important;
                transform: none !important;
              }
            }
          `,
        }}
      />

      {phase === "intro" && (
        <div className="intro-overlay absolute inset-0 z-30 flex items-center justify-center bg-background px-6">
          <iframe
            src="/assets/logo-animation/trustead-logo-animation.html"
            className="w-full max-w-md border-0"
            style={{ aspectRatio: "3446 / 845" }}
            tabIndex={-1}
            title="Trustead animated logo"
          />
        </div>
      )}

      {phase === "slides" && (
        <>
          <button
            type="button"
            onClick={skip}
            className="absolute right-5 top-5 z-20 rounded-pill px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground sm:right-8 sm:top-8"
          >
            Skip
          </button>

          <div
            key={index}
            className="flex flex-1 items-center justify-center px-6 pb-32 pt-16 sm:pb-28"
          >
            <div className="flex max-w-xl flex-col items-center gap-6 text-center sm:gap-8">
              {/* ILLUSTRATION SLOT — Lucide placeholder, swap with real artwork later */}
              <div
                className="anim-step flex h-32 w-32 items-center justify-center rounded-full border border-border bg-secondary"
                style={{ animationDelay: "0ms" }}
              >
                <Icon className="h-14 w-14 text-brand-300" strokeWidth={1.5} />
              </div>

              <h1
                className="anim-step font-serif text-3xl leading-tight sm:text-4xl"
                style={{ animationDelay: "120ms" }}
              >
                {slide.title}
              </h1>

              <p
                className="anim-step text-base text-muted-foreground sm:text-lg"
                style={{ animationDelay: "240ms" }}
              >
                {slide.body}
              </p>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 px-3 pb-10 sm:px-8 sm:pb-12">
            <div className="flex flex-1 justify-start">
              {index > 0 && (
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous slide"
                  className="rounded-pill border border-border bg-secondary p-3 text-foreground transition hover:bg-accent"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
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

            <div className="flex flex-1 justify-end">
              <button
                type="button"
                onClick={next}
                aria-label={isLast ? "Get started" : "Next slide"}
                className={
                  isLast
                    ? "rounded-pill bg-brand-300 px-5 py-3 text-sm font-semibold text-brand-foreground shadow-card transition hover:bg-brand-400"
                    : "rounded-pill bg-brand-300 p-3 text-brand-foreground shadow-card transition hover:bg-brand-400"
                }
              >
                {isLast ? "Get started" : <ArrowRight className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
