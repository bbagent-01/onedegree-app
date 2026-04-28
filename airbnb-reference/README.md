# Airbnb Reference — Track B Foundation

> Research & extraction from 3 open-source Airbnb clones to inform Trustead's Track B UI build.
> Generated: 2026-04-13 | Session: CC-B1

## What Was Analyzed

Three Next.js Airbnb clone repos were studied for component patterns, design tokens, and architecture:

| Repo | Stack | Strengths | Gaps |
|------|-------|-----------|------|
| **aumsoni2002** | Next 14, Prisma, Clerk, Zustand, Stripe | Most complete — booking flow, reviews, admin dashboard, payment | No image carousel, no messaging |
| **ski043** | Next 14, Prisma, Kinde Auth | Best multi-step wizard, best search pill UI | No reviews, no payment, single photo |
| **krgyaan** | Next 13, Supabase direct, Yup | Clean auth forms, good category SVGs, Quill editor | No booking flow, no reviews, most incomplete |

## Key Findings

1. **aumsoni2002 is the primary reference** — closest to our stack (Next.js + Supabase + shadcn), most complete feature set
2. **ski043's wizard pattern is best for listing creation** — multi-step with dedicated routes per step
3. **No repo has image carousel, messaging, or trust features** — these are custom builds for Trustead
4. **All repos use the same Tailwind/shadcn token foundation** — CSS variables for theming, same border-radius scale, same shadow utilities
5. **Zustand (aumsoni) is the cleanest state management** — minimal, focused store for booking state

## Directory Structure

```
airbnb-reference/
├── README.md                          ← You are here
├── best-of.md                         ← Component-by-component comparison across repos
├── flows.md                           ← User flow inventory mapped to Trustead
├── tokens/
│   ├── spacing.json                   ← Spacing scale + common patterns
│   ├── borders-shadows.json           ← Border radius + shadow tokens
│   ├── typography.json                ← Font size/weight/role mapping
│   ├── color-palette.json             ← Airbnb colors (DO NOT USE) + Trustead colors
│   └── tailwind-extend.json           ← Ready-to-use theme.extend for tailwind.config.ts
└── component-specs/
    ├── listing-card.md                ← Card with image, price, rating, hover
    ├── navigation-bar.md              ← Desktop + mobile nav with auth
    ├── search-pill.md                 ← Airbnb-style search trigger + modal
    ├── category-filter.md             ← Horizontal scroll category row
    ├── photo-gallery.md               ← 5-image grid + lightbox (custom build needed)
    ├── date-picker.md                 ← Calendar with blocked dates
    ├── booking-sidebar.md             ← Price breakdown + reserve button
    ├── host-dashboard.md              ← Stats + listings management
    ├── create-listing-wizard.md       ← Multi-step form with 7 steps for Trustead
    └── message-thread.md              ← Inbox + thread UI (custom build needed)
```

## Recommendations for CC-B2

### Build Order (Priority)
1. **Listing Card** — Foundation component, used everywhere
2. **Navigation Bar** — App shell, needed for all pages
3. **Category Filter Row** — Homepage filtering
4. **Date Picker** — Extend Track A calendar system
5. **Booking Sidebar** — Core booking flow
6. **Create Listing Wizard** — Host onboarding

### Defer to CC-B3+
- Search pill (use simple search input for MVP)
- Photo gallery (use single hero image for MVP)
- Host dashboard analytics
- Message thread UI (use contact form for MVP)

### Custom Builds (No Reference)
- Trust score badge component
- Connection path visualization
- Vouch card / vouch form
- Network scope filter ("My Network" / "All")
- Trust-gated availability calendar

### Architecture Decisions
- **Use aumsoni2002's patterns** for server actions, Zustand state, and booking flow
- **Use ski043's pattern** for multi-step wizard (dedicated route per step)
- **Use tailwind-extend.json** as the starting point for Track B's tailwind.config.ts
- **Keep Track A's existing** calendar/availability system — extend, don't rebuild
