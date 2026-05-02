"use client";

// Ported from /sandbox/onboarding-2 (locked design — see
// `locked-onboarding.md` on feat/d1-onboarding-sandbox). The full
// sequence (intro logo morph → 5 slides → dismiss) is identical to
// the sandbox version; the only behavioral change is that dismiss
// here writes users.onboarding_seen_at via POST
// /api/onboarding/dismiss instead of the sandbox's in-memory state.
//
// Pending revisits (Loren):
// - TrustDetailVisual (slide 4): placeholder mock of the in-app
//   trust-detail panel. Replace once Loren has the real UI.
// - VisibilityVisual (slide 5): placeholder mock of the listing-
//   visibility panel. Replace once Loren has the real UI.

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
  body: string | [string, string];
  Visual: React.ComponentType | null;
  orbitLayout?: boolean;
  forceTitleBreak?: boolean;
};

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
    titleLines: ["Rent only to", "friends of friends"],
    titleEmphasis: { word: "only", className: "italic text-brand-300" },
    body: "Trust your guests, keep your stuff out, and keep your listing private.",
    Visual: null,
    orbitLayout: true,
    forceTitleBreak: true,
  },
  {
    eyebrow: "How it works",
    titleLines: ["Build trust by vouching", "for people you know"],
    body: [
      "Invite people you know. They invite people they know.",
      "It's quick and easy to build your network.",
    ],
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
//                                   slowly; tagline fades out
//   slides    (~6400 ms → ...)    — slide content mounts and runs
//                                   its word stagger
const INTRO_DURATION_MS = 3400;
const SWIPE_THRESHOLD_PX = 50;

const TAGLINE_DELAY_MS = 900;

const WORD_DURATION_MS = 600;
const WORD_EASING = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";
const TITLE_WORD_STAGGER_MS = 30;
const BODY_WORD_STAGGER_MS = 12;
const BLOCK_FADE_DURATION_MS = 500;
const WORD_EXIT_DURATION_MS = 400;

// Round 4 retune — shrink overlaps the move more (60% vs prev 80%)
// so move + shrink reads as one fluid gesture, not two steps.
const LOGO_MOVE_MS = 2000;
const LOGO_SHRINK_MS = 1000;
const LOGO_SHRINK_DELAY_MS = Math.round(LOGO_MOVE_MS * 0.6);
const LOGO_EASING = "cubic-bezier(0.83, 0, 0.17, 1)";
const SLIDES_MOUNT_OFFSET_MS = LOGO_SHRINK_DELAY_MS - 200;

// Round 4 retune — tagline starts ~550ms later so the logo's move
// is clearly the first motion, tagline catches up after a beat.
const TAGLINE_EXIT_DELAY_MS = 1300;
const TAGLINE_EXIT_DURATION_MS = 300;
const TAGLINE_EXIT_TRANSLATE_PX = 0;

const ORBIT_AVATAR_FILES = [
  "avatar-03-black-woman.jpg",
  "avatar-04-white-woman.jpg",
  "avatar-05-indian-woman.jpg",
  "avatar-06-latina-woman.jpg",
  "avatar-07-white-woman-2.jpg",
  "avatar-08-mixed-woman.jpg",
  "avatar-09-blonde-woman.jpg",
  "avatar-10-asian-woman.jpg",
  "avatar-11-middleeast-woman.jpg",
  "avatar-12-black-woman-2.jpg",
  "avatar-13-white-man.jpg",
  "avatar-14-white-man-2.jpg",
  "avatar-15-latino-man.jpg",
  "avatar-16-black-man.jpg",
  "avatar-17-white-man-3.jpg",
  "avatar-18-black-man-2.jpg",
  "avatar-19-indian-man.jpg",
  "avatar-20-middleeast-man.jpg",
  "avatar-21-asian-man.jpg",
  "avatar-22-mixed-man.jpg",
  "avatar-anna.jpg",
  "avatar-guest.jpg",
  "avatar-host.jpg",
  "avatar-james.jpg",
  "avatar-luke.jpg",
  "avatar-maya.jpg",
  "avatar-og-1.jpg",
  "avatar-og-2.jpg",
];

const ORBIT_DESKTOP_BREAKPOINT_PX = 768;

type Phase = "intro" | "morphing" | "slides" | "dismissed";

export function OnboardingTakeover() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const touchStartX = useRef<number | null>(null);
  // Guards against double-firing the dismiss POST (e.g. if a user
  // mashes Skip + Get-started, or if React re-renders during exit).
  const dismissedRef = useRef(false);

  const isLast = index === SLIDES.length - 1;
  const isFirst = index === 0;

  useEffect(() => {
    if (phase === "intro") {
      const t = setTimeout(() => setPhase("morphing"), INTRO_DURATION_MS);
      return () => clearTimeout(t);
    }
    if (phase === "morphing") {
      const t = setTimeout(() => setPhase("slides"), SLIDES_MOUNT_OFFSET_MS);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Lock body scroll while the takeover is mounted so the underlying
  // app can't scroll behind it. Restored on dismiss.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    // Optimistic — hide takeover instantly so the user never feels
    // a network round-trip on Skip / Get-started. Fire-and-forget;
    // a failed write means the takeover shows again on next sign-in
    // (acceptable — show-once is best-effort, not a hard guarantee).
    setPhase("dismissed");
    fetch("/api/onboarding/dismiss", { method: "POST", keepalive: true }).catch(
      (err) => {
        console.error("[onboarding] dismiss failed:", err);
      }
    );
  };

  const transitionTo = (nextIdx: number) => {
    setExiting(true);
    setTimeout(() => {
      setIndex(nextIdx);
      setExiting(false);
    }, WORD_EXIT_DURATION_MS);
  };

  const next = () => {
    if (isLast) {
      dismiss();
      return;
    }
    transitionTo(index + 1);
  };

  const prev = () => {
    if (isFirst) return;
    transitionTo(index - 1);
  };

  const skip = () => dismiss();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isLast, isFirst, index]);

  const [isOrbitDesktop, setIsOrbitDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(
      `(min-width: ${ORBIT_DESKTOP_BREAKPOINT_PX}px)`
    );
    const sync = () => setIsOrbitDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const orbitScriptLoadedRef = useRef(false);
  useEffect(() => {
    ORBIT_AVATAR_FILES.forEach((name) => {
      const img = new Image();
      img.src = `/assets/orbit-animation/avatars/${name}`;
    });
    if (
      !document.querySelector<HTMLScriptElement>('script[data-ob-orbit="1"]')
    ) {
      const s = document.createElement("script");
      s.src = "/assets/orbit-animation/orbit-lite.js?v=3";
      s.async = true;
      s.dataset.obOrbit = "1";
      s.onload = () => {
        orbitScriptLoadedRef.current = true;
      };
      document.head.appendChild(s);
    } else {
      orbitScriptLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (phase !== "slides") return;
    const s = SLIDES[index];
    if (!s?.orbitLayout) return;

    const tryInit = () => {
      const w = window as unknown as {
        initOrbitHero?: (id: string) => void;
        initOrbitTop?: (id: string) => void;
      };
      requestAnimationFrame(() => {
        try {
          if (isOrbitDesktop) {
            w.initOrbitHero?.("ob-orbit-canvas-desktop");
          } else {
            w.initOrbitHero?.("ob-orbit-canvas");
            w.initOrbitTop?.("ob-orbit-canvas-top");
          }
        } catch {
          // swallow — best-effort init
        }
      });
    };

    if (orbitScriptLoadedRef.current) {
      tryInit();
      return;
    }
    const id = window.setInterval(() => {
      if (orbitScriptLoadedRef.current) {
        window.clearInterval(id);
        tryInit();
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [phase, index, isOrbitDesktop]);

  if (phase === "dismissed") return null;

  const slide = SLIDES[index];
  const Visual = slide.Visual;

  const eyebrowDelay = 0;
  const titleStartDelay = 200;
  const titleWords = slide.titleLines.flatMap((l) => l.split(" ")).length;
  const titleEndDelay =
    titleStartDelay +
    (titleWords - 1) * TITLE_WORD_STAGGER_MS +
    WORD_DURATION_MS;
  const visualDelay = titleStartDelay + Math.round(titleEndDelay * 0.4);
  const bodyStartDelay = titleStartDelay + Math.round(titleEndDelay * 0.55);
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
      className={`onboarding-takeover-root fixed inset-0 z-[60] flex flex-col overflow-hidden bg-background text-foreground ${
        exiting ? "is-exiting" : ""
      }`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={introOrMorphing ? skipIntro : undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Trustead"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes ob-word-rise {
              to { opacity: 1; transform: translate3d(0, 0, 0); }
            }
            @keyframes ob-word-exit {
              to { opacity: 0; transform: translate3d(0, -110%, 0); }
            }
            .onboarding-takeover-root .word-mask {
              display: inline-block;
              overflow: hidden;
              vertical-align: top;
              line-height: inherit;
            }
            .onboarding-takeover-root .word-fill {
              display: inline-block;
              opacity: 0;
              transform: translate3d(0, 110%, 0);
              will-change: opacity, transform;
              animation: ob-word-rise ${WORD_DURATION_MS}ms ${WORD_EASING} forwards;
            }

            @keyframes ob-block-rise {
              to { opacity: 1; transform: translate3d(0, 0, 0); }
            }
            @keyframes ob-block-exit {
              to { opacity: 0; transform: translate3d(0, -24px, 0); }
            }
            .onboarding-takeover-root .block-rise {
              opacity: 0;
              transform: translate3d(0, 24px, 0);
              will-change: opacity, transform;
              animation: ob-block-rise ${BLOCK_FADE_DURATION_MS}ms ${WORD_EASING} forwards;
            }

            @keyframes ob-content-exit {
              to { opacity: 0; transform: translate3d(0, -12px, 0); }
            }
            .onboarding-takeover-root.is-exiting .slide-content {
              animation: ob-content-exit ${WORD_EXIT_DURATION_MS}ms ${WORD_EASING} forwards;
            }

            .onboarding-orbit-fade-in {
              animation: ob-orbit-fade-in 700ms ${WORD_EASING} forwards;
              opacity: 0;
            }
            @keyframes ob-orbit-fade-in {
              to { opacity: 1; }
            }

            @keyframes ob-cards-scroll {
              from { transform: translate3d(0, 0, 0); }
              to   { transform: translate3d(-50%, 0, 0); }
            }
            .onboarding-takeover-root .cards-track {
              animation: ob-cards-scroll 28s linear infinite;
              will-change: transform;
            }
            .onboarding-takeover-root .cards-window {
              -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
                      mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
            }

            @media (prefers-reduced-motion: reduce) {
              .onboarding-takeover-root .word-fill,
              .onboarding-takeover-root .block-rise,
              .onboarding-takeover-root .cards-track {
                animation: none !important;
                opacity: 1 !important;
                transform: none !important;
              }
            }
          `,
        }}
      />

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
          <p className="text-lg text-white sm:text-xl">
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
          {slide.orbitLayout &&
            (isOrbitDesktop ? (
              <div
                key="orbit-desktop"
                className="onboarding-orbit-fade-in absolute inset-0 z-0 pointer-events-none"
              >
                <canvas
                  id="ob-orbit-canvas-desktop"
                  className="block h-full w-full"
                />
              </div>
            ) : (
              <>
                <div
                  key="orbit-mobile-top"
                  className="onboarding-orbit-fade-in absolute top-0 left-0 right-0 h-1/2 z-0 pointer-events-none"
                >
                  <div className="mx-auto h-full w-full max-w-[680px]">
                    <canvas
                      id="ob-orbit-canvas-top"
                      className="block h-full w-full"
                    />
                  </div>
                </div>
                <div
                  key="orbit-mobile-bottom"
                  className="onboarding-orbit-fade-in absolute bottom-0 left-0 right-0 h-1/2 z-0 pointer-events-none"
                >
                  <div className="mx-auto h-full w-full max-w-[680px]">
                    <canvas
                      id="ob-orbit-canvas"
                      className="block h-full w-full"
                    />
                  </div>
                </div>
              </>
            ))}

          {/* Backdrop fade behind the persistent logo. Sits above the
              orbit canvas (z-0) and slide content (z-10) but below
              the logo (z-40). Slide-content scrolls UNDER it on
              mobile so headings can't bleed through the wordmark and
              orbit avatars fade out where they'd otherwise collide
              with the logo. Forest-green at top, transparent at the
              bottom edge. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-30 h-32 sm:h-28"
            style={{
              background:
                "linear-gradient(to bottom, var(--tt-body-bg) 0%, var(--tt-body-bg) 55%, transparent 100%)",
            }}
          />

          <div
            key={index}
            className="slide-content relative z-10 flex flex-1 items-start justify-center overflow-y-auto px-6 pt-36 pb-32 sm:items-center sm:pt-36 sm:pb-24"
          >
            <div className="flex w-full max-w-md flex-col items-center gap-5 text-center sm:max-w-xl sm:gap-8">
              <span
                className="block-rise inline-flex items-center rounded-pill border border-border/60 bg-background/40 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground"
                style={{ animationDelay: `${eyebrowDelay}ms` }}
              >
                {slide.eyebrow}
              </span>

              <AnimatedHeading
                titleLines={slide.titleLines}
                emphasis={slide.titleEmphasis}
                forceTitleBreak={slide.forceTitleBreak}
                stagger={TITLE_WORD_STAGGER_MS}
                baseDelay={titleStartDelay}
              />

              {Visual && !slide.orbitLayout && (
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
                className="block-rise flex w-full flex-col items-center gap-3 md:w-1/2"
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

          <div className="absolute inset-x-0 bottom-3 z-20 flex items-center justify-center gap-2 sm:bottom-8">
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
  forceTitleBreak,
  stagger,
  baseDelay,
}: {
  titleLines: [string, string];
  emphasis?: { word: string; className: string };
  forceTitleBreak?: boolean;
  stagger: number;
  baseDelay: number;
}) {
  let globalWordIdx = 0;
  return (
    <h1 className="font-serif !leading-[1.08] !tracking-tight !max-w-none !text-[clamp(28px,8vw,40px)] sm:!text-[50px] md:!text-[60px]">
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
        const splitAt = Math.max(0, arr.length - 2);
        const headWords = arr.slice(0, splitAt);
        const tailWords = arr.slice(splitAt);
        return (
          <span
            key={lineIdx}
            className={forceTitleBreak ? "block" : "inline sm:block"}
          >
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
            {lineIdx < titleLines.length - 1 && !forceTitleBreak && (
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
