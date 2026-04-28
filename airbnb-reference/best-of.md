# Best-Of Component Comparison

> Maps each target component to the best implementation across the 3 reference repos.
> Key: **aumsoni** = aumsoni2002/Airbnb-Clone | **ski** = ski043/airbnb-yt | **krgyaan** = krgyaan/Airbnb-clone

---

## 1. Listing Card

| Aspect | aumsoni | ski | krgyaan |
|--------|---------|-----|---------|
| Image carousel | No (single image) | No (single image) | No (single image) |
| Price display | Yes ($X/night) | Yes ($X/night) | Yes ($X/night) |
| Rating/reviews | Yes (star rating) | No | No |
| Hover states | Yes (scale 1.1) | No | No |
| Favorite toggle | Yes (heart button) | Yes (heart button) | No |
| Country flag | Yes | Yes (flag + region) | No |
| Truncation | Yes (30/40 char) | Yes (line-clamp-2) | No |

**Winner: aumsoni** — `components/card/PropertyCard.tsx` (54 LOC)

**Why:** Most complete card with rating display, hover animation, favorite toggle, price, country flag, and text truncation. Clean 54-line component with good separation of concerns.

**Trustead Adaptations:**
- Add trust score badge (replaces Superhost concept)
- Add connection indicator ("2nd degree" / "friend of X")
- Add image carousel (none of the repos have this — will need custom implementation)
- Replace country flag with community/network badge
- Add vouch count indicator

---

## 2. Navigation Bar

| Aspect | aumsoni | ski | krgyaan |
|--------|---------|-----|---------|
| Desktop layout | Logo + Search + Menu | Logo + Search + Menu | Logo + Search + Menu |
| Mobile layout | Stacked (flex-col) | Different logos | Mobile nav + sheet |
| Dark mode | Yes (toggle) | No | No |
| Auth integration | Clerk (SignedIn/Out) | Kinde (dropdown) | Supabase (popover) |
| Search in nav | Debounced input | Modal pill trigger | Sheet overlay |

**Winner: aumsoni** — `components/navbar/Navbar.tsx` (21 LOC) + subcomponents

**Why:** Cleanest implementation with dark mode support, Clerk auth (closest to our stack), and responsive flex layout. The search is inline and debounced rather than modal-based.

