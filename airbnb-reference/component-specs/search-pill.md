# Search Bar / Search Pill

## Source
- **Repo:** ski043/airbnb-yt
- **File:** `app/components/SearchComponent.tsx` (146 LOC)
- **Supporting:** shadcn Dialog, Counter component

## Dimensions
- **Pill trigger:** Auto width, h-10 (40px), px-4 (16px), rounded-full
- **Modal:** Max-w-lg (~512px), auto height, rounded-lg (8px)
- **Counter row:** h-12 (48px) per counter, gap-4 (16px)
- **Map preview:** ~200px height in modal

## Layout
```
Pill trigger: [Anywhere] | [Any Week] | [Add Guests] [🔍]

Modal Step 1:
┌─────────────────────────────┐
│ Select Country              │
│ [Country Dropdown ▾]        │
│ ┌─────────────────────┐     │
│ │    Map Preview       │     │
│ └─────────────────────┘     │
│              [Next →]        │
└─────────────────────────────┘

Modal Step 2:
┌─────────────────────────────┐
│ Guests    [-] 1 [+]         │
│ Rooms     [-] 1 [+]         │
│ Bathrooms [-] 1 [+]         │
│              [Search]        │
└─────────────────────────────┘
```

## Typography
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Pill segments | text-sm (14px) | font-medium (500) | foreground |
| Pill dividers | text-sm | — | border color |
| Modal title | text-lg (18px) | font-semibold (600) | foreground |
| Counter labels | text-base (16px) | font-medium (500) | foreground |
| Counter value | text-base (16px) | font-semibold (600) | foreground |

## Border Radius & Shadows
- **Pill:** rounded-full (9999px), border, shadow-sm
- **Pill hover:** shadow-md transition
- **Modal:** rounded-lg (8px), shadow-xl (shadcn Dialog)
- **Country dropdown:** rounded-md (6px)
- **Counter buttons:** rounded-full

## Responsive Behavior
- **Desktop:** Pill in navbar, modal centered on screen
- **Mobile:** Pill simplified or becomes a bar/button
- **Modal:** Responsive via shadcn Dialog (max-w-lg, auto margins)

## Interactive States
| State | Behavior |
|-------|----------|
| Pill default | border + shadow-sm |
| Pill hover | shadow-md transition |
| Pill click | Opens Dialog modal |
| Step 1 | Country selection with map preview |
| Step 2 | Guest/room/bathroom counters |
| Counter min | Minus button disabled at 0 |
| Search submit | Redirects with URL params |

## Data Shape
```typescript
{
  // Search params (output)
  country: string;
  guests: number;
  rooms: number;
  bathrooms: number;
  // Date range (if integrated)
  startDate?: string;
  endDate?: string;
}
```

## 1DB Adaptation Notes
- **Add:** "Trust Level" filter (step 3 or integrated toggle)
- **Add:** "My Network" / "All" scope toggle
- **Modify:** Pill text → "Location | Dates | Guests | Trust"
- **Add:** Date picker integration (combine step 2 with dates)
- **Remove:** Map preview from step 1 (simplify — map on results page instead)
- **Keep:** Pill trigger pattern, multi-step modal, counter UI
- **Consider:** "Quick filters" chip row below pill (Verified Hosts, Instant Book, etc.)
