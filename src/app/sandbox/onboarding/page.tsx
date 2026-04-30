"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, Lock, Shield, Star, Users } from "lucide-react";

type Slide = {
  // Use explicit <br /> in titles to lock every heading to two lines
  // regardless of viewport — Loren wants a consistent two-line shape.
  title: React.ReactNode;
  body: string;
  Visual: React.ComponentType | null;
};

const SLIDES: Slide[] = [
  {
    title: (
      <>
        Rent your home to
        <br />
        people you can <span className="text-brand-300">trust</span>
      </>
    ),
    body: "Rent your primary home to friends of friends. Control who sees it on our private invite-only platform.",
    Visual: null,
  },
  {
    title: (
      <>
        Build trust by vouching
        <br />
        for people you know
      </>
    ),
    body: "Invite people you know. They invite people they know. The graph builds itself into a real trust network.",
    Visual: VouchPickerVisual,
  },
  {
    title: (
      <>
        Rent to people
        <br />
        connected to you.
      </>
    ),
    body: "See exactly how — through whom, and how strongly.",
    Visual: TrustDetailVisual,
  },
  {
    title: (
      <>
        Control who sees your
        <br />
        listing, or listing preview
      </>
    ),
    body: "Make it fully private, share a teaser only, or open it up to friends-of-friends. Your call.",
    Visual: VisibilityVisual,
  },
];

