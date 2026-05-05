"use client";

// ── Pending revisits (Loren) ──────────────────────────────────────
// - TrustDetailVisual (slide 4 "Trust"): placeholder mock of the
//   in-app trust-badge / connection breakdown. Replace once Loren
//   has a better UI for it.
// - VisibilityVisual (slide 5 "Privacy"): placeholder mock of the
//   listing-visibility / preview-listing graphic. Replace once
//   Loren has a better UI for it.

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
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
  // When true, the slide renders with the orbit canvases bookending
  // the text content (top arcs above eyebrow, bottom arcs below CTA).
  // The inline Visual slot is skipped on this layout.
  orbitLayout?: boolean;
  // When true, the heading keeps its authored line break on mobile
  // too (rather than collapsing to inline flow and re-wrapping based
  // on viewport width). Use for slides where the line break is part
  // of the visual rhythm.
  forceTitleBreak?: boolean;
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

// Logo morph — Loren tuned the overlap (Round 4): the move is still
// the dominant motion, but the shrink now starts at 60% of the move
// instead of 80% so the two read as a single fluid gesture rather
// than two discrete steps. Move 2000ms, shrink starts at 1200ms
// (60% of move) and runs 1000ms so the wordmark settles ~200ms
// after the move ends. Total morph window 2200ms.
const LOGO_MOVE_MS = 2000;
const LOGO_SHRINK_MS = 1000;
const LOGO_SHRINK_DELAY_MS = Math.round(LOGO_MOVE_MS * 0.6);
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

// Tagline exit — Loren retuned (Round 4): the logo should clearly
// move first and the tagline follow a noticeable half-second later.
// Bumped from 750ms → 1300ms so there's ~550ms of pure logo motion
// before the tagline starts drifting up + fading. Reads as the logo
// leaving and the tagline trying to catch up, instead of both
// happening together.
const TAGLINE_EXIT_DELAY_MS = 1300;
const TAGLINE_EXIT_DURATION_MS = 300;
const TAGLINE_EXIT_TRANSLATE_PX = 0;

// Orbit avatar filenames — used both by the orbit JS (which has its
// own copy of these paths) and by the React preloader on this page,
// which fires `new Image()` for each on mount so the orbit slide can
// init from cache instead of waiting on the network.
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

// Breakpoint for desktop orbit — above this width, render ONE
// full-bleed canvas (full circular orbit around centered text, like
// the v7 landing page hero). Below it, dual-canvas top + bottom arcs.
// 768px matches Tailwind's `md` so the layout switch lines up with
// the rest of the responsive system. The orbit JS internally goes
// into "desktop mode" at canvas widths > 680, so any breakpoint
// above 680 does the right thing.
const ORBIT_DESKTOP_BREAKPOINT_PX = 768;

type Phase = "intro" | "morphing" | "slides" | "dismissed";

