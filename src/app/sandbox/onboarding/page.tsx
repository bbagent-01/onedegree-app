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

type Slide = {
  eyebrow: string;
  titleLines: [string, string];
  titleEmphasis?: { word: string; className: string };
  // String body renders inline. A 2-element tuple renders the
  // two parts on a single line on mobile (joined by a space) and on
  // separate lines on desktop (md:block break between them).
  body: string | [string, string];
  Visual: React.ComponentType | null;
};

// STRANGERS_OPTION_ONE — the vertical-cycling pain-points list lives
// in PainPointsListVisual below but is intentionally NOT in SLIDES.
// Loren is keeping it as the alternate "strangers" treatment. Bring
// it back by inserting a slide entry with `Visual: PainPointsListVisual`.
const SLIDES: Slide[] = [
  {
    eyebrow: "The problem",
    titleLines: ["Renting your actual home,", "actually isn't great"],
    titleEmphasis: { word: "actually", className: "italic text-brand-300" },
    body: [
      "So most people just don't do it.",
      "Losing out on monetizing their empty home.",
    ],
    Visual: PainPointsCardsVisual,
  },
  {
    eyebrow: "The solution",
    titleLines: ["Rent your home to", "people you can trust"],
    titleEmphasis: { word: "trust", className: "italic text-brand-300" },
    body: "Rent your primary home to friends of friends. Control who sees it on our private invite-only platform.",
    Visual: null,
  },
  {
    eyebrow: "How it works",
    titleLines: ["Build trust by vouching", "for people you know"],
    body: "Invite people you know. They invite people they know. The graph builds itself into a real trust network.",
    Visual: VouchPickerVisual,
  },
  {
    eyebrow: "Trust",
    titleLines: ["Rent to people", "connected to you."],
    body: "See exactly how — through whom, and how strongly.",
    Visual: TrustDetailVisual,
  },
  {
    eyebrow: "Privacy",
    titleLines: ["Control who sees your", "listing, or listing preview"],
    body: "Make it fully private, share a teaser only, or open it up to friends-of-friends. Your call.",
    Visual: VisibilityVisual,
  },
];

// Phase timeline:
//   intro     (0 → 3400 ms)       — logo draws + tagline rises;
//                                   both visible together for ~1.5s
//   morphing  (3400 → ~6400 ms)   — logo translates up + shrinks
//                                   slowly; tagline fades out;
//                                   slide content NOT yet rendered
//   slides    (~6400 ms → ...)    — slide content mounts and runs
//                                   its word stagger
const INTRO_DURATION_MS = 3400;
const SWIPE_THRESHOLD_PX = 50;

// Tagline starts BEFORE the wordmark finishes drawing, so they
// resolve together. Logo draw-in lands at ~1.374s; a 900ms tagline
// start means the first word of the tagline begins lifting while
// the logo is still drawing.
const TAGLINE_DELAY_MS = 900;

// Word-stagger tokens.
const WORD_DURATION_MS = 600;
const WORD_EASING = "cubic-bezier(0.25, 0.46, 0.45, 0.94)"; // power2.out
const TITLE_WORD_STAGGER_MS = 30;
const BODY_WORD_STAGGER_MS = 12;
const BLOCK_FADE_DURATION_MS = 500;
const WORD_EXIT_DURATION_MS = 400;

// Logo morph — slow and deliberate. Move runs over 2000ms; shrink
// starts at 80% of the move (1600ms) and runs another 1000ms. Reads
// as one slow, continuous "rest into place" motion that takes ~2.6s
// from start to settled.
const LOGO_MOVE_MS = 2000;
const LOGO_SHRINK_MS = 1000;
const LOGO_SHRINK_DELAY_MS = Math.round(LOGO_MOVE_MS * 0.8);
const LOGO_EASING = "cubic-bezier(0.83, 0, 0.17, 1)"; // dramatic ease-in-out
const LOGO_TOTAL_MORPH_MS = Math.max(
  LOGO_MOVE_MS,
  LOGO_SHRINK_DELAY_MS + LOGO_SHRINK_MS
);
// Slide content mounts during morphing — a bit before the logo
// shrink fires — so the eyebrow + first title words are already
// rising into place by the time the logo settles. The CSS
// transitions on the logo wrapper continue running independently;
// we just flip the React phase early.
const SLIDES_MOUNT_OFFSET_MS = LOGO_SHRINK_DELAY_MS - 200;

// Tagline exit — delayed and slow so it reads as "trying to follow"
// the logo up rather than vanishing first. The wrapper begins moving
// up immediately on morph; the tagline waits a beat, then drifts up
// + fades while the logo continues its journey.
const TAGLINE_EXIT_DELAY_MS = 500;
const TAGLINE_EXIT_DURATION_MS = 800;
const TAGLINE_EXIT_TRANSLATE_PX = 24;

