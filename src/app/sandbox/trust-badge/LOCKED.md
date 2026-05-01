---
status: locked for B2 integration
sandbox: /sandbox/trust-badge
sandbox-source: src/app/sandbox/trust-badge/TrustBadgeSandbox.tsx
---

# Trust badge — locked design spec

What follows is the design we're porting into the production app. It supersedes anything that's currently live in the listing card / inbox / host card / profile page surfaces. Everything here is implemented and visually verified in the sandbox; this doc is the spec the B2 integration session works from.

## 1. Source of truth — `DEGREE_COLORS`

One const. Five tiers. Every pill, every vouch chip, every neutral pulls from here. Change a hex, the whole app updates.

| Tier | Hex      | Foreground | Used for                                    |
|------|----------|------------|---------------------------------------------|
| none | `#A1A1AA` | `#0B2E25`  | "No path" pill (rare — non-cold-start nulls) |
| 1°   | `#1BEAA5` | `#0B2E25`  | Direct connection — mint                    |
| 2°   | `#39BFF8` | `#0B2E25`  | Friend-of-friend — sky                      |
| 3°   | `#FDD34D` | `#0B2E25`  | Two hops out — mustard                      |
| 4°≥  | `#FF8F8F` | `#0B2E25`  | 4 or more hops — coral                      |

All five are saturated enough to stand on every surface (dark forest, cream listing chip, white profile card) — no per-surface color swap, no hairline border for visibility.

In production this should live as a single named export (e.g. `src/lib/trust/colors.ts`) and the existing globals.css `!important` degree-pill overrides need to be retired in favor of inline-styled pills that reference it.

## 2. Label conventions

- `1°`, `2°`, `3°` — degree number + degree symbol
- **`4°≥`** — open-ended bucket (4 hops or more). The `≥` (greater-than-or-equal) follows the number, not preceding it. Never write `4°+`.
- `New member` — cold-start pill (no degree, no metrics, no rating). Background `#3F3F46`, text `#F4F4F5`. Distinct from the "no path" neutral.
- `No path` — degree=null but the user has other signal (rare, currently unreachable in samples). Uses `DEGREE_COLORS.none`.

## 3. Four-metric model (FT-1)

Independent metrics. No composite score. Each can be null when the user has no data in that pillar.

| Metric     | Range  | Semantics                                                | Visual                |
|------------|--------|----------------------------------------------------------|-----------------------|
| degree     | 1–4≥, null | Hops from viewer in the trust graph                  | Filled degree pill    |
| connection | 0–10  | Viewer-relative chain strength (only 2°/3°)              | Right segment of combo pill |
| vouch      | 0–10  | Absolute platform-wide vouch score (always, except cold-start) | Uncontained shield + number |
| rating     | 0–5 + count | Raw average from real stays                        | Uncontained star + value + (count) |

## 4. Sizes — four surfaces

Each badge size is rendered in its real surface; they are not interchangeable.

| Size   | Surface                          | Composition                                                         |
|--------|----------------------------------|---------------------------------------------------------------------|
| nano   | Inbox thread row (next to name)  | Degree pill only                                                    |
| micro  | Listing card image overlay       | Degree pill + vouch chip + rating chip on a near-white chip          |
| medium | Host card (listings page, profile rows) | Degree pill + **inline connector avatars overlapping its right edge** + vouch chip + rating chip |
| macro  | Profile page header block        | Big avatar photo + name + degree pill + bio + larger connector strip + 3 labeled metric tiles |

## 5. Degree pill — structure rules

### Two-segment combo pill (2° and 3°)
- One outer rounded shape with a 1px border in the tier color
- LEFT segment: filled with the tier color, contains the degree label
- 1px vertical divider in the tier color
- RIGHT segment: transparent fill, tier-color text, contains the connection score (one decimal)
- Inner corners squared (`borderRadius: 0`) so segments don't curve inside the rounded outer

### Single-segment pill (1° mutual, 4°≥)
- Filled with the tier color, no border, no hairline
- Medium size: pin to **22px height** so it lines up with the inline connector avatars

### 1° asymmetric combo pill (vouch direction is `outgoing` or `incoming`)
- Same combo structure as 2°/3°, BUT:
  - Inter-segment gap is 2px transparent (not a 1px line) so the surface behind shows through
  - Outer border is `1px solid rgba(11,46,37,0.14)` (visibility hairline)
  - LEFT segment: 1° tier color, the degree label
  - RIGHT segment: orange `#EA580C` background, white arrow icon
    - `outgoing` → `ArrowRight` ("you vouched, no return yet — click to nudge")
    - `incoming` → `ArrowLeft` ("they vouched, you haven't vouched back — click to vouch back")
- The right segment is a real `<button>` with title/aria — eventually opens the vouch-back / nudge flow. Currently `e.preventDefault()` on click in the sandbox.

### 4°≥
- Single segment only — no connection score (chain too long to score reliably)

## 6. Vouch chip

Uncontained. No background, no border. Shield icon + number, both colored.

