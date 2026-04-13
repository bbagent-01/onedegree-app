# Listing Card

## Source
- **Repo:** aumsoni2002/Airbnb-Clone
- **File:** `components/card/PropertyCard.tsx` (54 LOC)
- **Supporting:** `PropertyRating.tsx`, `CountryFlagAndName.tsx`, `FavoriteToggleButton.tsx`

## Dimensions
- **Card width:** Fluid (fills grid column)
- **Image height:** 300px (`h-[300px]`)
- **Image border-radius:** 8px (`rounded-md`)
- **Card padding:** 0 (borderless card, content below image)
- **Content gap:** 4px (`mt-1` between elements)
- **Overall gap between cards:** 16px-20px (`gap-4` to `gap-5` in grid)

## Typography
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Title | text-base (16px) | font-semibold (600) | foreground |
| Tagline | text-sm (14px) | font-normal (400) | muted-foreground |
| Price | text-base (16px) | font-semibold (600) | foreground |
| "/ night" | text-sm (14px) | font-normal (400) | muted-foreground |
| Rating | text-sm (14px) | font-medium (500) | foreground |

## Border Radius & Shadows
- **Image:** rounded-md (6px)
- **Card container:** No border, no shadow (borderless design)
- **Favorite button:** rounded-full (circle)
- **Hover:** No shadow change, image scale transform

## Responsive Behavior
- **Grid:** 1 col mobile → 2 col sm → 3 col md → 4 col lg
- **Image:** Responsive via Next Image `sizes="(max-width: 768px) 100vw, 50vw"`
- **Text truncation:** Title truncated to 30 chars, tagline to 40 chars

## Interactive States
| State | Behavior |
|-------|----------|
| Default | Image at scale 1.0 |
| Hover | Image scales to 1.1 over 300ms (`transition-transform duration-300 hover:scale-110`) |
| Favorite (off) | Outline heart icon, absolute top-right of image |
| Favorite (on) | Filled heart icon, same position |
| Loading | Skeleton card placeholder (LoadingCards component) |

## Data Shape
```typescript
{
  id: string;
  name: string;          // Truncated to 30 chars
  tagline: string;       // Truncated to 40 chars
  image: string;         // Supabase image URL
  price: number;         // Nightly rate in dollars
  country: string;       // Country code for flag
  rating: number | null; // Average rating
  isFavorite: boolean;   // Whether current user favorited
}
```

## 1DB Adaptation Notes
- **Add:** Trust score badge (top-left of image, color-coded green/amber/purple)
- **Add:** Connection degree indicator ("2nd degree" text below host name)
- **Add:** Vouch count ("4 vouches" next to or replacing star rating)
- **Add:** Image carousel (swipeable on mobile, dots indicator)
- **Remove:** Country flag (replace with community/network indicator)
- **Modify:** Rating → Trust score (0-100 scale with tier badge)
- **Keep:** Hover scale animation, favorite toggle, price display, borderless card design
