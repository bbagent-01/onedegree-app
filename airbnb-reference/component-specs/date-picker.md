# Date Picker / Calendar

## Source
- **Repo:** aumsoni2002/Airbnb-Clone
- **File:** `components/booking/BookingCalendar.tsx` (56 LOC)
- **Library:** shadcn Calendar (react-day-picker under the hood)
- **Supporting:** Zustand store for state management

## Dimensions
- **Calendar width:** Auto (fits container, ~280-320px per month)
- **Cell size:** ~40px x 40px per day
- **Padding:** p-3 (12px) around calendar
- **Month nav height:** ~40px
- **Overall height:** ~320px for single month

## Layout
```
┌───────────────────────────┐
│  < April 2026 >           │
│  Mo Tu We Th Fr Sa Su     │
│                   1  2  3 │
│   4  5  6  7  8  9 10    │
│  11 12 [13 14 15] 16 17  │  ← Selected range highlighted
│  18 19 ██ ██ ██  23 24  │  ← Blocked dates (existing bookings)
│  25 26 27 28 29 30       │
└───────────────────────────┘
```

## Typography
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Month/year header | text-sm (14px) | font-medium (500) | foreground |
| Day of week header | text-xs (12px) | font-medium (500) | muted-foreground |
| Day numbers | text-sm (14px) | font-normal (400) | foreground |
| Selected day | text-sm (14px) | font-medium (500) | primary-foreground |
| Disabled day | text-sm (14px) | font-normal (400) | muted-foreground (opacity-50) |

## Border Radius & Shadows
- **Calendar container:** rounded-md (6px), border
- **Selected range start/end:** rounded-full
- **Selected range middle:** No radius (fills row)
- **Nav buttons:** rounded-sm (4px)

## Responsive Behavior
- **Desktop:** Inline in booking sidebar
- **Mobile:** Full-width, could show in modal
- **Months shown:** 1 (reference) — consider 2 for desktop
- **Touch targets:** 40px minimum day cell size

## Interactive States
| State | Behavior |
|-------|----------|
| Default | Current month displayed, today highlighted |
| Day hover | Background color change (accent) |
| Range start selected | Rounded-full highlight on start date |
| Range in progress | Background fills between start and hover |
| Range complete | Start + end rounded, middle filled |
| Blocked date | Strikethrough or disabled appearance, not clickable |
| Invalid selection | Toast notification "Date is already booked" |
| Past dates | Disabled (grayed out, not selectable) |

## Data Shape
```typescript
// Props
{
  bookings: Array<{
    checkIn: Date;
    checkOut: Date;
  }>;
  onRangeChange: (range: DateRange | undefined) => void;
  defaultRange?: DateRange;
}

// DateRange (from react-day-picker)
{
  from: Date;
  to: Date;
}
```

## Integration Pattern (Zustand Store)
```typescript
// From aumsoni2002 utils/store.ts
type PropertyState = {
  propertyId: string;
  price: number;
  bookings: Booking[];
  range: DateRange | undefined;
};
```

## 1DB Adaptation Notes
- **Extend:** We already have an availability calendar system from Track A (CC-9a)
- **Add:** Minimum/maximum stay enforcement (from stay rules)
- **Add:** Availability "heat map" coloring (available vs. booked vs. blocked)
- **Add:** Trust-gated dates (some dates only for high-trust guests — different visual treatment)
- **Add:** Check-in/check-out time display below calendar
- **Keep:** react-day-picker (already using via shadcn), range selection, blocked dates
- **Consider:** 2-month side-by-side view on desktop (more Airbnb-like)
- **Remove:** Default "today + 7 days" selection (let user pick fresh)
