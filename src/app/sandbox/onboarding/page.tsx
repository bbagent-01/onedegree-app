"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Slide = {
  title: React.ReactNode;
  body: string;
  Visual: React.ComponentType | null; // null = no visual on this slide
};

const SLIDES: Slide[] = [
  {
    // Mirrors the staytrustead.com landing hero verbatim, including the
    // italicized "trust" emphasis Loren uses on the live page.
    title: (
      <>
        Rent your home to people you can{" "}
        <span className="text-brand-300">trust</span>
      </>
    ),
    body: "Rent your primary home to friends of friends. Control who sees it on our private invite-only platform.",
    Visual: null,
  },
  {
    title: <>Build trust by vouching for people.</>,
    body: "A few seconds, and your circle grows.",
    Visual: NetworkVisual,
  },
  {
    title: <>Rent to people connected to you.</>,
    body: "See exactly how — through whom, and how strongly.",
    Visual: TrustDetailVisual,
  },
];

// Intro = logo draws in, holds, then reverse-draws out (in the iframe
// HTML). Total intro lifecycle: 0–2.85s drawing, +400ms buffer, then
// the slide phase takes over.
const INTRO_DURATION_MS = 3300;
const SWIPE_THRESHOLD_PX = 50;

// Animation tokens — tuned for a smoother, less-jerky feel per Loren's
// brightbase reference. Slower duration, expo.out easing, smaller
// stagger, larger Y travel = motion that settles instead of snaps.
const FADE_DURATION_MS = 1400;
const FADE_EASING = "cubic-bezier(0.19, 1, 0.22, 1)"; // expo.out
const FADE_Y_OFFSET_PX = 24;
const FADE_STAGGER_MS = 90;

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
  const Visual = slide.Visual;

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
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes sb-fade-up {
              from { opacity: 0; transform: translate3d(0, ${FADE_Y_OFFSET_PX}px, 0); }
              to   { opacity: 1; transform: translate3d(0, 0, 0); }
            }
            @keyframes sb-intro-hold {
              0%, 92% { opacity: 1; }
              100%    { opacity: 0; }
            }
            .sandbox-onboarding-root .anim-step {
              opacity: 0;
              will-change: opacity, transform;
              animation: sb-fade-up ${FADE_DURATION_MS}ms ${FADE_EASING} forwards;
            }
            .sandbox-onboarding-root .intro-overlay {
              animation: sb-intro-hold ${INTRO_DURATION_MS}ms linear forwards;
            }
            body:has(.sandbox-onboarding-root) > div.fixed.inset-x-0.bottom-0.z-40 {
              display: none !important;
            }
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
            src="/assets/logo-animation/trustead-logo-animation-white.html"
            className="w-full max-w-md border-0"
            style={{ aspectRatio: "3446 / 845" }}
            tabIndex={-1}
            title="Trustead animated logo"
          />
        </div>
      )}

      {phase === "slides" && (
        <>
          {/* Top bar — back arrow (left) + dots (center) */}
          <div className="absolute inset-x-0 top-5 z-20 flex items-center justify-between px-5 sm:top-8 sm:px-8">
            <div className="w-10">
              {index > 0 && (
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous slide"
                  className="grid h-10 w-10 place-items-center rounded-pill text-muted-foreground transition hover:text-foreground"
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

            <div className="w-10" aria-hidden />
          </div>

          {/* Centered content. Visual goes BETWEEN title and body
              (per Loren's spec for slide 2/3 — the model + popup live
              right under the heading). Slide 1 has no visual. */}
          <div
            key={index}
            className="flex flex-1 items-center justify-center px-6 pt-20 pb-10"
          >
            <div className="flex w-full max-w-md flex-col items-center gap-7 text-center sm:gap-9">
              <h1
                className="anim-step font-serif text-3xl leading-tight sm:text-4xl"
                style={{ animationDelay: "0ms" }}
              >
                {slide.title}
              </h1>

              {Visual && (
                <div
                  className="anim-step h-40 w-full"
                  style={{ animationDelay: `${FADE_STAGGER_MS}ms` }}
                >
                  <Visual />
                </div>
              )}

              <p
                className="anim-step text-base leading-relaxed text-muted-foreground sm:text-lg"
                style={{
                  animationDelay: `${(Visual ? 2 : 1) * FADE_STAGGER_MS}ms`,
                }}
              >
                {slide.body}
              </p>

              <div
                className="anim-step flex w-full flex-col items-center gap-3"
                style={{
                  animationDelay: `${(Visual ? 3 : 2) * FADE_STAGGER_MS}ms`,
                }}
              >
                <button
                  type="button"
                  onClick={next}
                  aria-label={isLast ? "Get started" : "Continue"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-300 px-6 py-3.5 text-sm font-semibold text-brand-foreground shadow-card transition hover:bg-brand-400"
                >
                  {isLast ? "Get started" : "Continue"}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={skip}
                  className="rounded-pill px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

// ── Visuals ───────────────────────────────────────────────────────

function NetworkVisual() {
  // Slide 2 — the trust-graph model. Center "you" node, ring of direct
  // friends (1°), outer ring of friends-of-friends (2°). Communicates
  // how vouching grows the network without any UI chrome.
  return (
    <svg
      viewBox="0 0 320 160"
      className="h-full w-full"
      role="img"
      aria-label="A trust graph: you in the center, friends around you, friends of friends in an outer ring"
    >
      <defs>
        <radialGradient id="sb-net-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4FB191" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4FB191" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Outer ring: 2° friends-of-friends */}
      {[
        [50, 30],
        [50, 130],
        [270, 30],
        [270, 130],
        [160, 18],
      ].map(([cx, cy], i) => (
        <circle
          key={`outer-${i}`}
          cx={cx}
          cy={cy}
          r="5"
          fill="currentColor"
          opacity="0.45"
        />
      ))}
      {/* Vouch lines — center → 1° → 2° */}
      <g stroke="#4FB191" strokeOpacity="0.4" strokeWidth="1">
        <line x1="160" y1="80" x2="100" y2="50" />
        <line x1="160" y1="80" x2="100" y2="110" />
        <line x1="160" y1="80" x2="220" y2="50" />
        <line x1="160" y1="80" x2="220" y2="110" />
        <line x1="100" y1="50" x2="50" y2="30" />
        <line x1="100" y1="110" x2="50" y2="130" />
        <line x1="220" y1="50" x2="270" y2="30" />
        <line x1="220" y1="110" x2="270" y2="130" />
        <line x1="220" y1="50" x2="160" y2="18" />
      </g>
      {/* Inner ring: 1° direct friends */}
      {[
        [100, 50],
        [100, 110],
        [220, 50],
        [220, 110],
      ].map(([cx, cy], i) => (
        <circle
          key={`inner-${i}`}
          cx={cx}
          cy={cy}
          r="7"
          fill="#4FB191"
          opacity="0.85"
        />
      ))}
      {/* Center: you */}
      <circle cx="160" cy="80" r="32" fill="url(#sb-net-glow)" />
      <circle cx="160" cy="80" r="12" fill="#4FB191" />
      <text
        x="160"
        y="84"
        textAnchor="middle"
        fontSize="9"
        fontWeight="600"
        fill="#0B2E25"
        style={{ fontFamily: "var(--font-sans, system-ui)" }}
      >
        You
      </text>
    </svg>
  );
}

function TrustDetailVisual() {
  // Slide 3 — recreation of the in-app trust-detail popover that opens
  // off a 2° host's pill. Rounded card, anchored arrow, header line,
  // path row (you → connector → host) with a strength chip and link
  // dots. Mirrors src/components/trust/connection-breakdown.tsx so the
  // sandbox preview matches the production look.
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div
        className="relative w-[280px] rounded-2xl border bg-white p-3 text-left shadow-2xl"
        style={{ borderColor: "rgba(11,46,37,0.10)", color: "#0B2E25" }}
      >
        {/* Header row: title + degree pill */}
        <div className="mb-2.5 flex items-center justify-between">
          <span
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "rgba(11,46,37,0.55)" }}
          >
            How you know David
          </span>
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: "#2A8A6B", color: "#FFFFFF" }}
          >
            2°
          </span>
        </div>

        {/* Path row — anonymized intermediary, mirrors PathRow */}
        <div
          className="flex items-center gap-2.5 rounded-lg p-2.5"
          style={{
            backgroundColor: "rgba(11,46,37,0.04)",
            border: "1px solid rgba(11,46,37,0.06)",
          }}
        >
          <div
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold"
            style={{ backgroundColor: "#BFE2D4", color: "#0B2E25" }}
          >
            ML
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-semibold leading-tight">
              via Maya L.
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                style={{ backgroundColor: "#FAF5FF", color: "#6B21A8" }}
              >
                Strong
              </span>
              <span className="flex items-center gap-0.5">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "#2A8A6B" }}
                  title="You → Maya"
                />
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "#4FB191" }}
                  title="Maya → David"
                />
              </span>
            </div>
          </div>
        </div>

        {/* Anchor arrow under the popover, pointing at an implicit
            "David" pill below — visual hint that this is a popover. */}
        <div
          aria-hidden
          className="absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r bg-white"
          style={{ borderColor: "rgba(11,46,37,0.10)" }}
        />
      </div>
    </div>
  );
}
