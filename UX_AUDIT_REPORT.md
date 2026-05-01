# Trustead UX1 — UX/UI Audit Report

Audit of [trustead.app](https://trustead.app) (production). Branch: `feat/ux1-ux-audit`.

**Scope (this branch):** every primary route EXCEPT `/`, `/browse`, `/dashboard` (those will be replaced by B4 layout integration).

**Severity tags:**
- **CRITICAL** — broken, blocks user task, must fix
- **MEDIUM** — clearly wrong, fixable, fix in same round
- **NIT** — polish-tier, batch later
- **functional — defer to B-series** — finding requires functional/auth/data change; logged only

**Theme judged against:** Trustead canonical (forest green `#07221B`, cream `#F5F1E6`, mint `#BFE2D4`, DM Serif Display + DM Sans, 24px page-frame radius, borders over shadows).

---

## Round 1 — 2026-05-01

### Surfaces audited
- `/sign-in` (signed-out)
- `/sign-up` (signed-out)
- Onboarding takeover (live + `/sandbox/onboarding-2` reference) — desktop + mobile
- `/vouch`
- `/profile/edit`
- `/listings/[id]`
- `/inbox` + `/inbox/[threadId]`
- `/settings` + sub-pages (`hosting`, `notifications`, `phone`)
- `/profile/[id]`
- `/alerts`, `/trips`, `/wishlists`, `/invite`, `/proposals`, `/help`
- `/join/[token]`
- `/dev` (gate verification)
- Error / empty states across the above

### Findings

#### `/sign-in` (desktop 1280 + mobile 375)

- **CRITICAL — Primary CTA "Continue with phone" is visually indistinguishable from disabled state.** Ghost outline + dim cream text on dark green; reads as un-clickable. Meanwhile "Continue with Google" is a solid bordered button with brand logo, so visual hierarchy says Google is primary even though page header says "Sign in with your phone number." Fix: stronger fill (mint) on the phone button when valid; clearer disabled state when invalid.
- **CRITICAL — Empty submit produces no feedback.** Clicking "Continue with phone" with empty input does nothing — no shake, no inline error, no toast. User assumes the form is broken. Fix: validate on click and show inline error ("Enter a phone number" / "Use international format").
- **CRITICAL — No way back to home / no logo.** Page has no header chrome, no Trustead wordmark, no "← Back" link. User who lands cold has no orientation and no escape (only browser back).
- **CRITICAL — No `/sign-up` link.** A new visitor on `/sign-in` has nothing pointing them at sign-up. Buried deep in confusing Google caveat copy ("New here? Sign up with your phone first.") which is functionally a sign-up link but doesn't read as one and isn't a link.
- **MEDIUM — Phone input has no placeholder.** Input is empty cream rectangle; no format hint. Add placeholder like `+1 (555) 123-4567` so user knows expected format.
- **MEDIUM — Phone input has unexplained icon at right edge.** Looks like a partial signal/keypad glyph; no tooltip, no purpose. Either remove or attach meaning.
- **MEDIUM — Page header copy contradicts sign-in fallbacks.** Header reads "Sign in with your phone number" but the page also offers Google + email/password. Either lead with the multi-modal truth or hide non-primary methods behind a disclosure.
- **MEDIUM — Google fallback caveat is confusing.** "Google sign-in only works for accounts that already added the matching email. New here? Sign up with your phone first." — reads as a workaround for a bug the user didn't cause. Functional finding (auth account-linking). *functional — defer to B-series.*
- **NIT — Subtitle "Sign in with your phone number." has trailing period; CTA buttons read like sentences without punctuation.** Voice inconsistency.

#### `/sign-up` (desktop 1280 + mobile 375)

- **CRITICAL — Same disabled-looking primary CTA as `/sign-in`.** "Continue" button uses ghost outline + low-contrast text. Looks unclickable.
- **CRITICAL — No back arrow / logo / nav.** Same orientation/escape problem as `/sign-in`.
- **CRITICAL — Headline wraps onto two lines awkwardly on desktop.** "Create your / account" — at 1280px the headline column is ~470px wide with serif size ~110px, forcing the wrap. Either widen the headline column or shrink the type.
- **MEDIUM — `/sign-in` link is buried under terms paragraph.** "Already have an account? Sign in" should be top-right of the page or above the form, not after a 4-line legal block.
- **MEDIUM — "Day is not required and not stored" microcopy is good privacy reassurance, but month/year selectors look like generic dropdowns** with no calendar affordance. Acceptable, but native `<select>` styling on mobile may diverge from cream styled controls — verify on real iOS.
- **NIT — "Cake" emoji icon next to day notice doesn't match the otherwise iconographic Lucide-style line icons in app.** Minor brand inconsistency.

#### Onboarding takeover — `/sandbox/onboarding-2` (locked source) + live `OnboardingTakeover` (mobile 390 + desktop 1280)

The live `OnboardingTakeover` is a near-identical port of the sandbox per its own header comment, so all findings below apply to BOTH `src/app/sandbox/onboarding-2/page.tsx` AND `src/components/onboarding/OnboardingTakeover.tsx`.

**Mobile (390×844, iPhone 12 Pro emulation) — every slide affected:**

- **CRITICAL — Persistent top-center logo collides with slide content on every mobile slide.** Logo wrapper is `absolute z-40 top: 1.75rem` (28px), wordmark width `13.5rem`. Slide content has `pt-32 pb-20` (128px top padding) but uses `flex flex-1 items-center justify-center` — `items-center` on an `overflow-y-auto` container centers tall content, which on a 390×844 phone pushes the eyebrow chip and first heading line **above** the safe zone, overlapping the logo. Confirmed visually on slides 1, 3, 4, 5. Slide 5 is the worst — "Control who" first line renders right through the trustead wordmark.
- **CRITICAL — Pagination dots overlap the Continue button.** Dots are absolutely positioned at `bottom-6` (24px from viewport bottom). The CTA stack is the last item in slide-content, ending at `pb-20` (80px from bottom). On mobile, the CTA stack's natural height (Continue py-3.5 + gap-3 + Skip py-1.5) plus the back-arrow row pushes the bottom of the stack into the dots zone. Visible on slides 1, 3, 5.
- **CRITICAL — Skip link sits below the visible viewport on slides 1, 3, 5.** Combination of tall heading (clamp(34, 10.5vw, 44) = ~41px on 390px) wrapping to 3-4 lines + visual + body + Continue + dots leaves no room for Skip.
- **CRITICAL — Slide 2 (orbit) has avatars overlapping the trustead wordmark, the Continue button, AND the Skip link.** Mobile orbit canvases (top + bottom arcs) have fixed avatar sizes (`ring1=88, ring2=50, ring3=38`) and radii that crowd the small phone viewport. Multiple avatars sit on top of the logo, the green Continue pill, and the Skip text.
- **CRITICAL — Slide 3 heading wraps to 4 lines on 390px** ("Build trust / by vouching for / people you know" → renders as "Build trust / by vouching for / people you / know"). Eats too much vertical space, contributing to CTA overflow.
- **MEDIUM — On scroll, slide-content scrolls UNDER the absolute-positioned logo (z-40)** with no visual barrier. Heading text bleeds through wordmark. Need a solid mask/gradient behind the logo so scrolling content fades out as it passes underneath.
- **MEDIUM — Eyebrow chip placement reads as "tag attached to logo"** rather than "tag for the slide content" because the chip is jammed up against the logo with no spacer.

**Desktop (1280×900) — generally OK but not free of issues:**

- **MEDIUM — Pagination dots overlap the Skip text on slide 1 desktop.** Dots row sits immediately under "Skip" — visually they read as one unit. Add 12px+ vertical separation.
- **NIT — Slide 2 (orbit desktop) avatar rings extend past the canvas edges intentionally per spec, but on 1280px the ring3 (radius 590) avatars get clipped at the left/right edges.** Acceptable per locked spec, just noting.

**Recommended fix patterns:**
1. **Logo backdrop mask:** add a `linear-gradient(to bottom, var(--tt-body-bg) 0%, var(--tt-body-bg) 70%, transparent 100%)` mask under the logo wrapper so scrolling content fades behind it instead of bleeding through.
2. **Mobile slide-content layout:** swap `items-center` for `items-start` on `< sm` viewports so the top of the content stays anchored under the logo zone instead of center-overflowing.
3. **Increase mobile top padding from `pt-32` (128px) to `pt-36` (144px) or `pt-40` (160px)** to give more clearance under the logo.
4. **Move pagination dots out of viewport-absolute zone** — render them inside the slide-content as the LAST item, below the CTA stack with proper margin. Or push the CTA stack higher up via reserved space at the bottom.
5. **Mobile heading sizing:** reduce to `clamp(28px, 8vw, 38px)` so 3-line headings stay 2-line on most phones and 4-line headings stay 3.
6. **Mobile orbit:** push avatars further from center on small viewports — increase radii or shrink avatar diameters so the center text/CTA zone is clear.

---

#### Public legal pages — `/privacy`, `/terms`, `/legal-status` (desktop 1280)

- **CRITICAL — Body text is invisible.** `.legal-prose` in `src/app/globals.css` hardcodes `color: #1a1d21` (dark navy) — a color from the pre-refactor Attio Light theme that was meant for white backgrounds. The page now sits on the Trustead forest-green body bg (`#07221B`), so the legal prose is dark navy on dark green = unreadable. Headings, eyebrow dates, alpha banner, and TOC are visible because they use other tokens; the actual paragraphs of legal text are not. **Compliance + accessibility blocker.**
- **CRITICAL — Section numbers ("1.", "2.", etc.) render in purple `#734796`** — leftover Attio accent. Not in the Trustead palette and clashes with mint/cream tokens. Replace with `var(--tt-mint)` or `var(--tt-cream)`.
- **MEDIUM — `.legal-prose strong` color is also `#1a1d21`** — bolded inline emphasis is invisible too.
- **MEDIUM — `.legal-prose a` link color is `#1a1d21` underlined** — invisible until hover (which switches to `#734796` purple).
- **MEDIUM — `.legal-prose code` block is `bg: #f8f9fa` (light gray)** — light gray on dark green = high-contrast island that doesn't match the Trustead theme.
- **MEDIUM — `.legal-prose h2` border-top is `#e5e7eb`** — wrong rule color; should use `var(--tt-rule)`.
- **MEDIUM — Top header "Trustead" wordmark is just text, not the logo SVG.** Inconsistent with the rest of the brand.
- **MEDIUM — "Back to app" link points to `/browse`** — but `/browse` is excluded from this audit because B4 is replacing it. After B4 ships, verify this still resolves.

---

#### `/dev` and 404 routing — middleware behavior

- **CRITICAL — Hitting `/dev` (or any non-existent route like `/foo`) while signed-out redirects to `accounts.trustead.app/sign-in`** — Clerk's hosted default UI. Off-brand: solid black bg, default purple Clerk button, "Secured by Clerk" footer, completely different typography. Custom Trustead `/sign-in` is bypassed. Anyone deep-linking into the app while signed-out hits this page.
  - **Two sub-issues:**
    1. Custom `/sign-in` should be the destination, not the Clerk-hosted page. Configure Clerk's `signInUrl` / middleware redirect to point at `/sign-in`.
    2. Bogus URLs (`/this-route-does-not-exist`) should hit a real Trustead-themed 404 page, not gate-then-Clerk. Middleware needs to let `not-found.tsx` resolve before forcing auth on unmatched routes.
  - *functional — defer to B-series for the middleware/Clerk config; only the styling fix to whatever Clerk page does survive can land in this audit.*

---

#### `/join/[token]` — invalid token state (desktop 1280)

- **MEDIUM — Headline "Invite not found" wraps to two lines awkwardly** at 1280px ("Invite not / found"). Either widen the card or shrink the type.
- **MEDIUM — No top branding (Trustead logo)** — same orientation issue as `/sign-in`. User landing from a bad invite link has no visual confirmation they're on Trustead.
- **MEDIUM — Card sits high in the viewport with empty space below.** Either vertically center, or anchor under a header chrome.
- **MEDIUM — Primary CTA "Sign up on Trustead" button is small / cramped** — minimal padding, weak presence. Should match the Continue button weight elsewhere.
- **NIT — "Already a member? Sign in" is plain text without obvious link affordance.** Underline or button-style.

---

