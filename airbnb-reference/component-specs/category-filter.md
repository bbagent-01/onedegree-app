# Category Filter Row

## Source
- **Repo:** ski043/airbnb-yt
- **File:** `app/components/MapFilterItems.tsx` (53 LOC)
- **Supporting:** Category data array with icons

## Dimensions
- **Row height:** ~64px (icon + label + padding)
- **Item width:** ~80-100px fixed per item
- **Icon size:** 24px (w-6 h-6)
- **Horizontal padding:** px-5 to px-10 (20-40px)
- **Gap between items:** 16px-20px (gap-4 to gap-5)
- **Active indicator:** border-b-2 (2px bottom border)

## Layout
```
[🏖️ Beach] [🔥 Trending] [✨ Luxe] [🏊 Pool] [🌊 Lakefront] [🏕️ Camping] ...
                                                                    → scroll →
```

- Horizontal scrollable container
- `overflow-x-scroll` with hidden scrollbar (`.no-scrollbar`)
- `flex gap-x-4` or `gap-x-5`
- Each item: `flex-shrink-0` to prevent compression

## Typography
| Element | Size | Weight | Color (inactive) | Color (active) |
|---------|------|--------|-------------------|----------------|
| Category label | text-xs (12px) | font-medium (500) | muted-foreground | foreground |

## Border Radius & Shadows
- **Row container:** No radius, no shadow
- **Individual items:** No radius (text + icon only)
- **Active underline:** border-b-2, border-foreground (or brand color)

## Responsive Behavior
- **All sizes:** Horizontal scroll, same layout
- **Mobile:** Natural touch scroll
- **Desktop:** Scroll on hover/drag, could add arrow buttons
- **No breakpoint changes** — consistent horizontal scroll pattern

## Interactive States
| State | Behavior |
|-------|----------|
| Default (inactive) | Muted text, no underline |
| Hover | Text darkens (opacity change or color shift) |
| Active | Dark text + border-b-2 underline |
| Click | Navigates via Link, adds `?filter=category` to URL |
| Scroll | Smooth horizontal scroll, no scrollbar visible |

## Data Shape
```typescript
type Category = {
  id: string;
  name: string;        // Display label
  icon: ReactNode;     // Lucide icon or SVG
  value: string;       // URL param value
};
```

## 1DB Adaptation Notes
- **Replace categories:** Airbnb's (Beach, Trending, Luxe) → 1DB types:
  - Whole Home, Private Room, Shared Space, Unique Stays
  - Verified Hosts, High Trust, Instant Book, New Listings
- **Keep:** Horizontal scroll, active underline, URL-based filtering
- **Add:** "All" first item (default, no filter)
- **Use:** Lucide icons for consistency with existing component library
- **Consider:** Two rows — listing type + trust filters — or a combined row