// VARIANT B — Distributed (magazine) layout.
// Differs from variant A in two places:
//   1. Inner stack uses justify-content: space-between (not safe
//      center) — first child (eyebrow) anchors to the TOP of the
//      available rectangle, last child (CTA + skip row) anchors to
//      the BOTTOM, and middle children distribute evenly between.
//   2. Stack gap drops from gap-5 (Tailwind) to gap-0 — distribution
//      via space-between provides the air; an explicit gap on top
//      compounds awkwardly.
// "safe" can't prefix "space-between" in CSS (only alignment values
// like center/start/end accept it), so on viewports too small for
// distribution to fit, content simply overflows the stack and the
// outer .slide-content's overflow-y-auto handles scroll. Same
// graceful-degrade as variant A, just with a different rest layout.
export default function SandboxOnboardingPageB() {
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

  // Track viewport so we can render either the desktop full-bleed
  // single canvas (full circular orbit around centered text) or the
  // mobile dual-canvas bookend layout (top arc + bottom arc).
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

  // Preload — kick off avatar image fetches and inject the orbit
  // script as soon as the page mounts. By the time the user lands on
  // slide 2, both are warm in cache: the orbit JS is parsed, and its
  // Promise.all over `new Image()` resolves immediately, so init →
  // first frame is effectively instant.
  const orbitScriptLoadedRef = useRef(false);
  useEffect(() => {
    ORBIT_AVATAR_FILES.forEach((name) => {
      const img = new Image();
      img.src = `/assets/orbit-animation/avatars/${name}`;
    });
    if (
      !document.querySelector<HTMLScriptElement>('script[data-sb-orbit="1"]')
    ) {
      const s = document.createElement("script");
      // Version query string busts Cloudflare's 4-hour edge cache
      // when we ship orbit JS changes. Bump this when you edit the
      // script so users get the new file without a hard refresh.
      s.src = "/assets/orbit-animation/orbit-lite.js?v=3";
      s.async = true;
      s.dataset.sbOrbit = "1";
      s.onload = () => {
        orbitScriptLoadedRef.current = true;
      };
      document.head.appendChild(s);
    } else {
      orbitScriptLoadedRef.current = true;
    }
  }, []);

  // Init the orbit each time the orbit slide becomes active. Picks
  // the right canvas IDs based on viewport: one big canvas on
  // desktop, top + bottom arc canvases on mobile.
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
            w.initOrbitHero?.("sb-orbit-canvas-desktop");
          } else {
            w.initOrbitHero?.("sb-orbit-canvas");
            w.initOrbitTop?.("sb-orbit-canvas-top");
          }
        } catch {
          // swallow — sandbox iteration; worst case is no orbit
        }
      });
    };

    if (orbitScriptLoadedRef.current) {
      tryInit();
      return;
    }
    // Script still loading — poll briefly for it to finish, then init.
    const id = window.setInterval(() => {
      if (orbitScriptLoadedRef.current) {
        window.clearInterval(id);
        tryInit();
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [phase, index, isOrbitDesktop]);

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
      className={`sandbox-onboarding-root relative flex h-dvh w-screen flex-col overflow-hidden bg-background text-foreground ${
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
            .sandbox-orbit-fade-in {
              animation: sb-orbit-fade-in 700ms ${WORD_EASING} forwards;
              opacity: 0;
            }
            @keyframes sb-orbit-fade-in {
              to { opacity: 1; }
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
          {/* Orbit canvases — two layouts:
              - Desktop (≥ md): one full-bleed canvas, the orbit JS
                renders a full circle centered on the canvas with a
                radial fade in the middle so the text reads cleanly.
                Mirrors the v7 landing-page hero exactly.
              - Mobile (< md): two stacked canvases (top half + bottom
                half). The orbit JS pushes the orbit center off the
                canvas on mobile so each renders just an arc — text
                sits in the empty middle band where they meet.
              Both layouts fade in (opacity 0 → 1) when the orbit slide
              is active so the canvas appears smoothly after init
              instead of popping in. */}
          {slide.orbitLayout &&
            (isOrbitDesktop ? (
              <div
                key="orbit-desktop"
                className="sandbox-orbit-fade-in absolute inset-0 z-0 pointer-events-none"
              >
                <canvas
                  id="sb-orbit-canvas-desktop"
                  className="block h-full w-full"
                />
              </div>
            ) : (
              <>
                <div
                  key="orbit-mobile-top"
                  className="sandbox-orbit-fade-in absolute top-0 left-0 right-0 h-1/2 z-0 pointer-events-none"
                >
                  <div className="mx-auto h-full w-full max-w-[680px]">
                    <canvas
                      id="sb-orbit-canvas-top"
                      className="block h-full w-full"
                    />
                  </div>
                </div>
                <div
                  key="orbit-mobile-bottom"
                  className="sandbox-orbit-fade-in absolute bottom-0 left-0 right-0 h-1/2 z-0 pointer-events-none"
                >
                  <div className="mx-auto h-full w-full max-w-[680px]">
                    <canvas
                      id="sb-orbit-canvas"
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

          {/* Adaptive vertical layout (Round 4 v2):
              - .slide-content provides the safe-zone padding (under
                the persistent logo at top and above the dots at
                bottom) and is the scroll container if content can't
                fit at very small heights.
              - The inner stack uses min-h-full + justify-center so it
                ALWAYS centers within the available rectangle when
                content fits, and grows past it (triggering scroll on
                .slide-content) only when content actually overflows.
              - Outer wrapper uses h-dvh, not h-screen, so the layout
                tracks the *visible* viewport on mobile Safari/Chrome
                (where the URL bar collapses on scroll). */}
          <div
            key={index}
            className="slide-content relative z-10 flex flex-1 justify-center overflow-y-auto px-6 pt-36 pb-32 sm:pt-36 sm:pb-24"
          >
            <div className="flex min-h-full w-full max-w-md flex-col items-center justify-between gap-3 text-center sm:max-w-xl sm:gap-4">
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
    // Mobile heading sized to keep 2-line headings on a 390px phone
    // and 3-line headings (slide 5) within reach without forcing the
    // CTA below the fold. Tightened from clamp(34,10.5vw,44) which
    // pushed slides 3 + 5 to 4 lines on small phones and put the
    // Continue button below the visible viewport. Desktop sizes
    // unchanged at sm: 50px / md: 60px.
    <h1 className="!leading-[1.08] !tracking-tight !max-w-none !text-[clamp(28px,8vw,40px)] sm:!text-[50px] md:!text-[60px]">
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
          // Default mobile: lines flow inline so the heading wraps
          // naturally (no forced break). sm+: each line gets its own
          // block so the heading reads exactly as `titleLines` was
          // authored. When forceTitleBreak is set, mobile keeps the
          // authored break too.
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
            {/* Trailing space so adjacent inline lines don't run
                together on mobile. Hidden on sm+ where each line is
                its own block and a trailing space is meaningless. */}
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
// Slide 4 trust-detail visual (Round 4 rebuild). Static replica of
// the live ConnectionPopover / ChainRow output (see
// src/components/trust/connection-breakdown.tsx) with seeded data
// and real avatar portraits from /assets/orbit-animation/avatars/.
//
// Shows TWO paths to the target so the "multiple connections" idea
// reads at a glance — one 2° path (1 connector) and one 3° path (2
// connectors), the same pattern the real popover renders for users
// with multiple routes to the host. The first connector in each
// path is "known" (avatar + first name visible); deeper hops are
// anonymized (blurred avatar + initials with periods + EyeOff
// overlay), matching the privacy treatment in the live component.
//
// Avatars are pre-loaded by the page-level <Image> preloader so this
// renders without a flash. If /assets/orbit-animation/avatars/ is
// ever moved, only this constant needs updating.
const TRUST_VISUAL = {
  target: { name: "Maya Chen", avatar: "/assets/orbit-animation/avatars/avatar-anna.jpg" },
  viewer: { name: "You", avatar: "/assets/orbit-animation/avatars/avatar-host.jpg" },
  paths: [
    {
      label: "Path 1 · via Anna",
      // viewer-first: You → Anna → Maya
      nodes: [
        { name: "You", known: true, isYou: true, avatar: "/assets/orbit-animation/avatars/avatar-host.jpg" },
        { name: "Anna", known: true, avatar: "/assets/orbit-animation/avatars/avatar-04-white-woman.jpg" },
        { name: "Maya Chen", known: true, isTarget: true, avatar: "/assets/orbit-animation/avatars/avatar-anna.jpg" },
      ],
      // Strengths target → connector → you (UI reverses for display)
      strengths: [42, 28],
    },
    {
      label: "Path 2 · via James",
      // viewer-first: You → James → ??? → Maya (3° path; middle hop anonymized)
      nodes: [
        { name: "You", known: true, isYou: true, avatar: "/assets/orbit-animation/avatars/avatar-host.jpg" },
        { name: "James", known: true, avatar: "/assets/orbit-animation/avatars/avatar-james.jpg" },
        { name: "Luke", known: false, avatar: "/assets/orbit-animation/avatars/avatar-luke.jpg" },
        { name: "Maya Chen", known: true, isTarget: true, avatar: "/assets/orbit-animation/avatars/avatar-anna.jpg" },
      ],
      strengths: [22, 35, 31],
    },
  ],
};

function TrustDetailVisual() {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3 text-left">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="text-[13px] font-semibold leading-tight">
          {TRUST_VISUAL.target.name} is connected to you via{" "}
          {TRUST_VISUAL.paths.length} connections
        </div>
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">
        Trust Score:{" "}
        <span className="font-semibold text-foreground">31 pts (Strong)</span>
      </div>

      <div className="mt-2.5 space-y-2">
        {TRUST_VISUAL.paths.map((path) => (
          <ChainRow key={path.label} path={path} />
        ))}
      </div>
    </div>
  );
}

// Mirrors the live ChainRow visual: nodes flow target-on-left →
// You-on-right with a strength pill between each pair. Anonymized
// nodes (deeper than the first connector) blur their avatar and
// overlay an EyeOff so the "hidden identity" treatment matches
// the live popover.
function ChainRow({
  path,
}: {
  path: typeof TRUST_VISUAL.paths[number];
}) {
  // Reverse: target on the left, You on the right. Strengths flip
  // to align with adjacent pairs.
  const displayNodes = [...path.nodes].reverse();
  const displayStrengths = [...path.strengths].reverse();
  return (
    <div className="rounded-xl border border-border/60 bg-background/30 p-2.5">
      <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
        {path.label}
      </div>
      <div className="mt-2 flex items-center justify-center gap-1">
        {displayNodes.map((node, i) => (
          <span key={`${node.name}-${i}`} className="contents">
            {i > 0 && <ChainStrengthPill strength={displayStrengths[i - 1]} />}
            <ChainAvatar
              name={node.name}
              avatar={node.avatar}
              known={node.known}
              isYou={Boolean(node.isYou)}
              isTarget={Boolean(node.isTarget)}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

function ChainAvatar({
  name,
  avatar,
  known,
  isYou,
  isTarget,
}: {
  name: string;
  avatar: string;
  known: boolean;
  isYou: boolean;
  isTarget: boolean;
}) {
  const first = name.split(" ")[0];
  const periodedInitials = first
    .slice(0, 2)
    .toUpperCase()
    .split("")
    .map((c) => `${c}.`)
    .join("");
  const label = isYou ? "You" : known ? first : periodedInitials;
  const showAnonymized = !known && !isTarget;
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div
        className={`relative h-9 w-9 overflow-hidden rounded-full border-2 ${
          isTarget ? "border-brand-300" : "border-border/60"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatar}
          alt={label}
          className={`h-full w-full object-cover ${
            showAnonymized ? "scale-125 blur-md" : ""
          }`}
        />
        {showAnonymized && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <EyeOff className="h-3.5 w-3.5 text-[var(--tt-cream-muted)]" strokeWidth={2.25} />
          </span>
        )}
      </div>
      <span className="max-w-[4rem] truncate text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function ChainStrengthPill({ strength }: { strength: number }) {
  // Same violet-by-strength buckets as the live LinkStrengthPill.
  const bucket =
    strength >= 50
      ? "bg-violet-700"
      : strength >= 30
        ? "bg-violet-500"
        : strength >= 15
          ? "bg-violet-400"
          : "bg-violet-300 text-violet-900";
  return (
    <span
      className={`mx-0.5 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[9px] font-semibold text-white ${bucket}`}
    >
      {strength}
    </span>
  );
}

// Slide 5 visibility visual (Round 4 rebuild). Shows the three top-
// level visibility modes AND a glimpse of the granular sub-controls
// for "who sees the preview" + "who sees the full listing." Pulls
// from the live edit-listing-form access-rules pattern: each gate
// has a degree threshold (1°, 2°, 3°, anyone) so hosts can dial
// audiences independently — preview can be more permissive than
// full listing, never less.
//
// The compact layout favors clarity over completeness — a 2-row
// granular block hints at deeper config without trying to surface
// the full picker matrix on a phone-sized slide.
function VisibilityVisual() {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3 text-left">
      <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
        Listing visibility
      </p>
      <div className="space-y-1.5">
        <ScopeRow
          icon={<Lock className="h-4 w-4" />}
          title="Private"
          subtitle="Only people you invite"
          active={false}
        />
        <ScopeRow
          icon={<Eye className="h-4 w-4" />}
          title="Preview"
          subtitle="Network sees a teaser; you control the rest"
          active={true}
        />
        <ScopeRow
          icon={<Users className="h-4 w-4" />}
          title="Open"
          subtitle="Anyone in your network can request"
          active={false}
        />
      </div>

      {/* Granular sub-controls — only the active mode (Preview) reveals
          this section in the live form. Two gates: who sees the
          teaser, and who sees the full address + contact. */}
      <div className="mt-3 rounded-xl border border-brand-300/40 bg-brand-300/[0.08] p-2.5">
        <GranularRow
          label="Who sees the preview"
          value="Friends of friends"
          icon={<Eye className="h-3.5 w-3.5" />}
        />
        <div className="my-1.5 h-px bg-border/40" />
        <GranularRow
          label="Who sees the full listing"
          value="Direct connections"
          icon={<Users className="h-3.5 w-3.5" />}
        />
      </div>
    </div>
  );
}

function GranularRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-brand-300/20 text-brand-300">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="shrink-0 rounded-full bg-brand-300/15 px-2 py-0.5 text-[10px] font-semibold text-brand-300">
        {value}
      </span>
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
