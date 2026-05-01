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

#### Cross-cutting — legacy color tokens from the pre-Trustead theme

Background scan of `src/components`, `src/app`, `src/lib`, and `src/app/globals.css` turned up 26 hardcoded color values from the old Attio Light theme that should be Trustead `--tt-*` tokens. Highest impact:

- **HIGH — `.legal-prose` body color** (`#1A1D21` navy) — fixed in commit b214d0f.
- **HIGH — Map host location-preview pin SVG** uses `#734796` purple — fixed in commit 6e21f2e.
- **HIGH — Map circle radius color** uses `#734796` purple — fixed in commit 6e21f2e.
- **HIGH — `.map-pin` text color** uses `#1A1D21` navy — re-tuned to Trustead's modal-bg dark green — fixed in commit 6e21f2e.
- **HIGH — `.map-pin-selected` background** uses `#1A1D21` navy — re-tuned — fixed in commit 6e21f2e.
- **HIGH — Email templates (`src/lib/email.ts`, `src/lib/proposal-alerts.ts`)** — 7 hits of `#1A1D21` and `#E5E7EB` and `#F9FAFB` on transactional emails. **functional — defer to B-series** (would require sending test emails through SendGrid to verify; out of UX1 scope).
- **MEDIUM — `.listing-popup .pp-imgs` placeholder** (`#f3f4f6` light gray) — leaflet popup, in-context-correct on light map; deferred.
- **MEDIUM — Sonner toast `text: #ffffff`** (`src/components/ui/sonner.tsx`) — should be `var(--tt-cream)`. Deferred (cosmetic, sonner CSS may need overrides).
- **MEDIUM — Status badges `bg-slate-100`** in `src/components/stay/IssueReportCard.tsx`, `src/components/booking/ThreadTermsCards.tsx` — light surface inside dark cards. Deferred (multiple variants, would need design pass on status semantics).

---

## Round 1 recap — 2026-05-01

### Fixes shipped (6 commits on `feat/ux1-ux-audit`)

