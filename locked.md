# LOCKED — chosen homepage layout

**Status:** ✅ Locked  
**Page:** `/sandbox/layouts/home-v4`  
**Source:** `src/app/sandbox/layouts/home-v4/page.tsx`  
**Branch:** `feat/d3-layout-sandbox`  
**Date:** 2026-04-30

This is the homepage layout we're shipping. When porting to the live
app, copy this shell wholesale — sidebar, search bar, CTA strip,
marquee sections — and wire each surface to real data.

---

## What's locked

### 1. Fixed left sidebar (the new shell)

Replaces the old top horizontal nav. **This shell ports to every
authed surface in the app** — same sidebar visible on Home, Browse,
Proposals, Vouch, Network, Messages, Trips, Profile, Host dashboard.

- **Width:** `w-[240px]` expanded, `w-[64px]` collapsed.
- **Sticky** to the viewport (`sticky top-9 h-[calc(100vh-36px)]`).
- **Logo:** full Trustead wordmark when expanded; favicon shield when
  collapsed. (`<TrusteadLogo>` / `/trustead-favicon.svg`).
- **Three nav groups, separated by faint dividers (`border-border/60`):**
  1. **App** — Home, Browse, Proposals, Vouch, Network, Messages,
     Trips, Profile.
  2. **Host** — Host dashboard.
  3. **Account** — Account settings, Help Center.
- **Active state:** dark cream pill (`bg-foreground text-background`)
  on the current item.
- **Inline notifications** below nav, scrollable, with unread count
  badge. Collapses to a single bell + count when sidebar is collapsed.
- **Collapse toggle:** `PanelLeftClose` in the header when expanded;
  `PanelLeftOpen` at the bottom when collapsed.

### 2. Condensed search row (just refined)

A single 68px-tall row, three pills with consistent geometry, all
sharing the same dark-transparent fill + faint cream border so the
row reads as one continuous control surface on the forest field.

- **Travel / Host segmented pill (left):**
  - Container: `h-[68px] rounded-full border border-border bg-card/40 p-2`.
  - Inner pills: `h-[52px]` so the 8px inset on top/bottom mirrors the
    8px gap from container left → pill left. Visually balanced.
  - **Active** (Travel): mint pill (`bg-brand text-brand-foreground`).
  - **Inactive** (Host): cream text (`text-foreground/80`) on
    transparent, with a soft hover tint — always legible against the
    dark page bg. (Earlier white-pill version made "Host" disappear.)
- **Search pill (center, fills width):**
  - Same `h-[68px] rounded-full border border-border bg-card/40`.
  - Where / When / Who columns; cream labels (`text-foreground`) over
    dimmer placeholders (`text-muted-foreground`).
  - **Internal dividers** are `bg-border` (the same faint cream/green
    line used everywhere else in the design) — NOT the bright
    `bg-zinc-200` from before.
  - **Search circle:** `h-[52px] w-[52px] bg-brand` — the 52px height
    matches the Travel pill so the row is geometrically rhyming.
- **Filters pill (right):** same 68px height, same border, same fill
  — just wraps the icon + label.

### 3. Centered hero

- "Welcome back, {firstName}." in muted-foreground.
- Serif h2 "What are you looking for?" — DM Serif Display, the
  global treatment, no overrides except `max-width:none`.
- Vertical rhythm: `pt-[12vh] md:pt-[20vh]` / `pb-[10vh] md:pb-[15vh]`.

### 4. CTA strip

Three compact horizontal cards directly under the hero so newcomers
have an obvious move:

1. **Find people you know** → `/sandbox/layouts/vouch`
2. **Create your first listing** → `/sandbox/layouts/dashboard`
3. **Post a trip wish** → `/sandbox/layouts/proposals`

Card style: `rounded-2xl border border-border bg-card/40 p-4` with
hover lift (`hover:border-brand/40`).

### 5. Marquee sections

Four auto-scrolling rows, alternating direction, JS-driven so hover
**eases** the speed instead of hard-stopping:

1. **Trip Wishes from your network** (→ right) — horizontal cards with
   ConcentricRings overlay on the destination photo.
2. **People in your network** (← left) — Person cards with degree pill,
   trust path, connector avatars, "Vouch for X" CTA.
3. **Host Offers** (→ right) — horizontal cards with photo on left.
4. **Stays from people you know** (← left) — vertical listing cards
   matching the live `live-listing-card.tsx`.

Each section header is a flex row: title │ divider │ subtitle │
divider │ ghost link. Dividers are `bg-border` (full row height,
self-stretched).

---

## What changed in this session

Compared to the previous home-v4 commit (`aa71727`):

- **Search bar restyled to match the dark forest theme** (was
  white-pill on dark bg, which fought the rest of the design).
- **Travel / Host toggle** now uses the same dark-transparent + faint
  cream border treatment as the search and Filters pills. Active state
  is mint; inactive state is cream-on-transparent (was zinc-700, which
  vanished against the white container on dark bg). Inner pills sized
  to `h-[52px]` so vertical inset = horizontal inset = 8px.
- **Search circle** sized to `h-[52px] w-[52px]` (was `h-12 w-12`) so
  it geometrically matches the Travel pill.
- **Internal dividers** (Where/When/Who) switched from `bg-zinc-200`
  (bright grey) to `bg-border` (the faint cream/green line used
  throughout the rest of the design).
- **Label and placeholder colors** swapped from zinc-900/500 to
  `text-foreground` / `text-muted-foreground` so they read correctly
  on the dark fill.

---

## When porting to the live app

1. **Replace the current top nav** with `<SiteSidebar>` from
   `home-v4/page.tsx`. Make it the global shell wrapping every
   authed route in `(app)/layout.tsx`.
2. **Wire the search bar** to the existing `<SearchBar>` popover
   logic in `src/components/browse/search-bar.tsx` — keep the
   geometry/colors from `home-v4`'s `<CondensedSearch>`.
3. **Wire notifications** in the sidebar to the real notifications
   feed (currently mocked in `NOTIFICATIONS`).
4. **Marquee sections** become the home feed — back them with
   real proposals / people / listings queries.
5. The CTA strip stays as a static onboarding nudge for users with
   thin networks; can be hidden once a user has > N connections.
