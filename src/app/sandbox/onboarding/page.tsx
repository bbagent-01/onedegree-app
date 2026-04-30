"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Slide = {
  title: string;
  body: string;
  Visual: React.ComponentType;
};

const SLIDES: Slide[] = [
  {
    title: "Rent your home to people you actually know.",
    body: "No public listings. No strangers. Trustead is a private platform for renting to friends, family, and friends of friends — instead of whoever happens to be on Airbnb that weekend.",
    Visual: AngleVisual,
  },
  {
    title: "Invite who you trust. They invite who they trust.",
    body: "The graph builds itself. Add a few friends, vouch for the people you'd already vouch for in real life, and your network expands every time they do the same.",
    Visual: NetworkVisual,
  },
  {
    title: "Stay one degree from a stranger.",
    body: "Every guest is connected to you through someone you both know. You can see exactly how — so 'friend of a friend' actually means something.",
    Visual: TrustChainVisual,
  },
];

const INTRO_DURATION_MS = 3500;
const SWIPE_THRESHOLD_PX = 50;
const FADE_DURATION_MS = 1000;
const FADE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

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
            @keyframes sb-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes sb-intro-hold { 0%, 88% { opacity: 1; } 100% { opacity: 0; } }
            .sandbox-onboarding-root .anim-step { opacity: 0; animation: sb-fade-up ${FADE_DURATION_MS}ms ${FADE_EASING} forwards; }
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

          {/* Centered content — visual, title, body, primary CTA, skip */}
          <div
            key={index}
            className="flex flex-1 items-center justify-center px-6 pt-20 pb-10"
          >
            <div className="flex w-full max-w-md flex-col items-center gap-7 text-center sm:gap-9">
              <div
                className="anim-step h-40 w-full"
                style={{ animationDelay: "0ms" }}
              >
                <Visual />
              </div>

              <h1
                className="anim-step font-serif text-3xl leading-tight sm:text-4xl"
                style={{ animationDelay: "150ms" }}
              >
                {slide.title}
              </h1>

              <p
                className="anim-step text-base leading-relaxed text-muted-foreground sm:text-lg"
                style={{ animationDelay: "300ms" }}
              >
                {slide.body}
              </p>

              <div
                className="anim-step flex w-full flex-col items-center gap-3"
                style={{ animationDelay: "450ms" }}
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
// Each slide gets one. Designed to live in a 160px-tall slot, scale
// fluidly with the text-block max width, and inherit foreground color
// so they read on the dark Trustead surface.

function AngleVisual() {
  // Slide 1 — quiet contrast: a public-listing strip (greyed) vs a
  // small ring of network nodes (live, glowing). Communicates the
  // "strangers vs your network" angle without text in the visual.
  return (
    <svg
      viewBox="0 0 320 160"
      className="h-full w-full"
      role="img"
      aria-label="Public listings on the left, your trusted network on the right"
    >
      {/* Left: greyed listing tiles, suggesting public/anonymous */}
      <g opacity="0.35">
        <rect x="14" y="40" width="44" height="32" rx="4" fill="currentColor" />
        <rect x="64" y="40" width="44" height="32" rx="4" fill="currentColor" />
        <rect x="14" y="78" width="44" height="32" rx="4" fill="currentColor" />
        <rect x="64" y="78" width="44" height="32" rx="4" fill="currentColor" />
      </g>
      {/* Divider */}
      <line
        x1="160"
        y1="20"
        x2="160"
        y2="140"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeDasharray="2 4"
      />
      {/* Right: small network around the viewer node */}
      <g>
        <line x1="240" y1="80" x2="200" y2="50" stroke="#4FB191" strokeOpacity="0.6" strokeWidth="1.2" />
        <line x1="240" y1="80" x2="200" y2="110" stroke="#4FB191" strokeOpacity="0.6" strokeWidth="1.2" />
        <line x1="240" y1="80" x2="290" y2="50" stroke="#4FB191" strokeOpacity="0.6" strokeWidth="1.2" />
        <line x1="240" y1="80" x2="290" y2="110" stroke="#4FB191" strokeOpacity="0.6" strokeWidth="1.2" />
        <circle cx="200" cy="50" r="6" fill="#4FB191" opacity="0.7" />
        <circle cx="200" cy="110" r="6" fill="#4FB191" opacity="0.7" />
        <circle cx="290" cy="50" r="6" fill="#4FB191" opacity="0.7" />
        <circle cx="290" cy="110" r="6" fill="#4FB191" opacity="0.7" />
        <circle cx="240" cy="80" r="10" fill="#4FB191" />
      </g>
    </svg>
  );
}

