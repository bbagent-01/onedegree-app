# User Flow Inventory

> Documenting user flows from the best reference repos, mapped to Trustead's trust-based model.
> Primary reference: aumsoni2002 (most complete flows) | Secondary: ski043 (wizard pattern)

---

## 1. Guest Flow: Browse → Book → Vouch

### Step 1: Browse Listings
| Aspect | Reference | Trustead Adaptation |
|--------|-----------|----------------|
| Route | `/` | `/` or `/explore` |
| Components | PropertiesContainer, PropertiesList, PropertyCard, CategoriesList | Same + TrustBadge, ConnectionIndicator |
| Data | Fetch all properties with search/category filters | Add trust-level filter, connection-degree filter |
| Flow | Load page → See grid of listings → Scroll/filter | Same + default to "My Network" view, option for "All Listings" |

**Trustead trust mechanics:**
- Default view shows listings from 1st and 2nd degree connections
- "Explore" mode shows all listings with trust scores visible
- Listings from unconnected hosts show reduced info (no exact address until booking confirmed)
- Trust score badge on each card (green/amber/red tier)

### Step 2: Filter & Search
| Aspect | Reference | Trustead Adaptation |
|--------|-----------|----------------|
| Route | `/?search=X&category=Y` | `/?q=X&type=Y&trust=Z&network=1` |
| Components | NavSearch (debounced), CategoriesList, URL params | Same + TrustFilter, NetworkScope toggle |
| Data | Text search + category filter via server action | Add: trust level filter, network degree filter, date availability |
| Flow | Type in search → See filtered results → Click category | Same + toggle "My Network" / "All" / "Verified Only" |

**Trustead trust mechanics:**
- "My Network" = only hosts you're connected to (1st/2nd degree)
- "Verified" = hosts with 3+ vouches from your network
- Trust filter: Minimum trust score slider

### Step 3: View Listing Detail
| Aspect | Reference | Trustead Adaptation |
|--------|-----------|----------------|
| Route | `/properties/[id]` | `/listing/[id]` |
| Components | ImageContainer, PropertyDetails, BookingCalendar, BookingForm, PropertyMap, Amenities, Reviews | Same + TrustPanel, ConnectionPath, VouchList, HostProfile |
| Data | Property details, bookings (for calendar), reviews | Add: host trust score, mutual connections, vouch history |
| Flow | See hero image → Read details → Check calendar → See price → Book | Same + See trust score → View connection path → Read vouches → Contact or Book |

**Trustead trust mechanics:**
- Trust panel shows: host trust score, # of vouches, connection degree
- Connection path: "You → Sarah → John (Host)" visualization
- Vouch list: Recent vouches with vouch text
- If unconnected: Show "Request Introduction" button instead of direct booking
- Exact address revealed only after booking confirmation

### Step 4: Contact Host (Trustead-specific)
| Aspect | Reference | Trustead Adaptation |
|--------|-----------|----------------|
| Route | N/A (no messaging in refs) | `/messages/new?listing=[id]&host=[id]` |
| Components | N/A | MessageComposer, ListingPreview, TrustBadge |
| Data | N/A | Listing summary, host profile, connection path |
| Flow | N/A | Click "Contact Host" → Pre-filled message with listing ref → Send → Wait for response |

**Trustead trust mechanics:**
- Required step for 1st-time guests (no instant booking on first stay)
- Message includes your trust score and mutual connections
- Host sees guest's vouch history before responding

### Step 5: Book
| Aspect | Reference | Trustead Adaptation |
|--------|-----------|----------------|
| Route | `/checkout` (aumsoni) | `/booking/[listingId]/confirm` |
| Components | BookingCalendar, BookingForm, ConfirmBooking, Stripe | Same + TrustVerification, CommunityFeeBreakdown |
| Data | Date range, price calculation, payment | Add: trust verification status, community fee details |
| Flow | Select dates → See price breakdown → Pay → Confirmation | Select dates → See breakdown → Trust check → Pay → Confirmation |

**Trustead trust mechanics:**
- Trust verification check before payment (minimum trust score met?)
- Price breakdown includes transparent community fee
- Cancellation policy displayed with trust-based flexibility
- High-trust guests may get flexible cancellation; new guests get strict