**Trustead Adaptations:**
- Replace Clerk with our existing auth system
- Add notification bell icon
- Add connection request indicator
- Keep dark mode toggle for future
- Search pill style (borrow from ski043's SearchComponent for the pill UI)

---

## 3. Search Bar / Search Pill

| Aspect | aumsoni | ski | krgyaan |
|--------|---------|-----|---------|
| UI pattern | Inline text input | Pill trigger → modal | Sheet overlay |
| Multi-step | No | Yes (2 steps) | Yes (country + dates) |
| Location search | Text query | Country dropdown + map | Country input |
| Date picker | No (separate) | No (separate) | Yes (integrated) |
| Guest counter | No | Yes (3 counters) | No |

**Winner: ski** — `app/components/SearchComponent.tsx` (146 LOC)

**Why:** Most Airbnb-like with the pill trigger ("Anywhere | Any Week | Add Guests") and multi-step search modal with country selection + map preview + guest/room counters.

**Trustead Adaptations:**
- Replace "Anywhere" with community/network scope filter
- Add "Trust level" filter option
- Date picker integration (combine with ski's calendar)
- Add "Connections only" toggle
- Simplify to: Location | Dates | Guests | Trust Level

---

## 4. Category Filter Row

| Aspect | aumsoni | ski | krgyaan |
|--------|---------|-----|---------|
| Scroll behavior | ScrollArea component | overflow-x-scroll | overflow-x-scroll |
| Icon type | Lucide icons | Image-based icons | SVG icons (inline) |
| Active state | Text color change | Border-bottom underline | Border-bottom + brand color |
| URL persistence | Yes (search params) | Yes (query params) | Yes (query params) |
| Count | ~15 categories | ~13 categories | ~10 categories |

**Winner: ski** — `app/components/MapFilterItems.tsx` (53 LOC)

**Why:** Most Airbnb-faithful with bottom-border active state, clean horizontal scroll, and URL-based filtering. The hidden scrollbar CSS is a nice touch for cleaner mobile UX.

**Trustead Adaptations:**
- Replace Airbnb categories with Trustead listing types (whole home, private room, shared space, etc.)
- Add "Verified hosts" and "High trust" as filter categories
- Keep horizontal scroll + active underline pattern
- Use Lucide icons instead of images for consistency

---

## 5. Photo Gallery

| Aspect | aumsoni | ski | krgyaan |
|--------|---------|-----|---------|
| Implementation | Single hero image | Single large image | Single image |
| Carousel | No | No | No |
| Lightbox | No | No | No |
| Grid layout | No | No | No |

**Winner: aumsoni** — `components/properties/ImageContainer.tsx` (24 LOC)

**Why:** Best of a weak field. Uses responsive height (300px mobile, 500px desktop), Next Image with priority loading, and proper alt text. None have a gallery — this is a gap we'll need to fill custom.

**Trustead Adaptations:**
- Build a proper Airbnb-style 5-image grid (1 large + 4 small)
- Add lightbox with left/right navigation
- Add "Show all photos" button
- Consider image carousel on mobile (swipeable)
- This component needs to be built from scratch for CC-B2

---

## 6. Date Picker / Calendar

| Aspect | aumsoni | ski | krgyaan |
|--------|---------|-----|---------|
| Library | react-day-picker (shadcn) | react-date-range | react-date-range |
| Range selection | Yes | Yes | Yes |
| Blocked dates | Yes (from bookings) | Yes (from reservations) | No |
| Months shown | 1 | 1 | 1-2 (responsive) |
| Integration | Zustand store | Hidden form inputs | Callback to parent |

**Winner: aumsoni** — `components/booking/BookingCalendar.tsx` (56 LOC)

**Why:** Best date blocking logic with Zustand state management, toast notifications for invalid dates, and clean integration with the booking flow. Uses shadcn Calendar (react-day-picker) which matches our existing component library.

**Trustead Adaptations:**
- Already using similar pattern in Track A calendar system
- Add minimum/maximum stay enforcement
- Add availability "heat map" (green = available, red = booked)
- Show trust-gated availability (some dates only for high-trust guests)
- Integrate with our existing stay rules validation

---

## 7. Booking Sidebar

| Aspect | aumsoni | ski | krgyaan |
|--------|---------|-----|---------|
| Price breakdown | Yes (subtotal, cleaning, service, tax) | Minimal (just form) | None |
| Calendar in sidebar | Via Zustand connection | Inline form | N/A |
| Total calculation | Yes (dynamic) | No | No |
| Auth check | Via server action | Conditional button | N/A |
| Payment | Stripe integration | No | No |

**Winner: aumsoni** — `components/booking/BookingForm.tsx` (47 LOC)

**Why:** Only implementation with proper Airbnb-style price breakdown (nightly rate, cleaning fee, service fee, tax, total). Dynamic calculation from Zustand state. Stripe payment integration.

**Trustead Adaptations:**
- Replace Stripe with our payment flow (or keep Stripe)
- Add trust score display ("Host verified by 12 community members")
- Add "Contact host first" option for low-trust connections
- Show connection path ("You → Sarah → Host")
- Add cancellation policy display
- Remove service fee (or make it transparent community fee)

---

## 8. Host Dashboard Layout

| Aspect | aumsoni | ski | krgyaan |
|--------|---------|-----|---------|
| View type | Card grid | Card grid | Table |
| Stats/analytics | Yes (admin page) | No | No |
| Charts | Yes (Recharts) | No | No |
| Actions | Edit, delete | None shown | Edit, delete, view |
| Booking management | Separate reservations page | Separate page | No |

**Winner: aumsoni** — `app/rentals/page.tsx` + `app/admin/page.tsx`

**Why:** Most complete with separate pages for listings management, incoming reservations, booking history, and admin analytics with Recharts charts. Proper stats (properties, bookings, revenue).

**Trustead Adaptations:**
- Add trust score dashboard (your trust rating, vouch count)
- Add community activity feed
- Add booking request queue (with trust-level indicators)
- Add earnings overview with community contribution metrics
- Keep the card grid for listings, add table view toggle

---

## 9. Create Listing Form / Wizard

| Aspect | aumsoni | ski | krgyaan |
|--------|---------|-----|---------|
| Pattern | Single page form | Multi-step wizard (3 pages) | Single page form |
| Steps | 4 sections on 1 page | Category → Description → Address | All fields at once |
| Image upload | Supabase storage | Supabase storage | Supabase storage |
| Validation | Zod schemas | Server-side | Yup schemas |
| Rich text | No | No | Yes (Quill editor) |

**Winner: ski** — `app/create/[id]/structure/`, `description/`, `address/`

**Why:** True multi-step wizard with dedicated pages per step, fixed bottom navigation bar, and progressive disclosure. Most Airbnb-like pattern (step 1: what, step 2: details, step 3: where).

**Trustead Adaptations:**
- Add step for "Trust & Visibility" settings (who can see, who can book)
- Add step for stay rules (min/max nights, check-in/out times)
- Add step for community preferences (guest requirements, vouch minimum)
- Keep the multi-step wizard pattern with bottom nav bar
- Add preview step before publishing
- Integrate with our existing availability calendar system

---

## 10. Message Thread UI

| Aspect | aumsoni | ski | krgyaan |
|--------|---------|-----|---------|
| Implementation | Review cards only | None | None |
| Real messaging | No | No | No |
| Thread view | No | No | No |

**Winner: aumsoni** — `components/reviews/ReviewCard.tsx` (41 LOC)

**Why:** Only repo with any message-like UI. The ReviewCard has user avatar, name, rating, and comment text. While not a messaging system, the card pattern is a good starting point for message thread UI.

**Trustead Adaptations:**
- Build a proper messaging system from scratch (none of the repos have one)
- Use the ReviewCard pattern as inspiration for message bubbles
- Add: inbox list, thread view, real-time updates, read receipts
- Add trust indicators in messages (vouch status, connection degree)
- Add booking request integration (messages linked to specific listing inquiries)
- This is a major build item for CC-B3 or later

---

## Summary: Best Source Per Component

| # | Component | Best Repo | File | Build Priority |
|---|-----------|-----------|------|----------------|
| 1 | Listing Card | aumsoni | `components/card/PropertyCard.tsx` | High — CC-B2 |
| 2 | Navigation Bar | aumsoni | `components/navbar/Navbar.tsx` | High — CC-B2 |
| 3 | Search Pill | ski | `app/components/SearchComponent.tsx` | Medium — CC-B3 |
| 4 | Category Filter | ski | `app/components/MapFilterItems.tsx` | High — CC-B2 |
| 5 | Photo Gallery | aumsoni* | `components/properties/ImageContainer.tsx` | Medium — CC-B3 (custom build) |
| 6 | Date Picker | aumsoni | `components/booking/BookingCalendar.tsx` | High — CC-B2 (extend Track A) |
| 7 | Booking Sidebar | aumsoni | `components/booking/BookingForm.tsx` | High — CC-B2 |
| 8 | Host Dashboard | aumsoni | `app/rentals/page.tsx` + `app/admin/` | Medium — CC-B3 |
| 9 | Create Listing | ski | `app/create/[id]/` (3 steps) | High — CC-B2 |
| 10 | Message Thread | aumsoni* | `components/reviews/ReviewCard.tsx` | Low — CC-B4 (custom build) |

*Asterisk = best of a weak field; will need significant custom work.

---

## Architecture Recommendation for CC-B2

**Primary reference: aumsoni2002** — Best overall component quality, Zustand state management, Prisma ORM, server actions, Clerk auth. Closest to our tech stack.

**Secondary reference: ski043** — Better multi-step wizard and search UI patterns. Use for UX flow inspiration.

**Skip: krgyaan** — Least complete. Useful only for the category SVG icons and SearchSheet overlay pattern.
