"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Lock,
  Shield,
  Star,
  Users,
} from "lucide-react";

// ── Slide schema ──────────────────────────────────────────────────
// titleLines locks every heading to two visual lines (regardless of
// viewport). titleEmphasis applies a per-word style (italic + brand
// green for slide 1's "trust"). Body stays a plain string — words
// get split + animated downstream.

type Slide = {
  titleLines: [string, string];
  titleEmphasis?: { word: string; className: string };
  body: string;
  Visual: React.ComponentType | null;
};

const SLIDES: Slide[] = [
  {
    titleLines: ["Rent your home to", "people you can trust"],
    titleEmphasis: { word: "trust", className: "italic text-brand-300" },
    body: "Rent your primary home to friends of friends. Control who sees it on our private invite-only platform.",
    Visual: null,
  },
  {
    titleLines: ["Renting to strangers", "gets complicated."],
    body: "A long list of small frictions you'd rather not deal with.",
    Visual: PainPointsVisual,
  },
  {
    titleLines: ["Build trust by vouching", "for people you know"],
    body: "Invite people you know. They invite people they know. The graph builds itself into a real trust network.",
    Visual: VouchPickerVisual,
  },
  {
    titleLines: ["Rent to people", "connected to you."],
    body: "See exactly how — through whom, and how strongly.",
    Visual: TrustDetailVisual,
  },
  {
    titleLines: ["Control who sees your", "listing, or listing preview"],
    body: "Make it fully private, share a teaser only, or open it up to friends-of-friends. Your call.",
    Visual: VisibilityVisual,
  },
];

// Total time the logo plays its full draw-in animation at center
// before morphing to its persistent header position. Matches the
// 1.374s draw plus a small hold so the filled wordmark "lands"
// before it shrinks.
const INTRO_DURATION_MS = 2000;
const SWIPE_THRESHOLD_PX = 50;