// Intro tightened — no reverse-draw; the outro is a quick wipe-up +
// fade on the iframe wrapper, which feels cleaner than the disjointed
// stroke-undraw experiment. Logo draws in by ~1.4s, holds briefly,
// then wipes up over ~0.4s.
const INTRO_DURATION_MS = 2400;
const INTRO_OUTRO_START_PCT = 80; // logo holds until 80% of intro, then wipes up
const SWIPE_THRESHOLD_PX = 50;

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

  const prev = () => setIndex((i) => Math.max(i - 1, 0));
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
            /* Intro outro: hold the logo at full opacity for the first
               ${INTRO_OUTRO_START_PCT}% of the intro window, then wipe up
               (translateY −32px) and fade to 0 over the remaining time.
               Cleaner than the reverse-stroke experiment — single
               continuous motion instead of swapping render groups. */
            @keyframes sb-intro-wipe {
              0%, ${INTRO_OUTRO_START_PCT}% {
                opacity: 1;
                transform: translate3d(0, 0, 0);
              }
              100% {
                opacity: 0;
                transform: translate3d(0, -32px, 0);
              }
            }
            .sandbox-onboarding-root .anim-step {
              opacity: 0;
              will-change: opacity, transform;
              animation: sb-fade-up ${FADE_DURATION_MS}ms ${FADE_EASING} forwards;
            }
            .sandbox-onboarding-root .intro-overlay {
              animation: sb-intro-wipe ${INTRO_DURATION_MS}ms ${FADE_EASING} forwards;
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

          {/* Centered content. Visual sits BETWEEN heading and body. */}
          <div
            key={index}
            className="flex flex-1 items-center justify-center overflow-y-auto px-6 pt-20 pb-10"
          >
            <div className="flex w-full max-w-md flex-col items-center gap-6 text-center sm:gap-8">
              <h1
                className="anim-step font-serif !text-[26px] !leading-[1.15] !max-w-none sm:!text-4xl sm:!leading-tight"
                style={{ animationDelay: "0ms" }}
              >
                {slide.title}
              </h1>

              {Visual && (
                <div
                  className="anim-step w-full"
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

function VouchPickerVisual() {
  // Slide 2 — recreation of the vouch-modal type-picker step (see
  // src/components/trust/vouch-modal.tsx ~line 203). Two stacked
  // option cards with the production icons + colors. Static — no
  // selection state needed for the onboarding visual.
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4 text-left">
      <p className="mb-3 text-xs text-muted-foreground">How do you know them?</p>
      <div className="space-y-2.5">
        <PickerOption
          icon={<Shield className="h-4 w-4" />}
          iconBg="bg-blue-100"
          iconFg="text-blue-700"
          title="Vouch"
          subtitle="I know them"
        />
        <PickerOption
          icon={<Star className="h-4 w-4" />}
          iconBg="bg-amber-100"
          iconFg="text-amber-700"
          title="Vouch+"
          subtitle="I know them very well"
        />
      </div>
    </div>
  );
}

function PickerOption({
  icon,
  iconBg,
  iconFg,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconFg: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 p-2.5">
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${iconBg} ${iconFg}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold leading-tight">{title}</div>
        <p className="mt-0.5 text-xs text-muted-foreground leading-tight">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function TrustDetailVisual() {
  // Slide 3 — recreation of ConnectionPopover's MultiHopView (see
  // src/components/trust/connection-breakdown.tsx ~line 320). No
  // "Hosted by ..." chrome (Loren's note) — just the panel itself.
  // Header with Users icon → connection count, Trust Score line,
  // PATH 1 row showing You → Cassidy → Hana with the same 9-pt link
  // chip the production component uses.
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4 text-left">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="text-[13px] font-semibold leading-tight">
          Hana Yoon is connected to you via 1 connection
        </div>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        Trust Score:{" "}
        <span className="font-semibold text-foreground">9 pts (Weak)</span>
      </div>

      <div className="mt-3 rounded-xl border border-border/60 bg-background/30 p-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          Path 1 · via Cassidy
        </div>
        <div className="mt-2 flex items-center justify-between gap-1">
          <ChainNode initials="HY" label="Hana" />
          <ChainChip value="9" />
          <ChainNode initials="CL" label="Cassidy" />
          <ChainChip value="9" />
          <ChainNode initials="You" label="You" tone="self" />
        </div>
      </div>
    </div>
  );
}

function ChainNode({
  initials,
  label,
  tone = "neutral",
}: {
  initials: string;
  label: string;
  tone?: "neutral" | "self";
}) {
  const styles =
    tone === "self"
      ? "bg-brand-300 text-brand-foreground"
      : "bg-secondary text-foreground border border-border/60";
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`grid h-9 w-9 place-items-center rounded-full text-[10px] font-semibold ${styles}`}
      >
        {initials}
      </div>
      <span className="text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function ChainChip({ value }: { value: string }) {
  return (
    <span
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold"
      style={{ backgroundColor: "#FAF5FF", color: "#6B21A8" }}
    >
      {value}
    </span>
  );
}

function VisibilityVisual() {
  // Slide 4 — listing-visibility settings. Three scopes stacked: each
  // row has an icon, label, sublabel; the active scope is highlighted
  // with the brand chip + check. No interactivity — illustrative only.
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4 text-left">
      <p className="mb-3 text-xs text-muted-foreground">Listing visibility</p>
      <div className="space-y-2.5">
        <ScopeRow
          icon={<Lock className="h-4 w-4" />}
          title="Private"
          subtitle="Only people you invite"
          active={false}
        />
        <ScopeRow
          icon={<Eye className="h-4 w-4" />}
          title="Preview"
          subtitle="Network sees a teaser, not the address"
          active={true}
        />
        <ScopeRow
          icon={<Users className="h-4 w-4" />}
          title="Friends of friends"
          subtitle="Up to 2° from you"
          active={false}
        />
      </div>
    </div>
  );
}

function ScopeRow({
  icon,
  title,
  subtitle,
  active,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  active: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-2.5 ${
        active ? "border-brand-300/60 bg-brand-300/10" : "border-border/60"
      }`}
    >
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          active
            ? "bg-brand-300 text-brand-foreground"
            : "bg-secondary text-muted-foreground"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold leading-tight">{title}</div>
        <p className="mt-0.5 text-xs text-muted-foreground leading-tight">
          {subtitle}
        </p>
      </div>
      {active && <Check className="h-4 w-4 shrink-0 text-brand-300" />}
    </div>
  );
}