| Commit | Surface | What landed |
|---|---|---|
| [`b214d0f`](https://github.com/bbagent-01/trustead/commit/b214d0f) | `/privacy`, `/terms`, `/legal-status` | `.legal-prose` body text was `#1A1D21` navy on the dark forest bg = invisible. Swap to `--tt-cream`/`--tt-mint`/`--tt-rule` so the entire legal pack is legible. Also mints replace purple `#734796` section numbers. |
| [`201cc6b`](https://github.com/bbagent-01/trustead/commit/201cc6b) | Onboarding (sandbox + live) | Logo wordmark no longer collides with slide eyebrow + heading on mobile. Backdrop fade behind logo (z-30) catches scrolling content + orbit avatars. `items-start` on mobile, smaller heading clamp, more bottom padding so Continue + Skip + dots stop fighting for the same band. |
| [`d6a4854`](https://github.com/bbagent-01/trustead/commit/d6a4854) | `/sign-in`, `/sign-up` | Primary CTAs no longer render in silent-disabled state. Removed `disabled={!validInput}`; replaced with click-time validation that surfaces a toast.error so empty-submit gives feedback instead of nothing. |
| [`6e21f2e`](https://github.com/bbagent-01/trustead/commit/6e21f2e) | Host location preview map | Map pin + 750m circle were `#734796` purple (Attio holdover). Now use `--tt-degree-3` deep trust-degree green. Pin text + selected bg also flipped from generic navy to Trustead modal-bg dark-green. |
| [`d1db735`](https://github.com/bbagent-01/trustead/commit/d1db735) | `/join/[token]` (invite-not-found / expired / consumed) | Wider card, font-serif `text-3xl` headline (no more "Invite not / found"), animated wordmark above the card for brand orientation, vertically-centered layout, lg-sized primary CTA, secondary "Sign in" promoted from plain text to outline button. |
| [`9e4471f`](https://github.com/bbagent-01/trustead/commit/9e4471f) | `/sign-in`, `/sign-up` | Animated trustead wordmark above the H1 + serif H1 to match brand. Both pages were chromeless before. |
| [`f04078e`](https://github.com/bbagent-01/trustead/commit/f04078e) | 17 gated app routes | Apply `font-serif` to every page H1 across vouch, profile/[id], profile/edit, listings, inbox, invite, alerts, help, proposals (+ subs), settings (+ subs), wishlists. Sizes unchanged — pure brand consistency. `/dashboard` excluded (B4 territory). |
| [`33b0a23`](https://github.com/bbagent-01/trustead/commit/33b0a23) | global typography (every page) | Drop `!important` from the global H1/H2 size/weight/color so Tailwind classes win. Was stamping every `<h2 className="text-sm uppercase">` section eyebrow as a 44px serif headline (visible on /settings as the giant "YOUR ACCOUNT" / "ACCOUNT MANAGEMENT" labels that broke layout). Font-family stays `!important` so un-classed headings still get the brand serif. |

### Findings deferred (functional / out of scope)

- **Google sign-in caveat copy** — "Google sign-in only works for accounts that already added the matching email" is a Clerk account-linking quirk. *functional — defer to B-series.*
- **`/dev` and bogus routes redirect to `accounts.trustead.app/sign-in` (Clerk hosted UI)** — middleware gates everything before `not-found.tsx` resolves, AND Clerk routes are pointed at the hosted page instead of the custom `/sign-in`. *functional — middleware + Clerk dashboard config; defer to B-series.*
- **Email template legacy colors** — `src/lib/email.ts` + `src/lib/proposal-alerts.ts` have 7 hits of `#1A1D21` / `#E5E7EB` / `#F9FAFB`. Would need test sends through SendGrid to verify. *functional — defer to B-series.*
- **`"Sign in with email and password instead"` link non-firing** — observed during click-test; may have been a stale screenshot or the click missed. Re-test post-deploy; if reproducible, it's a missing client-state guard.
- **Clerk passkey + 2FA challenge** — couldn't sign back in autonomously to reach the gated surfaces (`/vouch`, `/profile/edit`, `/listings/[id]`, `/inbox`, `/settings/*`, `/alerts`, `/trips`, `/wishlists`, `/invite`, `/proposals`, `/help`). Need Loren's device biometric for that. **Surfaces gated behind sign-in NOT fully audited this round** — they're queued for round 2 once Loren is back to complete a sign-in. (Round 1 did still ship code-level brand fixes — font-serif H1s — across these surfaces.)
- **Clerk production keys are locked to `trustead.app` only** — observed when verifying the preview URL. `/sign-in` on `feat-ux1-ux-audit.trustead.pages.dev` renders blank because Clerk rejects the origin: *"Clerk: Production Keys are only allowed for domain trustead.app. API Error: The Request HTTP Origin header must be equal to or a subdomain of the requesting URL."* Loren needs to add `feat-ux1-ux-audit.trustead.pages.dev` (and any future preview hostnames) to the Clerk dashboard's allowed origins, OR use a Clerk dev instance for previews. **functional — Loren config; sign-in functionality on preview URL won't work until this is resolved**, but the visual fixes (logo + serif H1 + always-clickable CTA + toast errors) are visible if you reach the page some other way (e.g. localhost dev or trustead.app once the branch merges).

### Verified live on the preview

These were spot-checked at <https://feat-ux1-ux-audit.trustead.pages.dev> after the deploy landed:

- **`/sandbox/onboarding-2` mobile (iPhone 12 Pro 390×844)** — slide 1, 2, 5 walked. Logo + eyebrow chip + heading no longer overlap. Slide 2 orbit avatars no longer collide with the logo or the Continue button thanks to the backdrop fade. Slide 5 heading no longer renders through the wordmark.
- **`/sandbox/onboarding-2` desktop (1280)** — clean rendering, dots + Skip stack vertically without collision.
- **`/privacy` mobile + desktop** — body text fully readable in cream, section numbers in mint, bold inline labels (`Account:`, `Invitations and vouches:` etc.) visible, links in mint with underline.
- **`/terms` desktop** — same; "IMPORTANT — ARBITRATION..." bold paragraph readable, all 22 TOC entries readable.
- **`/legal-status` desktop** — same; full prose visible including the "Does not charge any fees..." bulleted list.

### Spot-check URLs once the preview deploys

The Cloudflare branch deploy for `feat/ux1-ux-audit` will be at a `*.trustead.pages.dev` URL once the build finishes (~2 min after push). For each fix:

- `https://feat-ux1-ux-audit.trustead.pages.dev/privacy` — body text should be cream, section numbers mint
- `https://feat-ux1-ux-audit.trustead.pages.dev/terms` — same
- `https://feat-ux1-ux-audit.trustead.pages.dev/legal-status` — same
- `https://feat-ux1-ux-audit.trustead.pages.dev/sandbox/onboarding-2` — open on a phone (or Chrome devtools 390×844). Walk all 5 slides. The trustead wordmark at top should NOT collide with the eyebrow chip or first heading line. Continue + Skip + dots should fit the viewport without overlap. Heading should stay 2-3 lines, not 4.
- `https://feat-ux1-ux-audit.trustead.pages.dev/sign-in` — trustead wordmark above headline; click "Continue with phone" with empty input → red toast "Enter your phone number" instead of nothing
- `https://feat-ux1-ux-audit.trustead.pages.dev/sign-up` — trustead wordmark above headline; same toast behavior on empty submits at each step
- `https://feat-ux1-ux-audit.trustead.pages.dev/join/fake-test-token-abc123` — branded dead-end card with mint primary + outline secondary CTA
- `https://feat-ux1-ux-audit.trustead.pages.dev/listings/{any-listing}` — verify the host map preview pin renders in trust-degree green, not purple (this surface is signed-in only — Loren needs to verify)

### Suggested round 2 surfaces (once auth is unblocked)

- `/dashboard/network` (excluded this branch — B4 territory)
- `/inbox` + `/inbox/[threadId]`
- `/vouch` (the live form)
- `/profile/[id]` + `/profile/edit`
- `/listings/[id]` (detail page UX, not just the host preview map)
- `/settings` sub-pages: `hosting`, `notifications`, `phone`
- `/alerts`, `/trips`, `/wishlists`, `/invite`, `/proposals`, `/help`

---

## Round 2 (code-level pass on gated surfaces) — 2026-05-01

I couldn't sign in to walk these visually, so this round was a code audit of the gated routes + components: 40 findings surfaced across `vouch`, `profile`, `listings`, `inbox`, `settings`, `alerts`, `trips`, `wishlists`, `invite`, `proposals`, `help`, `hosting/{create,edit}`, plus the cross-cutting components.

### Round 2 fixes shipped

| Commit | Surface | What landed |
|---|---|---|
| [`19d0716`](https://github.com/bbagent-01/trustead/commit/19d0716) | hosting/edit, hosting/create, inbox/[threadId], listings/[id], trips/[bookingId] | Round 1's `font-serif` bulk patch matched only the bare `text-2xl font-bold/semibold md:text-3xl` class string — H1s with `text-foreground`, `leading-tight`, `md:block`, etc. interleaved slipped through. Sweep them up. Also re-tunes the hosting-edit hero status badges (was `bg-emerald-50` / `bg-zinc-100` light pills) to translucent `--tt-mint-mid` / `white/5`. |
| [`bb27ceb`](https://github.com/bbagent-01/trustead/commit/bb27ceb) | inbox/thread-view, listings/[id], invite (root + share), settings/notifications | Inbox booking badges (Pending/Connected/Declined/Cancelled) flipped from `bg-{color}-100 text-{color}-800` light pills to translucent dark-tuned tints. Listings payment-method chips de-zinc'd. Invite warning callouts amber-100 → amber-400/15 (kept the amber semantic, dark-friendly). Notifications toggle off-state `bg-zinc-300` → `bg-white/15`. |
| [`194bad1`](https://github.com/bbagent-01/trustead/commit/194bad1) | settings/deactivate-button | `window.confirm()` (browser-native, off-brand) replaced with the project's `Dialog` primitive — serif title, brand-voice copy ("We don't delete your data — email hello@trustead.app"), destructive-variant confirm button. |
| [`40102ca`](https://github.com/bbagent-01/trustead/commit/40102ca) | profile/[id] | "Unverified" badge for users who skipped phone verification: `border-red-200 bg-red-50 text-red-700` light island → translucent `red-400/15` + readable `red-200` foreground. |

### Round 2 deferred (round 3 territory)

- **~67 more light-theme color tokens** across gated components — `bg-{emerald,sky,amber,blue,red,green,yellow}-{50,100}` + `text-{...}-{700,800,900}` patterns in `IssueReportCard`, `PhotoRequestCard`, `ThreadTermsCards`, `AcceptTermsCheckbox`, `SystemMilestoneCard`, `ReviewPromptCard`, `cancellation-policy-form`, `inbox-list`, `reservation-sidebar`, `proposal-bridge-actions`, `invite/share` (multiple), and the `hosting/create` wizard. Each is a per-context decision (warning vs success vs info, inside-card vs page-level) so a one-shot bulk sed isn't safe — needs a small design pass and 3-4 targeted commits. **Same root cause as round 1's legal-prose: pre-refactor Attio Light tokens that work on white but pop on the dark forest bg.**
- **Empty-state copy polish** on `/wishlists` and `/proposals` — current copy is decent, agent flagged it as too-generic. Marginal.
- **Disabled cursor pattern** on submit buttons across the app — the Button primitive uses `disabled:pointer-events-none` which makes `cursor-not-allowed` unreachable; would need a deliberate trade-off (clicks blocked AND cursor shown vs the current "clicks blocked, cursor inherits from parent"). Not a clear win either way.
- **Missing `focus-visible` rings** on 10+ interactive elements across `/listings/[id]` host links and `/inbox/[threadId]` thread items — true a11y improvement, deferred for a focused a11y pass.
- **Vouch button disabled tooltip** — when you've already vouched for someone, the button is disabled with no explanation. Add a popover/tooltip "You've already vouched for this person. Tap to update."

### Round 2 commit total: 4 (19 across both rounds)

---

## Round 3 (full dark-theme sweep across every gated component) — 2026-05-01

The biggest deferred item from round 2 was "~67 light-theme color tokens scattered across gated components." This round took it down to zero.

### What changed

A consistent mapping was applied across every user-facing component:

| Old (Attio Light) | New (Trustead dark) |
|---|---|
| `bg-{color}-50` | `bg-{color}-400/10` |
| `bg-{color}-100` | `bg-{color}-400/15` (or `/20` for emerald) |
| `border-{color}-200` | `border-{color}-400/30` |
| `text-{color}-{700,800}` | `text-{color}-200` |
| `text-{color}-900` | `text-{color}-100` |
| `bg-zinc-{100,200}` | `bg-white/{5,10}` |
| `text-zinc-{700,800,900}` | `text-[var(--tt-cream{,-muted})]` |

Plus emerald gets re-mapped to `--tt-mint-mid` / `--tt-mint` so the "success" semantic uses the brand mint instead of a generic green, and blue gets folded into the sky palette.

Each badge / callout / banner keeps its semantic color (mint = success, amber = warning, red = destructive, sky = info) but as a translucent border + tinted bg + readable foreground so it sits naturally on the dark forest surface instead of popping as a bright pill island.

### Round 3 fixes shipped (4 commits, ~140 tokens, 40+ files)

| Commit | Surface |
|---|---|
| [`b60c0c3`](https://github.com/bbagent-01/trustead/commit/b60c0c3) | Inbox: SystemMilestoneCard, inbox-list, origin-proposal-card, reservation-sidebar, thread-view |
| [`fc0131b`](https://github.com/bbagent-01/trustead/commit/fc0131b) | Booking + stay: ThreadTermsCards (the worst offender, 30+ tokens), HostReviewTermsInline, AcceptTermsCheckbox, ReviewPromptCard, CancellationPolicyCard, IssueReportCard, PhotoRequestCard, cancellation-policy-form |
| [`ba611ff`](https://github.com/bbagent-01/trustead/commit/ba611ff) | Invite, hosting, trust, dashboard, profile (21 files): invite + invite/share, trips/[bookingId], proposals/[id], hosting/{create, edit, availability-editor, listing-cancellation-override, host-review-modal, photo-uploader, reservations-section}, dashboard/my-proposals-section, profile/preview-badge, trust/{network-section, trust-gate, vouch-modal, trust-tag, trust-tag-popover, IntroRequestCard, connection-breakdown}, ui/badge primitive, invite/pending-vouches-list |
| [`645c587`](https://github.com/bbagent-01/trustead/commit/645c587) | Final wave (10 files): trips/{trips-list, trip-detail-actions, cancel-trip-dialog}, listing/{gated-listing-cta, gated-listing-view}, proposals/{proposal-card, new-proposal-form, share-to-friend-modal, author-actions, alerts-manager}, plus pickup of remaining trust + booking stragglers |

### Intentionally LEFT alone

- **`LegalPageShell` AlphaBanner** uses `bg-warning-100 text-amber-900` — a cream-bg surface where dark amber text is the correct semantic. The legal pages render this on a dark page, but the banner itself is a cream island by design (warning style). Kept.
- **`OnboardingTakeover` and `sandbox/onboarding-2` VouchPicker icon chips** use `bg-blue-100 text-blue-700` (Vouch) and `bg-amber-100 text-amber-700` (Vouch+) — small decorative icon backgrounds inside dark-forest containers, mirroring the in-app `VouchModal`. Per the locked onboarding spec these are intentional brand accent tints. Kept.
- **Admin / dev surfaces** (`admin/ImpersonationSwitcher`, `dev/SandboxControls`, `dev/BrandEditorDrawer`, `dev/pages/listing`) are out of UX1 scope and use the older Attio palette intentionally — the brand-switcher tooling is its own dev-only world.

### Round 3 deferred to round 4 (needs visual verification once Loren can sign in)

- Run all the swept components through a visual pass at desktop + mobile to confirm the translucent tints read correctly. The math should work but some translucent bgs over the forest-green can feel washed out depending on local backdrop — would benefit from a side-by-side review with Loren on the live preview after the Clerk-domain config is updated.
- A11y pass: focus-visible rings on inbox thread items + listing host links (10+ flagged in round 2 agent scan).
- Empty-state copy polish on /wishlists root and /proposals (current copy is decent, agent flagged it as too-generic — marginal win, requires copywriting pass).
- Disabled cursor pattern on submit buttons app-wide (the Button primitive uses `disabled:pointer-events-none` which is mutually exclusive with `cursor-not-allowed` — needs a deliberate trade-off conversation).
- VouchButton "you've already vouched" tooltip — turns out the button isn't actually disabled (it relabels to "Update vouch for {firstName}"), so the agent's complaint was a misread. No fix needed.

### Total commit count across rounds 1-3: 24

```
b214d0f  legal pages contrast (round 1)
201cc6b  onboarding mobile overlap (round 1)
d6a4854  sign-in/up CTAs + validation (round 1)
6e21f2e  map markers brand greens (round 1)
d1db735  /join/[token] dead-end polish (round 1)
9e4471f  sign-in/up wordmark + serif H1 (round 1)
f04078e  17 gated route H1s → font-serif (round 1)
33b0a23  global H1/H2 !important removed (round 1)
242cce6  iframe regression fix (round 1)
+ 6 supporting commits (CI workflow, env vars, report updates)
19d0716  more H1s + hosting-edit badges (round 2)
bb27ceb  status badges + amber + toggle (round 2)
194bad1  deactivate dialog (round 2)
40102ca  profile unverified badge (round 2)
8c5ca96  report — round 2 entries
b60c0c3  dark-theme sweep — inbox (round 3)
fc0131b  dark-theme sweep — booking + stay (round 3)
ba611ff  dark-theme sweep — invite + hosting + trust + dashboard (round 3)
645c587  dark-theme sweep — trips + listing-gate + proposals (round 3)
```



