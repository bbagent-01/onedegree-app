# Create Listing Form / Wizard

## Source
- **Repo:** ski043/airbnb-yt
- **Files:**
  - `app/create/[id]/structure/page.tsx` (22 LOC) — Step 1: Category
  - `app/create/[id]/description/page.tsx` (100 LOC) — Step 2: Details
  - `app/create/[id]/address/page.tsx` (64 LOC) — Step 3: Location
  - `app/components/CreationBottomBar.tsx` (16 LOC) — Fixed nav bar

## Dimensions
- **Container:** max-w-lg (~512px) centered for form content
- **Form gap:** gap-6 (24px) between form sections
- **Input height:** h-10 (40px) standard inputs
- **Counter row:** h-12 (48px) per counter
- **Bottom bar:** h-16 (64px) fixed at bottom, full width
- **Category cards:** Grid of 4, ~120px each, gap-4 (16px)

## Layout
```
Step 1 — Category:
┌─────────────────────────────────────┐
│  Which describes your home best?     │
│                                      │
│  ┌────────┐ ┌────────┐              │
│  │ 🏠     │ │ 🏢     │              │
│  │ House  │ │ Apt    │              │
│  └────────┘ └────────┘              │
│  ┌────────┐ ┌────────┐              │
│  │ 🏡     │ │ 🏰     │              │
│  │ Cabin  │ │ Castle │              │
│  └────────┘ └────────┘              │
│                                      │
│  ═══════════════════════════════════ │
│  [Cancel]              [Next →]      │
└─────────────────────────────────────┘

Step 2 — Details:
┌─────────────────────────────────────┐
│  Describe your home                  │
│                                      │
│  Title: [________________]           │
│  Description: [__________]           │
│               [__________]           │
│  Price: [$___________]               │
│  Image: [📷 Upload]                 │
│                                      │
│  Guests    [-] 2 [+]                │
│  Rooms     [-] 1 [+]                │
│  Bathrooms [-] 1 [+]                │
│                                      │
│  ═══════════════════════════════════ │
│  [← Back]              [Next →]      │
└─────────────────────────────────────┘

Step 3 — Location:
┌─────────────────────────────────────┐
│  Where is your home located?         │
│                                      │
│  Country: [▾ Select country]         │
│                                      │
│  ┌─────────────────────────┐        │
│  │      Map Preview        │        │
│  └─────────────────────────┘        │
│                                      │
│  ═══════════════════════════════════ │
│  [← Back]              [Create]      │
└─────────────────────────────────────┘
```

## Typography
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Step title | text-2xl (24px) | font-bold (700) | foreground |
| Field labels | text-sm (14px) | font-medium (500) | foreground |
| Input text | text-sm (14px) | font-normal (400) | foreground |
| Input placeholder | text-sm (14px) | font-normal (400) | muted-foreground |
| Counter labels | text-base (16px) | font-medium (500) | foreground |
| Bottom bar buttons | text-sm (14px) | font-medium (500) | — |

## Border Radius & Shadows
- **Category cards:** rounded-lg (8px), border, selected: border-primary (2px)
- **Inputs:** rounded-md (6px)
- **Image upload area:** rounded-lg (8px), border-dashed
- **Bottom bar:** border-t, shadow-sm (top shadow)
- **Counter buttons:** rounded-full
- **Submit button:** rounded-lg (8px)

## Responsive Behavior
- **Desktop:** Centered max-w-lg form, fixed bottom bar
- **Mobile:** Full-width form, same fixed bottom bar
- **Category grid:** 2x2 on mobile, 4x1 on desktop
- **Map:** Full width within form container

## Interactive States
| State | Behavior |
|-------|----------|
| Category default | Border, no fill |
| Category selected | border-primary (2px), slight bg tint |
| Category hover | bg-accent/50 |
| Input focus | ring-2 ring-ring |
| Image upload | Dashed border, "Click to upload" |
| Image uploaded | Preview thumbnail replaces upload area |
| Counter min | Minus disabled at 0 (or 1 for guests) |
| Next button | Disabled until required fields filled |
| Submit loading | Spinner in button, all inputs disabled |
| Validation error | Red border on field, error text below |

## Data Shape (per step)
```typescript
// Step 1
{ categoryName: string }

// Step 2
{
  title: string;        // min 5 chars
  description: string;  // min 10 chars
  price: number;        // positive integer
  image: File;          // uploaded to Supabase
  guests: number;       // min 1
  bedrooms: number;     // min 0
  beds: number;         // min 1
  bathrooms: number;    // min 0
}

// Step 3
{
  country: string;      // country code
  // Could add: address, city, coordinates
}
```

## 1DB Adaptation Notes — Extended Wizard Steps

### 1DB Step 1: Basics
- Title, description, listing type (whole home, private room, shared)
- Same as ski043 step 2 but without price

### 1DB Step 2: Details
- Bedrooms, beds, baths, amenities checklist, max guests
- Borrow amenities grid from aumsoni2002 (`AmenitiesInput.tsx`)

### 1DB Step 3: Photos
- Multi-image upload (not in any reference — custom build)
- Drag & drop reorder
- Cover photo selection

### 1DB Step 4: Location
- Same as ski043 step 3
- Add: neighborhood description, nearby landmarks

### 1DB Step 5: Pricing & Availability
- Nightly rate, cleaning fee
- Calendar setup (integrate Track A availability system)
- Stay rules: min/max nights, check-in/check-out times

### 1DB Step 6: Trust & Visibility
- **New for 1DB:** Who can see this listing (network only, verified, all)
- Minimum trust score for booking
- Booking approval mode (auto for high-trust, manual for others)
- Guest requirements (must have X vouches, must be connected to you)

### 1DB Step 7: Preview & Publish
- Preview listing card + full listing page
- Publish button
- Save as draft option
