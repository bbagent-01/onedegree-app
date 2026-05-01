# Onboarding — Locked Design Spec

**Chosen sequence:** `/sandbox/onboarding-2` (the orbit variant).
**Source of truth:** `src/app/sandbox/onboarding-2/page.tsx`
**Live URL:** https://trustead.app/sandbox/onboarding-2

The non-orbit variant at `/sandbox/onboarding` is kept for reference but is NOT the locked design.

---

## What's locked

The full sequence: intro logo morph → 5 onboarding slides → dismiss.

### Intro phase (0 → ~6 s)

- Trustead wordmark draws in via SVG centerline animation (~1.4 s).
  - Logo iframe: `/assets/logo-animation/trustead-logo-animation-white.html`
- Tagline **"Rent your home with trust"** rises word-by-word, starting BEFORE the wordmark finishes (`TAGLINE_DELAY_MS = 900`).
- Both hold visible for ~1.5 s.
- **Morph** (3400 ms in):
  - Logo wrapper translates up + shrinks (2000 ms move, 1000 ms shrink starting at 1600 ms — total ~2600 ms). Easing: `cubic-bezier(0.83, 0, 0.17, 1)`.
  - Tagline waits 500 ms after morph begins, then fades in 300 ms with no extra translate (the wrapper carries it up at the logo's speed; the tagline just dissolves on the way).
- Slide content mounts at `LOGO_SHRINK_DELAY_MS - 200 = 1400 ms` into morph — so the eyebrow + first heading words are already rising when the logo settles into the header.

Tokens (in `page.tsx`):
```
TAGLINE_EXIT_DELAY_MS    = 500
TAGLINE_EXIT_DURATION_MS = 300
TAGLINE_EXIT_TRANSLATE_PX = 0
LOGO_MOVE_MS             = 2000
LOGO_SHRINK_MS           = 1000
LOGO_SHRINK_DELAY_MS     = 1600
SLIDES_MOUNT_OFFSET_MS   = 1400
```

### Slides

All slides share: persistent top-center logo (z-40), centered text content (z-10), pagination dots pinned to bottom, Continue + back-arrow + Skip CTA stack capped at `md:w-1/2` on desktop (full-width on mobile).

**Slide 1 — The problem**
- Heading: `Renting your actual home, / actually isn't great`
  ("actually" italic + `text-brand-300`)
- Body (tuple — desktop line break): `So most people just don't do it.` / `Losing out on monetizing their empty home.`
- Visual: `PainPointsCardsVisual` — horizontal carousel of 5 cards (right→left scroll, edges masked, `mr-3` per card so the keyframe `to: -50%` lands seam-perfectly):
  1. Putting your stuff away and taking it out every time
  2. Bothering your neighbors
  3. Exposing your nice things
  4. Coverage doesn't mean caring
  5. Your listing is public

**Slide 2 — The solution** (orbit)
- Heading: `Rent only to / friends of friends` ("only" italic + `text-brand-300`).
- `forceTitleBreak: true` — the authored break holds on mobile too.
- Body: `Trust your guests, keep your stuff out, and keep your listing private.` (string, natural wrap).
- Visual: orbit canvases. `orbitLayout: true` flag swaps the slide layout:
  - **Desktop (≥ 768 px):** ONE full-bleed canvas (`#sb-orbit-canvas-desktop`). Orbit JS runs in desktop mode — full circular orbit centered on screen, radial fade behind the text.
    - Fixed-pixel geometry (no shrink-to-fit): `ring1Radius = 360`, `ring2Radius = 470`, `ring3Radius = 590`, `centerFadeRadius = 270`.
    - Fixed avatar sizes: `ring1 = 88`, `ring2 = 50`, `ring3 = 38`.
    - On narrow viewports the outer rings extend past the canvas edges — avatars get clipped (intentional) instead of scaling down.
  - **Mobile (< 768 px):** TWO canvases (`#sb-orbit-canvas-top` + `#sb-orbit-canvas`), top half + bottom half, each capped at 680 px wide so the orbit JS hits its mobile dual-arc rendering. The top canvas's `cy` pull-up was bumped from 260 → 380 px so avatars ride high in the canvas, leaving a clean gap above the text.
- **Preload** on page mount: `new Image()` for all 28 avatars + inject the orbit script tag — assets are warm in cache by the time the user reaches slide 2.
- **Fade-in:** canvas wrappers run a `sandbox-orbit-fade-in` keyframe (opacity 0 → 1 over 700 ms) when slide 2 mounts.
- Cache-bust: orbit script is loaded as `/assets/orbit-animation/orbit-lite.js?v=3`. Bump the `v=N` when editing the JS.

**Slide 3 — How it works**
- Heading: `Build trust by vouching / for people you know`
- Body (tuple — desktop line break): `Invite people you know. They invite people they know.` / `It's quick and easy to build your network.`
- Visual: `VouchPickerVisual` — recreation of the in-app vouch-modal type picker ("How do you know them?" + Vouch / Vouch+ option cards with Shield-blue + Star-amber icons).

**Slide 4 — Trust** (PLACEHOLDER VISUAL)
- Heading: `Rent to people / connected to you.`
- Body: `See exactly how — through whom, and how strongly.`
- Visual: `TrustDetailVisual` — placeholder mock of the in-app trust-badge / connection breakdown panel. **Replace before B3 ships** once Loren has a better UI for it.

**Slide 5 — Privacy** (PLACEHOLDER VISUAL)
- Heading: `Control who sees your / listing, or listing preview`
- Body: `Make it fully private, share a teaser only, or open it up to friends-of-friends. Your call.`
- Visual: `VisibilityVisual` — placeholder mock of the listing-visibility / preview-listing graphic. **Replace before B3 ships** once Loren has a better UI for it.

---

## Cross-cutting design tokens

Word-stagger on heading + body:
```
WORD_DURATION_MS         = 600
WORD_EASING              = cubic-bezier(0.25, 0.46, 0.45, 0.94)  // power2.out
TITLE_WORD_STAGGER_MS    = 30
BODY_WORD_STAGGER_MS     = 12
BLOCK_FADE_DURATION_MS   = 500
WORD_EXIT_DURATION_MS    = 400
```
Each word rises from `translateY(110%)` to 0 through an `overflow: hidden` mask. Slide-exit is a uniform fade on the `.slide-content` wrapper (per-word exit was flickery when later-staggered words hadn't entered yet).

Heading orphan binding: every line's last two words sit inside an explicit `whitespace-nowrap` span so no wrap can leave a single word stranded — especially important on mobile where authored lines flow inline and re-wrap freely.

Heading sizes: `clamp(34px, 10.5vw, 44px)` mobile, `sm:50px`, `md:60px`. Serif. `!leading-[1.08]` `!tracking-tight`.

CTA stack: `block-rise flex w-full flex-col items-center gap-3 md:w-1/2`. Continue button + back-arrow + Skip live in this stack. Back arrow is `absolute left-0` of the row inside the CTA stack so it lines up with Continue's left edge on every viewport.

---

## Files to copy / lift for B3 integration

| File | What |
|---|---|
| `src/app/sandbox/onboarding-2/page.tsx` | Whole sequence — the only React file you need |
| `public/assets/orbit-animation/orbit-lite.js` | Orbit canvas animation, recolored to brand-300 + dark-forest fade |
| `public/assets/orbit-animation/avatars/avatar-*.jpg` | 28 avatars referenced by the orbit JS |
| `public/assets/onboarding-problems/problem-0{1..5}-*.webp` | 5 problem-card images for slide 1 |
| `public/assets/logo-animation/trustead-logo-animation-white.html` | Logo draw-in iframe |

The page imports only from `react` + `lucide-react` + the project's tailwind classes — no other dependencies.

---

## B3 integration TODO

This sandbox is `useState`-only (refresh resets to slide 1, no DB writes, no auth gate). Porting into the real app needs:

1. **Auth gate.** Mount the flow inside the post-login app shell, not the public route.
2. **"Shown once" persistence.** Add a `users.onboarding_seen_at` timestamp column. Set it when the user dismisses (Skip, Get started, or last-slide Continue). On login, skip the flow if `onboarding_seen_at` is non-null.
3. **Replace placeholder visuals.** `TrustDetailVisual` (slide 4) and `VisibilityVisual` (slide 5) are mocks — both are flagged with TODO comments at the top of `onboarding-2/page.tsx`.
4. **Cookie banner.** The sandbox hides the global cookie banner via a `body:has(.sandbox-onboarding-root)` selector. The real flow won't need that hack — coordinate with whatever cookie-banner timing the app uses.
5. **Get started CTA.** On the last slide the button reads "Get started" but currently just dismisses to a placeholder screen. Wire it to the real next-step route (probably `/onboarding/profile` or wherever post-onboarding lands).

---

## Constants & toggles you can tune without redesigning

All in `src/app/sandbox/onboarding-2/page.tsx` near the top:

- Intro pacing: `INTRO_DURATION_MS`, `TAGLINE_DELAY_MS`
- Logo morph: `LOGO_MOVE_MS`, `LOGO_SHRINK_MS`, `LOGO_SHRINK_DELAY_MS`, `LOGO_EASING`
- Slide entry: `SLIDES_MOUNT_OFFSET_MS`, `WORD_DURATION_MS`, `TITLE_WORD_STAGGER_MS`, `BODY_WORD_STAGGER_MS`, `BLOCK_FADE_DURATION_MS`
- Tagline exit: `TAGLINE_EXIT_DELAY_MS`, `TAGLINE_EXIT_DURATION_MS`, `TAGLINE_EXIT_TRANSLATE_PX`
- Orbit responsive cutoff: `ORBIT_DESKTOP_BREAKPOINT_PX` (default 768)
- Orbit ring sizes/radii: `public/assets/orbit-animation/orbit-lite.js` desktop branch + `tickTop` mobile branch.