- Color follows the degree scale **based on the vouch score itself** (not the host's degree):
  - score ≥ 5 → d1 mint
  - score 4–5 → d2 sky
  - score 3–4 → d3 mustard
  - score < 3 → d4 coral
- Shield icon height **must match** the rating star height at the same badge size (12px micro, 14px medium)
- Suppressed at all sizes when `degree === 1` (direct vouch is the whole story; vouch chip would be redundant)
- Suppressed for cold-start (no data)

## 7. Rating chip

Uncontained. Plain text-color star + value + `(count)`.

- Star size: 12px micro, 14px medium (matches vouch shield)
- Default text color: cream `#F5F1E6` on dark surfaces, deep forest `#0B2E25` on white surfaces
- **Penalized state**: when `rating < 3.5`, text and star turn red (`#FCA5A5` on dark, `#B91C1C` on white)
- Count rendered in muted color (55% opacity of the text color), normal weight, in parentheses
- Suppressed when `reviewCount === 0`

## 8. Connector avatars (medium)

The defining piece of the medium badge. Avatars sit inline with the degree pill, the leftmost avatar overlaps the pill's right edge so it reads as another segment of the same group.

- Wrapper: `inline-flex items-center -space-x-1.5` with `marginLeft: -10px`
- Each avatar: **22px** square (matches the pill's pinned 22px height exactly)
- 2px ring in the surrounding surface color so the stack punches through (dark forest `#07221B` on host cards; white on listing-overlay chips)
- Show up to 4 avatars; truncate beyond
- Avatar fill:
  - Viewer knows the connector AND we have a photo → photo
  - Anonymous (`viewerKnows === false`) or no photo → silhouette SVG in muted surface text color

The macro block keeps its own larger connector strip (28px / `h-7`) with a white ring matched to the macro card's white background.

## 9. State catalog

The sandbox covers these six states across all four sizes; the integration must hold up across all of them.

| Sample      | degree | direction  | connection | vouch | rating | reviews | Notes                              |
|-------------|--------|------------|------------|-------|--------|---------|------------------------------------|
| Maya L.     | 1      | mutual     | (n/a)      | 8.2   | 4.9    | 23      | Top-tier 1°                        |
| Casey W.    | 1      | outgoing   | (n/a)      | 6.8   | 4.6    | 7       | Asymmetric — orange right arrow    |
| Aki N.      | 2      | —          | 6.4        | 5.7   | 4.7    | 12      | Combo pill + 2 known connectors    |
| Robin K.    | 3      | —          | 3.2        | 4.1   | 4.4    | 8       | Combo pill + 1 known + 1 anon      |
| Theo R.     | 4≥     | —          | (n/a)      | 6.0   | 4.6    | 5       | Single-segment + 1 known + 2 anon  |
| Jules P.    | null   | —          | null       | null  | null   | 0       | Cold-start — "New member" pill     |
| Drew M.     | 1      | incoming   | (n/a)      | 4.8   | **2.8**| 15      | Asymmetric + penalized rating (red)|

## 10. Surface treatments

| Surface              | Background under the badge      | Notes                                                    |
|----------------------|---------------------------------|----------------------------------------------------------|
| Inbox row (nano)     | Dark forest `#07221B`-ish       | No chip wrapper, just inline                             |
| Listing card overlay (micro) | `rgba(255,255,255,0.95)` chip with subtle shadow | Sits below the image, above the title, where LiveListingCard puts it today |
| Host card (medium)   | `rgba(7,34,27,0.5)` card        | No chip wrapper                                          |
| Profile macro block  | White `#FFFFFF` card            | Connector ring color flips to white                      |

## 11. What does NOT carry into production

- The palette comparator at the top of the sandbox (`PaletteOptions`, `PaletteRow`, `PreviewCombo`, `INITIAL_PALETTES`, `pickFg`, `isVeryLight`, `paletteVouchColor`, `SwatchPill`, `ComboSwatchPill`, `ColorSwatchInput`) — design exploration only, not part of the badge.
- The `SAMPLES` hardcoded data — production reads from real `trust_score` / `vouch_score` / `degree` / `vouch_power` columns in B2.
- The page shell (`TrustBadgeSandbox`, `SectionHeader`, `InboxMockup`, `ListingGrid`, `HostRowGrid`, `MacroStack`) — it's a comparison harness, not the real surface code.
- The orange asymmetric arrow's `e.preventDefault()` — real `<button>` should wire to the vouch-back / nudge modal.

## 12. What DOES carry

The pure rendering primitives, in order of dependency:

1. `DEGREE_COLORS` — the five-tier token map
2. `DEGREE_PILL` — derived from `DEGREE_COLORS`, holds label + outline color per degree
3. `vouchTierColor(score)` — score → tier color
4. `ICON_CIRCLE`, `ICON_SHIELD` — inline SVG icons
5. `NewMemberPill({ size })` — cold-start state
6. `VouchPill({ score, size })` — uncontained shield + number
7. `TrustBadgeSandboxPill({ size, sample, onImage })` — the main badge component (rename to `TrustBadge` in production)

The `Sample` type maps cleanly onto the production user/host shape: `degree`, `vouchDirection?`, `connection`, `vouch`, `rating`, `reviewCount`, `connectors[]`. Build a thin adapter from the DB row to this shape and feed it in.

## 13. Open questions for B2

- How are 1° asymmetric arrows wired? — I expect a `useVouchBackModal()` hook on click, but the actual flow is owned by B2.
- The "No path" neutral is currently unreachable from any sample (every degree=null sample is also cold-start). If B2 produces real degree=null + has-other-signal users, the neutral pill renders correctly but should be reviewed in the wild.
- Connection score threshold for showing the right segment — currently shown whenever `2° || 3°` and `connection !== null`. If real data ever has 2°/3° with null connection, the combo pill falls back to single-segment with no graceful empty-state design yet.