// Word-stagger tokens — modeled on brightbase.co's GSAP SplitText
// pattern (`type: "lines, words"`, `y: 100`, `stagger: 0.05`,
// `ease: power2.out`). We translate that to CSS:
//   - mask wrapper (overflow hidden) so each word "rises up from
//     below the baseline" instead of just fading
//   - 1200ms duration with cubic-bezier(0.25, 0.46, 0.45, 0.94)
//     ≈ power2.out
//   - 60ms stagger between words feels natural at title scale; body
//     uses a tighter 25ms because there are more words to traverse
const WORD_DURATION_MS = 1200;
const WORD_EASING = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";
const TITLE_WORD_STAGGER_MS = 60;
const BODY_WORD_STAGGER_MS = 25;
const BLOCK_FADE_DURATION_MS = 1000;
// Logo morph duration — how long it takes to translate + scale into
// its top-of-screen header position once the intro hold ends.
const LOGO_MORPH_MS = 800;

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

  // Word counts for stagger sequencing — last title word ends at:
  //   (titleWordCount - 1) * TITLE_WORD_STAGGER_MS + WORD_DURATION_MS
  // Visual + body + button are paced AFTER that natural end so each
  // block feels like a continuous sentence-and-then-the-rest.
  const titleWords = slide.titleLines.flatMap((l) => l.split(" ")).length;
  const titleEndDelay =
    (titleWords - 1) * TITLE_WORD_STAGGER_MS + WORD_DURATION_MS;
  const visualDelay = Math.round(titleEndDelay * 0.4); // start the visual partway through the title's tail
  const bodyStartDelay = Math.round(titleEndDelay * 0.55);
  const bodyWords = slide.body.split(/\s+/).filter(Boolean).length;
  const bodyEndDelay =
    bodyStartDelay + (bodyWords - 1) * BODY_WORD_STAGGER_MS + WORD_DURATION_MS;
  const buttonDelay = Math.round(bodyEndDelay * 0.65);

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
            /* ── Word-stagger animation (brightbase pattern) ── */
            @keyframes sb-word-rise {
              from {
                opacity: 0;
                transform: translate3d(0, 110%, 0);
              }
              to {
                opacity: 1;
                transform: translate3d(0, 0, 0);
              }
            }
            .sandbox-onboarding-root .word-mask {
              display: inline-block;
              overflow: hidden;
              vertical-align: top;
              line-height: inherit;
            }
            .sandbox-onboarding-root .word-fill {
              display: inline-block;
              opacity: 0;
              will-change: opacity, transform;
              animation: sb-word-rise ${WORD_DURATION_MS}ms ${WORD_EASING} forwards;
            }

            /* ── Block fade-up (visual + button) ── */
            @keyframes sb-block-rise {
              from { opacity: 0; transform: translate3d(0, 24px, 0); }
              to   { opacity: 1; transform: translate3d(0, 0, 0); }
            }
            .sandbox-onboarding-root .block-rise {
              opacity: 0;
              will-change: opacity, transform;
              animation: sb-block-rise ${BLOCK_FADE_DURATION_MS}ms ${WORD_EASING} forwards;
            }

            /* ── Pain-points vertical cycle ── */
            /* Each step shifts the track by exactly one item height
               (--pain-h, set inline). Using calc() rather than
               translate(-100%) because -100% would resolve against
               the track's full height, not the single-item window. */
            @keyframes sb-pain-cycle {
              0%,  18% { transform: translate3d(0, calc(0  * var(--pain-h) * -1), 0); }
              20%, 38% { transform: translate3d(0, calc(1  * var(--pain-h) * -1), 0); }
              40%, 58% { transform: translate3d(0, calc(2  * var(--pain-h) * -1), 0); }
              60%, 78% { transform: translate3d(0, calc(3  * var(--pain-h) * -1), 0); }
              80%, 98% { transform: translate3d(0, calc(4  * var(--pain-h) * -1), 0); }
              100%     { transform: translate3d(0, calc(5  * var(--pain-h) * -1), 0); }
            }
            .sandbox-onboarding-root .pain-track {
              animation: sb-pain-cycle 18s linear infinite;
              will-change: transform;
            }
            .sandbox-onboarding-root .pain-window {
              -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%);
                      mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%);
            }

            /* Hide global cookie banner on this takeover surface. */
            body:has(.sandbox-onboarding-root) > div.fixed.inset-x-0.bottom-0.z-40 {
              display: none !important;
            }

            @media (prefers-reduced-motion: reduce) {
              .sandbox-onboarding-root .word-fill,
              .sandbox-onboarding-root .block-rise,
              .sandbox-onboarding-root .pain-track {
                animation: none !important;
                opacity: 1 !important;
                transform: none !important;
              }
            }
          `,
        }}
      />

      {/* ── Persistent logo. Big + centered during intro, then it
          translates + scales to the top of the screen and stays as a
          header for the slides phase. The transition does the morph;
          the iframe re-flows automatically because its inner SVG is
          width:100% inside `min(960px, 92vw)`. */}
      <div
        className="pointer-events-none absolute z-30 left-1/2 -translate-x-1/2 ease-out"
        style={{
          top: phase === "intro" ? "50%" : "1.75rem",
          transform:
            phase === "intro"
              ? "translate(-50%, -50%)"
              : "translate(-50%, 0)",
          width: phase === "intro" ? "min(28rem, 92vw)" : "9rem",
          transitionProperty: "top, transform, width",
          transitionDuration: `${LOGO_MORPH_MS}ms`,
          transitionTimingFunction: WORD_EASING,
        }}
      >
        <iframe
          src="/assets/logo-animation/trustead-logo-animation-white.html"
          className="w-full border-0"
          style={{ aspectRatio: "3446 / 845" }}
          tabIndex={-1}
          title="Trustead animated logo"
        />
      </div>

      {phase === "slides" && (
        <>
          {/* Top bar — back arrow only. Logo lives behind, dots are at the bottom. */}
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
            <div className="w-10" aria-hidden />
          </div>

          {/* Centered content — heading, visual, body, CTA */}
          <div
            key={index}
            className="flex flex-1 items-start justify-center overflow-y-auto px-6 pt-32 pb-32 sm:pt-36"
          >
            <div className="flex w-full max-w-md flex-col items-center gap-7 text-center sm:max-w-xl sm:gap-9">
              <AnimatedHeading
                titleLines={slide.titleLines}
                emphasis={slide.titleEmphasis}
                stagger={TITLE_WORD_STAGGER_MS}
                baseDelay={0}
              />

              {Visual && (
                <div
                  className="block-rise w-full"
                  style={{ animationDelay: `${visualDelay}ms` }}
                >
                  <Visual />
                </div>
              )}

              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                <AnimatedWords
                  text={slide.body}
                  stagger={BODY_WORD_STAGGER_MS}
                  baseDelay={bodyStartDelay}
                />
              </p>

              <div
                className="block-rise flex w-full flex-col items-center gap-3"
                style={{ animationDelay: `${buttonDelay}ms` }}
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

          {/* Pagination dots — pinned to the bottom */}
          <div className="absolute inset-x-0 bottom-6 z-20 flex items-center justify-center gap-2 sm:bottom-8">
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
        </>
      )}
    </main>
  );
}

// ── Animated heading + body ───────────────────────────────────────

function AnimatedHeading({
  titleLines,
  emphasis,
  stagger,
  baseDelay,
}: {
  titleLines: [string, string];
  emphasis?: { word: string; className: string };
  stagger: number;
  baseDelay: number;
}) {
  // Render two visual lines, splitting each into words. Each word
  // gets a global index for its stagger delay so the second line
  // continues the rhythm of the first instead of restarting.
  let globalWordIdx = 0;
  return (
    <h1
      className="font-serif !leading-[1.1] !tracking-tight !max-w-none !text-[26px] sm:!text-[46px] md:!text-[58px]"
    >
      {titleLines.map((line, lineIdx) => (
        <span key={lineIdx} className="block">
          {line.split(" ").map((word, wordIdx, arr) => {
            const delay = baseDelay + globalWordIdx * stagger;
            globalWordIdx += 1;
            const isEmphasis =
              emphasis && stripPunct(word) === stripPunct(emphasis.word);
            return (
              <span key={`${lineIdx}-${wordIdx}`}>
                <span className="word-mask">
                  <span
                    className={`word-fill ${isEmphasis ? emphasis!.className : ""}`}
                    style={{ animationDelay: `${delay}ms` }}
                  >
                    {word}
                  </span>
                </span>
                {wordIdx < arr.length - 1 && " "}
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

function AnimatedWords({
  text,
  stagger,
  baseDelay,
}: {
  text: string;
  stagger: number;
  baseDelay: number;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, i) => (
        <span key={i}>
          <span className="word-mask">
            <span
              className="word-fill"
              style={{ animationDelay: `${baseDelay + i * stagger}ms` }}
            >
              {word}
            </span>
          </span>
          {i < words.length - 1 && " "}
        </span>
      ))}
    </>
  );
}

function stripPunct(s: string) {
  return s.replace(/[.,;:!?"'()]/g, "").toLowerCase();
}

// ── Visuals ───────────────────────────────────────────────────────

const PAIN_POINTS = [
  {
    title: "Putting your stuff away",
    subtitle: "Every time you rent. Out again every time you return.",
  },
  {
    title: "Neighbor issues",
    subtitle: "A new household every weekend. Not everyone is thrilled.",
  },
  {
    title: "Exposing your nice things",
    subtitle: "Glasses, couches, art — left to strangers' wear and tear.",
  },
  {
    title: "Coverage doesn't mean caring",
    subtitle: "Insurance pays out. It doesn't fix how renters treat your home.",
  },
  {
    title: "Public listings are searchable",
    subtitle: "Anyone can find your address attached to a listing.",
  },
];

function PainPointsVisual() {
  // Slide 2 — vertical cycle of small "pain point" cards. The track
  // is a stack of all five items; the keyframes step it -100% per
  // beat so one card sits in the visible window at a time. A mask
  // gradient fades the top + bottom edges so cards fade in from
  // below and out at the top instead of hard-popping.
  // The last item is duplicated at the end so the loop-back to 0%
  // is seamless.
  const ITEM_HEIGHT = 76; // px
  const items = [...PAIN_POINTS, PAIN_POINTS[0]];
  return (
    <div
      className="pain-window relative w-full overflow-hidden"
      style={
        {
          height: `${ITEM_HEIGHT}px`,
          ["--pain-h" as string]: `${ITEM_HEIGHT}px`,
        } as React.CSSProperties
      }
    >
      <div className="pain-track">
        {items.map((p, i) => (
          <div
            key={`${p.title}-${i}`}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 text-left"
            style={{ height: `${ITEM_HEIGHT}px` }}
          >
            <span
              aria-hidden
              className="grid h-2 w-2 shrink-0 place-items-center rounded-full"
              style={{ backgroundColor: "#B45309" }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold leading-tight">
                {p.title}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                {p.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VouchPickerVisual() {
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