### Step 6: Stay (post-booking)
| Aspect | Reference | Trustead Adaptation |
|--------|-----------|----------------|
| Route | `/bookings` (aumsoni) | `/my-trips/[bookingId]` |
| Components | Booking history table | TripDetail, HostContact, CheckInGuide, EmergencyContacts |
| Data | Booking record with dates, property | Add: check-in instructions, host contact, house rules |
| Flow | View upcoming booking → See dates | View trip → Get check-in details → Access host contact → See house rules |

### Step 7: Review
| Aspect | Reference | Trustead Adaptation |
|--------|-----------|----------------|
| Route | `/reviews` (aumsoni) | `/my-trips/[bookingId]/review` |
| Components | SubmitReview, RatingInput, Comment | ReviewForm, TrustRating, StayFeedback |
| Data | Rating (1-5), comment text | Add: trust rating, would-you-vouch prompt |
| Flow | Rate → Comment → Submit | Rate stay → Rate trust → Comment → Optionally vouch |

### Step 8: Vouch (Trustead-specific)
| Aspect | Reference | Trustead Adaptation |
|--------|-----------|----------------|
| Route | N/A | `/profile/[hostId]/vouch` |
| Components | N/A | VouchForm, TrustScorePreview, ConnectionStrength |
| Data | N/A | Vouch text, trust score impact preview |
| Flow | N/A | After positive stay → Prompt to vouch → Write vouch → Submit → Host's trust score updates |

---

## 2. Host Flow: Create → Manage → Review

### Step 1: Create Listing
| Aspect | Reference | Trustead Adaptation |
|--------|-----------|----------------|
| Route | `/rentals/create` (aumsoni) or `/create/[id]/structure` (ski) | `/host/create` (multi-step wizard) |
| Components | FormContainer, form inputs (aumsoni) OR multi-step pages (ski) | ListingWizard with 5-6 steps |
| Data | Title, description, price, images, amenities, location | Same + trust/visibility settings, stay rules, community preferences |
| Flow | Fill single form → Upload image → Submit (aumsoni) OR Step 1: Category → Step 2: Details → Step 3: Location (ski) | Step-by-step wizard pattern from ski043 |

**Trustead wizard steps:**
1. **Basics** — Title, description, listing type (whole home, room, shared)
2. **Details** — Bedrooms, beds, baths, amenities, guests capacity
3. **Photos** — Image upload (gallery, not single image)
4. **Location** — Address, map pin, neighborhood description
5. **Pricing & Availability** — Nightly rate, cleaning fee, calendar setup, stay rules
6. **Trust & Visibility** — Who can see (network only, verified, all), minimum trust score for guests, booking approval (auto/manual)
7. **Preview & Publish** — Review all, preview listing card, publish

### Step 2: Set Availability
| Aspect | Reference | Trustead Adaptation |
|--------|-----------|----------------|
| Route | N/A (basic in aumsoni) | `/host/listings/[id]/calendar` |
| Components | BookingCalendar (read-only in listing view) | AvailabilityCalendar, BulkDatePicker, StayRulesEditor |
| Data | Existing bookings block dates | Full availability ranges, stay rules, seasonal pricing |
| Flow | Dates auto-blocked by bookings | Host sets available ranges → Sets min/max stay → Sets seasonal pricing |

**Trustead adaptation:** We already have an availability calendar system from Track A (CC-9a). Extend with trust-gated availability.

### Step 3: Manage Bookings
| Aspect | Reference | Trustead Adaptation |
|--------|-----------|----------------|
| Route | `/reservations` (aumsoni) | `/host/bookings` |
| Components | Reservations table with stats | BookingQueue, GuestTrustCard, ApprovalActions |
| Data | Incoming bookings list | Add: guest trust score, mutual connections, vouch history |
| Flow | View reservations → See dates/guest | View requests → Check guest trust → Approve/decline → Manage stay |

**Trustead trust mechanics:**
- Booking requests show guest's trust score prominently
- Mutual connections displayed ("You both know Sarah and Mike")
- Auto-approve option for high-trust guests (trust score > threshold)
- Manual review required for new/low-trust guests

### Step 4: Review Guest
| Aspect | Reference | Trustead Adaptation |
|--------|-----------|----------------|
| Route | N/A (no host→guest reviews in refs) | `/host/bookings/[id]/review` |
| Components | N/A | GuestReviewForm, TrustRating |
| Data | N/A | Stay rating, trust rating, review text |
| Flow | N/A | After checkout → Rate guest → Trust rating → Comment → Optionally vouch |

