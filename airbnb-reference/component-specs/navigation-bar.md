# Navigation Bar

## Source
- **Repo:** aumsoni2002/Airbnb-Clone
- **File:** `components/navbar/Navbar.tsx` (21 LOC)
- **Supporting:** `NavSearch.tsx` (47), `LinksDropdown.tsx` (65), `DarkMode.tsx`, `Logo.tsx`

## Dimensions
- **Height:** Auto (~64px with padding)
- **Padding:** py-4 (16px top/bottom), container handles horizontal padding (px-8 / 32px)
- **Max width:** max-w-6xl to max-w-7xl (1152px to 1280px)
- **Border:** border-b (1px bottom border)

## Layout
```
Desktop (sm+): [Logo] -------- [SearchInput] -------- [DarkMode] [MenuDropdown]
Mobile:        [Logo]
               [SearchInput (full width)]
               [DarkMode] [MenuDropdown]
```

- **Desktop:** `flex-row justify-between items-center`
- **Mobile:** `flex-col gap-4` (stacked)

## Typography
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Logo text | text-xl (20px) | font-bold (700) | foreground |
| Search input | text-sm (14px) | font-normal (400) | foreground / placeholder: muted-foreground |
| Dropdown links | text-sm (14px) | font-medium (500) | foreground |

## Border Radius & Shadows
- **Navbar:** No radius, border-b only
- **Search input:** rounded-md (6px)
- **Dropdown menu:** rounded-md (6px), shadow-md
- **Dark mode button:** rounded-sm (4px)
- **User avatar:** rounded-full

## Responsive Behavior
- **sm+ (640px):** Horizontal layout, search centered
- **Mobile:** Stacked vertical, search full width
- **Logo:** Responsive (hidden text on mobile in ski043 pattern)

## Interactive States
| State | Behavior |
|-------|----------|
| Default | Static bar with border-b |
| Search focus | Input ring color (ring-2 ring-ring) |
| Dropdown open | Menu appears below with shadow-md |
| Dark mode | bg-background changes, all colors flip via CSS vars |
| Scroll | Static (no sticky behavior in reference — consider adding for 1DB) |

## Data Shape
```typescript
{
  user: {
    isSignedIn: boolean;
    firstName: string;
    imageUrl: string;
    isAdmin: boolean;
  } | null;
}
```

## 1DB Adaptation Notes
- **Add:** Notification bell icon (between search and menu)
- **Add:** Connection request count badge
- **Add:** Sticky navbar on scroll (not in reference but standard for Airbnb)
- **Modify:** Logo → 1DB brand logo
- **Modify:** Search → Pill-style trigger (borrow from ski043's SearchComponent)
- **Keep:** Border-b separator, dropdown menu pattern, responsive stacking
- **Replace:** Clerk auth → existing 1DB auth system
- **Consider:** Dark mode toggle (useful for future, low priority for MVP)
