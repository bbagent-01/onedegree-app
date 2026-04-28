# Photo Gallery

## Source
- **Repo:** aumsoni2002/Airbnb-Clone (best available, but limited)
- **File:** `components/properties/ImageContainer.tsx` (24 LOC)
- **Note:** None of the 3 repos implement a proper gallery. This spec combines the reference with Airbnb's actual pattern.

## Reference Implementation (aumsoni)
- Single hero image
- Responsive height: 300px mobile → 500px desktop
- Next Image with priority loading
- rounded-md border radius

## Target Implementation (Airbnb Pattern)

### Dimensions
- **Grid container:** Full width, h-[400px] md:h-[500px]
- **Main image (left):** 50% width, full height
- **Small images (right):** 2x2 grid, each 25% width, 50% height
- **Gap:** 8px between all images
- **Border radius:** rounded-xl (12px) on outer corners only

### Layout
```
Desktop:
┌──────────────────────┬───────────┬───────────┐
│                      │           │           │
│   Main Image (1)     │  Image 2  │  Image 3  │
│                      │           │           │
│                      ├───────────┼───────────┤
│                      │           │           │
│                      │  Image 4  │  Image 5  │
│                      │           │           │
└──────────────────────┴───────────┴───────────┘
                              [Show all photos]

Mobile:
┌────────────────────────────────────┐
│                                    │
│         Swipeable Carousel         │
│                                    │
│              • • ○ • •             │
└────────────────────────────────────┘
                                 1 / 12
```

### Typography
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| "Show all photos" button | text-sm (14px) | font-semibold (600) | foreground |
| Photo count (mobile) | text-sm (14px) | font-medium (500) | white on dark overlay |

### Border Radius & Shadows
- **Grid container:** rounded-xl (12px) with overflow-hidden
- **Individual images:** No radius (container handles clipping)
- **"Show all photos" button:** rounded-lg (8px), bg-white, border, shadow-sm
- **Lightbox overlay:** No radius, full screen

### Responsive Behavior
- **Desktop (md+):** 5-image grid (1 large + 4 small)
- **Mobile:** Full-width swipeable carousel with dot indicators
- **Tablet:** Could be 3-image grid (1 large + 2 small) or carousel

### Interactive States
| State | Behavior |
|-------|----------|
| Default | Static grid |
| Image hover | Slight darken overlay (bg-black/5) |
| Image click | Opens lightbox |
| "Show all photos" click | Opens full gallery lightbox |
| Lightbox open | Full screen, dark background, left/right arrows, close button |
| Carousel swipe (mobile) | Smooth horizontal scroll, dots update |

### Data Shape
```typescript
{
  images: Array<{
    url: string;
    alt: string;
    width: number;
    height: number;
  }>;
  listingTitle: string; // For alt text context
}
```

## Trustead Adaptation Notes
- **Build from scratch** — no reference repo has this, but it's essential
- **Priority:** Medium (CC-B3) — use single hero image for CC-B2 MVP
- **Consider:** Use a library like `embla-carousel` for mobile carousel
- **Add:** Image upload in listing creation wizard (drag & drop, reorder)
- **Keep:** Airbnb's 5-image grid pattern (proven, recognizable)
- **Note:** Images stored in Supabase Storage (same as reference repos)