---

## 3. Social Flow: Profile → Vouch → Invite

> **Entirely Trustead-specific** — no equivalent in any reference repo.

### Step 1: View Profile
| Route | `/profile/[userId]` |
|-------|---------------------|
| Components | ProfileHeader, TrustScore, VouchList, ConnectionDegree, ListingsPreview, ReviewHistory |
| Data | User profile, trust score, vouches given/received, connection degree, listings, reviews |
| Flow | Click on user name anywhere → See profile → View trust info → See their listings |

### Step 2: Vouch
| Route | `/profile/[userId]/vouch` |
|-------|---------------------------|
| Components | VouchForm, TrustScorePreview |
| Data | Vouch text, trust categories (reliability, cleanliness, communication) |
| Flow | Visit profile → Click "Vouch" → Write vouch → Submit → Their trust score updates |

**Rules:**
- Can only vouch for someone you've had a completed stay with (as host or guest)
- Vouches are reciprocal-eligible (they can vouch back)
- Vouch expires after 2 years (needs renewal via another stay or manual re-vouch)

### Step 3: Invite
| Route | `/invite` |
|-------|-----------|
| Components | InviteForm, ConnectionPreview, InviteLink |
| Data | Invite email/link, inviter's trust context |
| Flow | Click "Invite" → Enter email or copy link → New user signs up → Auto-connected to inviter |

**Trust mechanics:**
- New users inherit a baseline trust from their inviter
- Inviter's reputation is partially staked on invitee behavior
- First 3 stays build independent trust score

---

## 4. Route Map Summary

### Reference Routes (from repos)
```
/                           → Homepage (listing grid)
/properties/[id]            → Listing detail (aumsoni)
/home/[id]                  → Listing detail (ski)
/homes/[id]                 → Listing detail (krgyaan)
/rentals/create             → Create listing (aumsoni)
/create/[id]/structure      → Create step 1 (ski)
/create/[id]/description    → Create step 2 (ski)
/create/[id]/address        → Create step 3 (ski)
/rentals                    → Host listings (aumsoni)
/my-homes                   → Host listings (ski)
/dashboard                  → Host dashboard (krgyaan)
/bookings                   → Guest bookings (aumsoni)
/reservations               → Host reservations (aumsoni/ski)
/favorites                  → Saved listings (aumsoni/ski)
/reviews                    → User reviews (aumsoni)
/checkout                   → Payment (aumsoni)
/profile                    → User profile (aumsoni)
/admin                      → Admin dashboard (aumsoni)
```

### Trustead Proposed Routes
```
/                           → Homepage / Explore (listing grid with network filter)
/explore                    → All listings (no network filter)
/listing/[id]               → Listing detail + trust panel
/host/create                → Create listing wizard (multi-step)
/host/listings              → Host's listings dashboard
/host/listings/[id]/edit    → Edit listing
/host/listings/[id]/calendar → Availability calendar
/host/bookings              → Booking requests & management
/my-trips                   → Guest's upcoming & past trips
/my-trips/[id]              → Trip detail
/my-trips/[id]/review       → Review after stay
/saved                      → Saved/favorited listings
/messages                   → Message inbox
/messages/[threadId]        → Message thread
/profile/[userId]           → User profile + trust score
/profile/[userId]/vouch     → Write a vouch
/invite                     → Invite new members
/settings                   → Account settings
/admin                      → Admin dashboard (if applicable)
```

---

## 5. Component Usage Per Flow

| Component | Guest Browse | Guest Book | Host Create | Host Manage | Social |
|-----------|-------------|------------|-------------|-------------|--------|
| ListingCard | X | | | X | |
| Navbar | X | X | X | X | X |
| SearchPill | X | | | | |
| CategoryFilter | X | | | | |
| PhotoGallery | | X | | | |
| DatePicker | | X | X | X | |
| BookingSidebar | | X | | | |
| HostDashboard | | | | X | |
| ListingWizard | | | X | | |
| MessageThread | | X | | X | |
| TrustBadge | X | X | | X | X |
| ConnectionPath | | X | | X | X |
| VouchCard | | | | | X |
| ProfileHeader | | | | | X |