type Phase = "intro" | "morphing" | "slides" | "dismissed";

export default function SandboxOnboardingPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const isLast = index === SLIDES.length - 1;
  const isFirst = index === 0;

  // Phase progression: intro → morphing → slides.
  useEffect(() => {
    if (phase === "intro") {
      const t = setTimeout(() => setPhase("morphing"), INTRO_DURATION_MS);
      return () => clearTimeout(t);
    }
    if (phase === "morphing") {
      // Mount slide content early (just before the logo begins
      // shrinking) so its word-stagger overlaps the tail of the logo
      // morph — the next slide is already rising as the wordmark
      // settles into the header.
      const t = setTimeout(() => setPhase("slides"), SLIDES_MOUNT_OFFSET_MS);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const transitionTo = (nextIdx: number) => {
    setExiting(true);
    setTimeout(() => {
      setIndex(nextIdx);
      setExiting(false);
    }, WORD_EXIT_DURATION_MS);
  };

  const next = () => {
    if (isLast) {
      setPhase("dismissed");
      return;
    }
    transitionTo(index + 1);
  };

  const prev = () => {
    if (isFirst) return;
    transitionTo(index - 1);
  };

  const skip = () => setPhase("dismissed");
  // Skipping the intro fast-forwards the whole logo-morph window so
  // the user lands on the first slide right away.
  const skipIntro = () => setPhase("slides");

  useEffect(() => {
    if (phase === "dismissed") return;
    const onKey = (e: KeyboardEvent) => {
      if (phase === "intro" || phase === "morphing") {
        skipIntro();
        return;
      }
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, isLast, isFirst, index]);

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

  // Stagger sequencing — eyebrow lands first, then title words, then
  // visual + body, then CTA. All paced off the title's natural end.
  const eyebrowDelay = 0;
  const titleStartDelay = 200;
  const titleWords = slide.titleLines.flatMap((l) => l.split(" ")).length;
  const titleEndDelay =
    titleStartDelay +
    (titleWords - 1) * TITLE_WORD_STAGGER_MS +
    WORD_DURATION_MS;
  const visualDelay = titleStartDelay + Math.round(titleEndDelay * 0.4);
  const bodyStartDelay = titleStartDelay + Math.round(titleEndDelay * 0.55);
  // Body can be a single string or a [head, tail] tuple (rendered as
  // two lines on desktop, one continuous run on mobile). Count + delay
  // math treats both as one continuous word stream.
  const bodyParts: [string, string?] = Array.isArray(slide.body)
    ? slide.body
    : [slide.body];
  const bodyWordsHead = bodyParts[0].split(/\s+/).filter(Boolean).length;
  const bodyWordsTail = bodyParts[1]
    ? bodyParts[1].split(/\s+/).filter(Boolean).length
    : 0;
  const bodyWords = bodyWordsHead + bodyWordsTail;
  const bodyEndDelay =
    bodyStartDelay + (bodyWords - 1) * BODY_WORD_STAGGER_MS + WORD_DURATION_MS;
  const buttonDelay = Math.round(bodyEndDelay * 0.65);

  const onTouchStart = (e: React.TouchEvent) => {
    if (phase !== "slides") return;
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (phase === "intro" || phase === "morphing") {
      skipIntro();
      return;
    }
    if (exiting) return;
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

  const introOrMorphing = phase === "intro" || phase === "morphing";

  return (
    <main
      className={`sandbox-onboarding-root relative flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground ${
        exiting ? "is-exiting" : ""
      }`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={introOrMorphing ? skipIntro : undefined}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Word IN/OUT — implicit \`from\` in both keyframes (no
               explicit from{}) so the browser uses the current
               computed value as the start. Removes the snap that
               caused flickering when the exit class was added
               mid-rise. */
            @keyframes sb-word-rise {
              to { opacity: 1; transform: translate3d(0, 0, 0); }
            }
            @keyframes sb-word-exit {
              to { opacity: 0; transform: translate3d(0, -110%, 0); }
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
              transform: translate3d(0, 110%, 0);
              will-change: opacity, transform;
              animation: sb-word-rise ${WORD_DURATION_MS}ms ${WORD_EASING} forwards;
            }
            /* Per-word exit was causing flicker when words at later
               delays hadn't started their entry yet — the new
               animation would still honor the inline animation-delay
               and snap. Replaced with a single uniform fade on the
               .slide-content wrapper below, which is smooth from any
               mid-entry state. */

            /* Block in/out — visual + button + eyebrow */
            @keyframes sb-block-rise {
              to { opacity: 1; transform: translate3d(0, 0, 0); }
            }
            @keyframes sb-block-exit {
              to { opacity: 0; transform: translate3d(0, -24px, 0); }
            }
            .sandbox-onboarding-root .block-rise {
              opacity: 0;
              transform: translate3d(0, 24px, 0);
              will-change: opacity, transform;
              animation: sb-block-rise ${BLOCK_FADE_DURATION_MS}ms ${WORD_EASING} forwards;
            }
            /* Same reasoning as above — block exits also handled by
               the .slide-content uniform fade. */

            /* Uniform exit on the slide-content wrapper. Whatever
               state the words/blocks are in mid-entry, the parent
               just fades + lifts a few px and disappears. Snappy
               enough that nothing feels held up. */
            @keyframes sb-content-exit {
              to { opacity: 0; transform: translate3d(0, -12px, 0); }
            }
            .sandbox-onboarding-root.is-exiting .slide-content {
              animation: sb-content-exit ${WORD_EXIT_DURATION_MS}ms ${WORD_EASING} forwards;
            }

            /* Pain-points list (alt) — vertical cycle */
            @keyframes sb-pain-cycle {
              0%,  18% { transform: translate3d(0, calc(0 * var(--pain-h) * -1), 0); }
              20%, 38% { transform: translate3d(0, calc(1 * var(--pain-h) * -1), 0); }
              40%, 58% { transform: translate3d(0, calc(2 * var(--pain-h) * -1), 0); }
              60%, 78% { transform: translate3d(0, calc(3 * var(--pain-h) * -1), 0); }
              80%, 98% { transform: translate3d(0, calc(4 * var(--pain-h) * -1), 0); }
              100%     { transform: translate3d(0, calc(5 * var(--pain-h) * -1), 0); }
            }
            .sandbox-onboarding-root .pain-track {
              animation: sb-pain-cycle 18s linear infinite;
              will-change: transform;
            }
            .sandbox-onboarding-root .pain-window {
              -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%);
                      mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%);
            }

            /* Pain-cards horizontal scroll, right→left */
            @keyframes sb-cards-scroll {
              from { transform: translate3d(0, 0, 0); }
              to   { transform: translate3d(-50%, 0, 0); }
            }
            .sandbox-onboarding-root .cards-track {
              animation: sb-cards-scroll 28s linear infinite;
              will-change: transform;
            }
            .sandbox-onboarding-root .cards-window {
              -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
                      mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
            }

            body:has(.sandbox-onboarding-root) > div.fixed.inset-x-0.bottom-0.z-40 {
              display: none !important;
            }

            @media (prefers-reduced-motion: reduce) {
              .sandbox-onboarding-root .word-fill,
              .sandbox-onboarding-root .block-rise,
              .sandbox-onboarding-root .pain-track,
              .sandbox-onboarding-root .cards-track {
                animation: none !important;
                opacity: 1 !important;
                transform: none !important;
              }
            }
          `,
        }}
      />

      {/* Persistent logo wrapper.
          Phase A (intro → morphing transition): top + transform animate
          over LOGO_MOVE_MS — the upward translate.
          Phase B (lands at top): width animates over LOGO_SHRINK_MS,
          delayed by LOGO_MOVE_MS so the shrink only fires after the
          move ends. Both share the dramatic ease-in-out curve so the
          motion is deliberate. The wrapper sits at z-40 so the slide
          content (z-10) cannot animate behind it during morphing. */}
      <div
        className="pointer-events-none absolute z-40 left-1/2 -translate-x-1/2"
        style={{
          top: introOrMorphing && phase !== "morphing" ? "50%" : "1.75rem",
          transform:
            introOrMorphing && phase !== "morphing"
              ? "translate(-50%, -50%)"
              : "translate(-50%, 0)",
          width:
            introOrMorphing && phase !== "morphing"
              ? "min(28rem, 92vw)"
              : "13.5rem",
          transitionProperty: "top, transform, width",
          transitionDuration: `${LOGO_MOVE_MS}ms, ${LOGO_MOVE_MS}ms, ${LOGO_SHRINK_MS}ms`,
          transitionDelay: `0ms, 0ms, ${LOGO_SHRINK_DELAY_MS}ms`,
          transitionTimingFunction: `${LOGO_EASING}, ${LOGO_EASING}, ${LOGO_EASING}`,
        }}
      >
        <iframe
          src="/assets/logo-animation/trustead-logo-animation-white.html"
          className="w-full border-0"
          style={{ aspectRatio: "3446 / 845" }}
          tabIndex={-1}
          title="Trustead animated logo"
        />
        {/* Tagline — animates in word-by-word like the slide text
            (same rise-from-baseline mask). Waits until the wordmark
            has mostly drawn before its first word lifts. On morph,
            the logo wrapper carries the tagline up; the tagline
            ALSO fades + drifts up extra after a short delay so it
            reads as "trying to follow the logo, then dissolving"
            — instead of disappearing before the logo moves. */}
        <div
          className="mt-4 text-center"
          style={{
            opacity: phase === "intro" ? 1 : 0,
            transform:
              phase === "intro"
                ? "translate3d(0, 0, 0)"
                : `translate3d(0, -${TAGLINE_EXIT_TRANSLATE_PX}px, 0)`,
            transition: `opacity ${TAGLINE_EXIT_DURATION_MS}ms ${WORD_EASING} ${TAGLINE_EXIT_DELAY_MS}ms, transform ${TAGLINE_EXIT_DURATION_MS}ms ${WORD_EASING} ${TAGLINE_EXIT_DELAY_MS}ms`,
          }}
        >
          <p className="text-lg text-muted-foreground sm:text-xl">
            <AnimatedWords
              text="Rent your home with trust"
              stagger={TITLE_WORD_STAGGER_MS}
              baseDelay={TAGLINE_DELAY_MS}
            />
          </p>
        </div>
      </div>

      {phase === "slides" && (
        <>
          <div
            key={index}
            className="slide-content relative z-10 flex flex-1 items-center justify-center overflow-y-auto px-6 pt-32 pb-20 sm:pt-36 sm:pb-24"
          >
            <div className="flex w-full max-w-md flex-col items-center gap-6 text-center sm:max-w-xl sm:gap-8">
              {/* Eyebrow pill — small uppercase tag above the heading */}
              <span
                className="block-rise inline-flex items-center rounded-pill border border-border/60 bg-background/40 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground"
                style={{ animationDelay: `${eyebrowDelay}ms` }}
              >
                {slide.eyebrow}
              </span>

              <AnimatedHeading
                titleLines={slide.titleLines}
                emphasis={slide.titleEmphasis}
                stagger={TITLE_WORD_STAGGER_MS}
                baseDelay={titleStartDelay}
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
                  text={bodyParts[0]}
                  stagger={BODY_WORD_STAGGER_MS}
                  baseDelay={bodyStartDelay}
                />
                {bodyParts[1] && (
                  <>
                    {/* Mobile: collapse to a single space so the two
                        body parts flow inline. Desktop: block-display
                        so the second part starts on a new line. */}
                    <span className="inline md:hidden">{" "}</span>
                    <span className="hidden md:block" aria-hidden />
                    <AnimatedWords
                      text={bodyParts[1]}
                      stagger={BODY_WORD_STAGGER_MS}
                      baseDelay={
                        bodyStartDelay + bodyWordsHead * BODY_WORD_STAGGER_MS
                      }
                    />
                  </>
                )}
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
                {/* Skip is centered under Continue; back arrow lives
                    on the left edge so the row reads as a balanced
                    "← center action" instead of a paired group. */}
                <div className="relative flex w-full items-center justify-center">
                  {!isFirst && (
                    <button
                      type="button"
                      onClick={prev}
                      aria-label="Previous slide"
                      className="absolute left-0 grid h-8 w-8 place-items-center rounded-pill text-muted-foreground transition hover:text-foreground"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
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
          </div>

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
  let globalWordIdx = 0;
  return (
    // Mobile font size scales with viewport (clamp(34, 10.5vw, 44))
    // so 375px → ~39px (~1.5× the prior 26px) while still fitting
    // the longer slide-5 line. Desktop sizes unchanged.
    <h1 className="font-serif !leading-[1.08] !tracking-tight !max-w-none !text-[clamp(34px,10.5vw,44px)] sm:!text-[50px] md:!text-[60px]">
      {titleLines.map((line, lineIdx) => {
        const arr = line.split(" ");
        const renderWord = (word: string, key: string) => {
          const delay = baseDelay + globalWordIdx * stagger;
          globalWordIdx += 1;
          const isEmphasis =
            emphasis && stripPunct(word) === stripPunct(emphasis.word);
          return (
            <span key={key} className="word-mask">
              <span
                className={`word-fill ${isEmphasis ? emphasis!.className : ""}`}
                style={{ animationDelay: `${delay}ms` }}
              >
                {word}
              </span>
            </span>
          );
        };
        // Bind the last two words in a single white-space: nowrap
        // span so the browser CAN'T break between them on any wrap —
        // including the mobile inline flow where the two authored
        // lines collapse and re-wrap based on viewport width.
        const splitAt = Math.max(0, arr.length - 2);
        const headWords = arr.slice(0, splitAt);
        const tailWords = arr.slice(splitAt);
        return (
          // Mobile: lines flow inline so the heading wraps naturally
          // (no forced break). sm+: each line gets its own block so
          // the heading reads exactly as `titleLines` was authored.
          <span key={lineIdx} className="inline sm:block">
            {headWords.map((word, i) => (
              <span key={`h-${lineIdx}-${i}`}>
                {renderWord(word, `wh-${lineIdx}-${i}`)}{" "}
              </span>
            ))}
            {tailWords.length > 0 && (
              <span className="whitespace-nowrap">
                {tailWords.map((word, i) => {
                  const isLast = i === tailWords.length - 1;
                  return (
                    <span key={`t-${lineIdx}-${i}`}>
                      {renderWord(word, `wt-${lineIdx}-${i}`)}
                      {!isLast && " "}
                    </span>
                  );
                })}
              </span>
            )}
            {/* Trailing space so adjacent inline lines don't run
                together on mobile. Hidden on sm+ where each line is
                its own block and a trailing space is meaningless. */}
            {lineIdx < titleLines.length - 1 && (
              <span className="inline sm:hidden"> </span>
            )}
          </span>
        );
      })}
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
    image: "/assets/onboarding-problems/problem-02-packing.webp",
  },
  {
    title: "Neighbor issues",
    subtitle: "A new household every weekend. Not everyone is thrilled.",
    image: "/assets/onboarding-problems/problem-03-neighbors.webp",
  },
  {
    title: "Exposing your nice things",
    subtitle: "Glasses, couches, art — left to strangers' wear and tear.",
    image: "/assets/onboarding-problems/problem-01-wine.webp",
  },
  {
    title: "Coverage doesn't mean caring",
    subtitle: "Insurance pays out. It doesn't fix how renters treat your home.",
    image: "/assets/onboarding-problems/problem-04-careless.webp",
  },
  {
    title: "Public listings are searchable",
    subtitle: "Anyone can find your address attached to a listing.",
    image: "/assets/onboarding-problems/problem-05-regulation.webp",
  },
];

// STRANGERS_OPTION_ONE — the vertical pain-points list. Kept in code
// as an alternate treatment; not currently in SLIDES.
function PainPointsListVisual() {
  const ITEM_HEIGHT = 76;
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

// All five problem cards. PainPointsListVisual still uses its own
// PAIN_POINTS array so the vertical-list alt isn't affected.
const PROBLEM_CARDS = [
  {
    title: "Putting your stuff away and taking it out every time",
    image: "/assets/onboarding-problems/problem-02-packing.webp",
  },
  {
    title: "Bothering your neighbors",
    image: "/assets/onboarding-problems/problem-03-neighbors.webp",
  },
  {
    title: "Exposing your nice things",
    image: "/assets/onboarding-problems/problem-01-wine.webp",
  },
  {
    title: "Coverage doesn't mean caring",
    image: "/assets/onboarding-problems/problem-04-careless.webp",
  },
  {
    title: "Your listing is public",
    image: "/assets/onboarding-problems/problem-05-regulation.webp",
  },
];

function PainPointsCardsVisual() {
  // Track is the cards duplicated so the right→left scroll wraps
  // seamlessly when the first set scrolls fully out. Uses mr-3 on
  // every card (rather than flex gap) so each card occupies an
  // identical "slot" of card_width + 12px and the keyframe's -50%
  // translation lands exactly one set's slot-width over — no gap
  // arithmetic mismatch at the seam, no blank-space hiccup.
  const cards = [...PROBLEM_CARDS, ...PROBLEM_CARDS];
  return (
    <div className="cards-window relative w-full overflow-hidden">
      <div className="cards-track flex" style={{ width: "max-content" }}>
        {cards.map((p, i) => (
          <div
            key={`${p.title}-${i}`}
            className="mr-3 flex w-[44vw] max-w-[180px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/40 text-left sm:w-[180px] md:w-[260px] md:max-w-none"
          >
            <div
              className="aspect-[4/3] w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${p.image})` }}
              aria-label={p.title}
              role="img"
            />
            <div className="px-3 py-2.5">
              <div className="text-[12px] font-semibold leading-tight md:text-[14px]">
                {p.title}
              </div>
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

// TODO(loren): revisit this visual — placeholder mock of the in-app
// trust-detail panel; needs a follow-up design pass before B3.
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

// TODO(loren): revisit this visual — placeholder mock of the listing
// visibility settings; needs a follow-up design pass before B3.
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
