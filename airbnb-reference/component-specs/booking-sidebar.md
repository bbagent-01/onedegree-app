# Booking Sidebar

## Source
- **Repo:** aumsoni2002/Airbnb-Clone
- **File:** `components/booking/BookingForm.tsx` (47 LOC)
- **Supporting:** `BookingCalendar.tsx`, `BookingContainer.tsx`, `ConfirmBooking.tsx`

## Dimensions
- **Width:** 4/12 columns (33%) of content area on desktop
- **Padding:** p-6 (24px) inside card
- **Card border-radius:** rounded-lg (8px)
- **Card shadow:** shadow-lg
- **Sticky top offset:** top-24 (96px) when scrolling
- **Gap between sections:** 16px-24px

## Layout
```
Desktop (lg:col-span-4):
┌─────────────────────────┐
│  $125 / night            │
│                          │
│  ┌─────────────────────┐ │
│  │   Calendar           │ │
│  │   [Check-in]         │ │
│  │   [Check-out]        │ │
│  └─────────────────────┘ │
│                          │
│  ──────────────────────  │
│  $125 x 5 nights  $625  │
│  Cleaning fee       $50  │
│  Service fee        $75  │
│  Tax                $65  │
│  ──────────────────────  │
│  Total             $815  │
│                          │
│  [    Reserve    ]       │
└─────────────────────────┘

Mobile: Full-width card at bottom of listing detail
```

## Typography
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Price (nightly) | text-xl (20px) | font-bold (700) | foreground |
| "/ night" | text-sm (14px) | font-normal (400) | muted-foreground |
| Line item labels | text-sm (14px) | font-normal (400) | foreground |
| Line item amounts | text-sm (14px) | font-normal (400) | foreground |
| Total label | text-base (16px) | font-semibold (600) | foreground |
| Total amount | text-base (16px) | font-bold (700) | foreground |

## Border Radius & Shadows
- **Card:** rounded-lg (8px), border, shadow-lg
- **Reserve button:** rounded-lg (8px)
- **Separator:** `<Separator />` component (1px border)

## Responsive Behavior
- **Desktop (lg+):** Sticky sidebar, 4-col span
- **Mobile:** Full-width card below listing content OR sticky bottom bar with "Reserve" button + price summary
- **Tablet:** Could be inline below content or narrow sidebar

## Interactive States
| State | Behavior |
|-------|----------|
| Default | Card with current price, empty calendar |
| Dates selected | Price breakdown calculates and appears |
| No dates | Only price shown, "Select dates" prompt |
| Reserve hover | Button darkens (bg-primary/90) |
| Reserve click | Form submission → confirmation or payment |
| Loading | Button shows spinner, disabled state |
| Auth required | "Sign in to reserve" replacement button |

## Price Calculation
```typescript
// From aumsoni2002 BookingForm.tsx
const totalNights = daysBetween(range.from, range.to);
const subTotal = price * totalNights;
const cleaning = subTotal * 0.10;  // 10% cleaning
const service = subTotal * 0.05;   // 5% service
const tax = subTotal * 0.08;       // 8% tax
const orderTotal = subTotal + cleaning + service + tax;
```

## Data Shape
```typescript
{
  price: number;           // Nightly rate
  range: DateRange | null; // Selected dates (from Zustand or prop)
  totalNights: number;     // Calculated
  subTotal: number;
  cleaningFee: number;
  serviceFee: number;
  tax: number;
  total: number;
  isAuthenticated: boolean;
}
```

## 1DB Adaptation Notes
- **Add:** Trust score display at top of sidebar ("Host verified by 12 community members")
- **Add:** Connection path ("You → Sarah → Host")
- **Add:** "Contact Host First" option (for first-time or low-trust connections)
- **Modify:** Fee structure — transparent community fee instead of service fee
- **Add:** Cancellation policy section (trust-based: flexible for high-trust, strict for new)
- **Add:** "Request to Book" vs "Instant Book" based on host settings
- **Keep:** Price breakdown layout, sticky sidebar, reserve button pattern
- **Consider:** Remove tax line if not applicable to community model
