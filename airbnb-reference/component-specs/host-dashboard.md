# Host Dashboard Layout

## Source
- **Repo:** aumsoni2002/Airbnb-Clone
- **File:** `app/rentals/page.tsx` (host listings) + `app/admin/page.tsx` (stats/charts)
- **Supporting:** `admin/StatsContainer.tsx`, `admin/ChartsContainer.tsx`, `admin/Chart.tsx`, `admin/StatsCard.tsx`

## Dimensions
- **Container:** max-w-6xl to max-w-7xl (1152-1280px), centered
- **Stats cards:** Grid of 3, each ~300px wide, h-auto (~120px)
- **Chart container:** Full width, h-[300px]
- **Listings grid:** 1-4 columns responsive, gap-8 (32px)
- **Page padding:** py-8 (32px) top/bottom

## Layout
```
Admin Dashboard:
┌─────────────────────────────────────────┐
│  Dashboard                               │
│                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Properties│ │ Bookings │ │ Revenue  │ │
│  │    12     │ │    34    │ │  $4,520  │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │     Monthly Bookings Chart         │  │
│  │     (Recharts bar/line chart)      │  │
│  └────────────────────────────────────┘  │
└─────────────────────────────────────────┘

Host Listings:
┌─────────────────────────────────────────┐
│  My Listings                             │
│                                          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │Card │ │Card │ │Card │ │Card │       │
│  │  1  │ │  2  │ │  3  │ │  4  │       │
│  └─────┘ └─────┘ └─────┘ └─────┘       │
│                                          │
│  Or: Empty state ("No listings yet")     │
└─────────────────────────────────────────┘
```

## Typography
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page title | text-3xl (30px) | font-bold (700) | foreground |
| Stats card label | text-sm (14px) | font-medium (500) | muted-foreground |
| Stats card value | text-2xl (24px) | font-bold (700) | foreground |
| Chart axis labels | text-xs (12px) | font-normal (400) | muted-foreground |

## Border Radius & Shadows
- **Stats cards:** rounded-lg (8px), border, shadow-sm
- **Chart container:** rounded-lg (8px), border
- **Page:** No border or shadow

## Responsive Behavior
- **Desktop:** 3-col stats, 4-col listing grid
- **Tablet:** 3-col stats, 2-col listing grid
- **Mobile:** 1-col stats (stacked), 1-col listing grid

## Interactive States
| State | Behavior |
|-------|----------|
| Loading | Skeleton loaders for stats + chart + cards |
| Empty | EmptyList component with CTA to create listing |
| Stats hover | Subtle shadow increase on stat cards |
| Listing card | Same hover as listing card component (scale image) |

## Data Shape
```typescript
// Stats
{
  totalProperties: number;
  totalBookings: number;
  totalRevenue: number;
}

// Chart data (6-month history)
{
  months: Array<{
    month: string;      // "Jan", "Feb", etc.
    bookings: number;
    revenue: number;
  }>;
}

// Listings
{
  listings: Array<PropertyCard props>;
}
```

## 1DB Adaptation Notes
- **Add:** Trust score dashboard section (your trust rating, vouch count, trend)
- **Add:** Community activity feed (recent vouches, new connections)
- **Add:** Booking request queue with trust-level indicators
- **Add:** Earnings overview with community contribution metrics
- **Modify:** Stats → Trust Score | Active Listings | Pending Requests | Earnings
- **Add:** Quick actions: "Add Listing", "View Requests", "Update Availability"
- **Keep:** Grid layout for listings, stats cards pattern, chart for analytics
- **Consider:** Table view toggle (grid ↔ table) for listings management