function NetworkVisual() {
  // Slide 2 — the trust graph model. Center "you" node, ring of direct
  // friends (1°), outer ring of friends-of-friends (2°). Lines denote
  // vouches. Two outer nodes pulse softly to suggest the graph growing.
  return (
    <svg
      viewBox="0 0 320 160"
      className="h-full w-full"
      role="img"
      aria-label="A network graph: you in the center, friends around you, friends of friends in an outer ring"
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
      {/* Connection lines — center → 1° → 2° */}
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
      <circle cx="160" cy="80" r="11" fill="#4FB191" />
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

function TrustChainVisual() {
  // Slide 3 — three avatars connected left-to-right, with a "2°"
  // medium-sized trust badge on the host. The chain makes the
  // degree-of-separation concept concrete: You → Maya → David.
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex items-center gap-2">
        <ChainAvatar initials="You" tone="self" />
        <ChainLink />
        <ChainAvatar initials="ML" tone="mutual" label="Maya" />
        <ChainLink />
        <div className="flex flex-col items-center gap-1.5">
          <ChainAvatar initials="DR" tone="host" label="David" />
          <TrustBadgeMedium degree={2} vouch={6.4} rating={4.7} />
        </div>
      </div>
    </div>
  );
}

function ChainAvatar({
  initials,
  tone,
  label,
}: {
  initials: string;
  tone: "self" | "mutual" | "host";
  label?: string;
}) {
  const styles =
    tone === "self"
      ? "bg-brand-300 text-brand-foreground"
      : tone === "mutual"
        ? "bg-secondary text-foreground border border-border"
        : "bg-secondary text-foreground border border-border";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`grid h-12 w-12 place-items-center rounded-full text-xs font-semibold ${styles}`}
      >
        {initials}
      </div>
      {label && (
        <span className="text-[10px] font-medium text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}

function ChainLink() {
  return (
    <span
      aria-hidden
      className="block h-px w-6 bg-border"
      style={{ marginBottom: "20px" }}
    />
  );
}

function TrustBadgeMedium({
  degree,
  vouch,
  rating,
}: {
  degree: 1 | 2 | 3 | 4;
  vouch: number;
  rating: number;
}) {
  // Recreation of the medium-size trust badge — degree pill + vouch
  // diamond + rating star. Tokens mirror the trust-badge sandbox so
  // the look stays consistent if Loren tunes them there later.
  const degreePalette: Record<
    1 | 2 | 3 | 4,
    { bg: string; fg: string; label: string }
  > = {
    1: { bg: "#BFE2D4", fg: "#0B2E25", label: "1°" },
    2: { bg: "#2A8A6B", fg: "#FFFFFF", label: "2°" },
    3: { bg: "#BF8A0D", fg: "#FFFFFF", label: "3°" },
    4: { bg: "#525252", fg: "#FFFFFF", label: "4°+" },
  };
  const d = degreePalette[degree];
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-secondary/80 px-1 py-0.5">
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ backgroundColor: d.bg, color: d.fg }}
      >
        {d.label}
      </span>
      <span
        className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
        style={{ backgroundColor: "#FAF5FF", color: "#6B21A8" }}
      >
        <svg viewBox="0 0 24 24" className="h-2 w-2" fill="currentColor">
          <path d="M12 2L22 12L12 22L2 12Z" />
        </svg>
        {vouch.toFixed(1)}
      </span>
      <span
        className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
        style={{ backgroundColor: "#FFFBEB", color: "#B45309" }}
      >
        <svg viewBox="0 0 24 24" className="h-2 w-2" fill="currentColor">
          <path d="M12 2l2.9 6.5 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.1l7.1-.6L12 2z" />
        </svg>
        {rating.toFixed(1)}
      </span>
    </span>
  );
}
