# Gap Flags — UX Map Phase A

Low-hanging UX gaps, dead ends, and inconsistencies caught while enumerating routes and components. NOT the full gap analysis — that happens in Phase B with Loren. Each item: where, what's missing, severity (low / med / high).

Severity is a guess based on visibility to new users and potential to block core trust flows.

---

## Dead ends

### D-1 · `/trips` is a redirect-only route
- **Where:** [src/app/(app)/trips/page.tsx](src/app/(app)/trips/page.tsx) — redirects to `/dashboard?tab=traveling`
- **Missing:** Nothing functional; route just exists for bookmarks. Candidate for removal, or should render the traveling dashboard itself.
- **Severity:** low

### D-2 · `/hosting` is also a redirect to `/dashboard`
- **Where:** copy.json shows "Redirects to /dashboard"
- **Missing:** Mobile users tapping "Host" in the nav land on dashboard tabs rather than a host-native surface.
- **Severity:** low

### D-3 · `/design` page publicly accessible
- **Where:** [src/app/design/page.tsx](src/app/design/page.tsx)
- **Missing:** No auth gate; appears in production builds. Renders AvailabilityCalendar in isolation — dev-only.
- **Severity:** med (exposes internal design system publicly; minor but a tell that the build isn't cleaned)

---

## Orphan routes & components

### O-1 · `/listings/[id]/reserve` under off-platform model
- **Where:** [src/app/(app)/listings/[id]/reserve/page.tsx](src/app/(app)/listings/[id]/reserve/page.tsx), [src/components/booking/reserve-form.tsx](src/components/booking/reserve-form.tsx)
- **Missing:** The product is off-platform (payments via Venmo/Zelle). The whole reserve flow is vestigial from the Airbnb-clone base. The page title is already "Contact host" but the form is still named `ReserveForm` and the primary CTA is "Confirm and reserve".
- **Severity:** high — primary funnel discontinuity

### O-2 · `listing-card-b.tsx` vs `listing-card.tsx`
- **Where:** [src/components/listing-card-b.tsx](src/components/listing-card-b.tsx) vs [src/components/listing-card.tsx](src/components/listing-card.tsx)
- **Missing:** Two near-duplicate components. `ListingCardB` is only used on `/dashboard/traveling`. Contains dead code (declared-but-unused `emblaApi` state).
- **Severity:** med (divergence risk)

### O-3 · Mock-data and seed-listing flags still present
- **Where:** [src/lib/mock-listings.ts](src/lib/mock-listings.ts) — 14 rows with `isSuperhost`; [src/lib/browse-utils.ts:99](src/lib/browse-utils.ts#L99) fallback
- **Missing:** Superhost flag has no equivalent in the Trustead model. Should be stripped from seeds and from UI render sites.
- **Severity:** med

### O-4 · Airbnb-clone `reviews.rating` vs Trustead three-rating schema
- **Where:** schema extension for `reviews.guest_rating`, `host_rating`, `listing_rating` (per PROJECT_PLAN.md)
- **Missing:** CHECK whether `/trips/[bookingId]` review modal actually captures all three. If only the legacy single `rating` is captured, the new columns are unused.
- **Severity:** high if unwired (trust-power math depends on guest_rating)

---

## Missing inverse flows

### I-1 · Host-side post-stay vouch prompt
- **Where:** [src/components/trust/post-stay-vouch-banner.tsx](src/components/trust/post-stay-vouch-banner.tsx) is guest-side only
- **Missing:** After a stay ends, guest sees a banner to vouch for host. Is there a host-side analog to vouch for the guest? The vouch-power math depends on hosts vouching post-stay for guests.
- **Severity:** high — asymmetry breaks the trust loop

### I-2 · Host cannot un-vouch from the host dashboard
- **Where:** Host review modal captures rating; vouch is a separate action
- **Missing:** If a host vouches for a past guest and later regrets it, the path to update/remove is via `/profile/[guestId]` — not discoverable from the host dashboard or trips list.
- **Severity:** low

### I-3 · Guest cannot cancel / edit intro request
- **Where:** `/api/contact-requests/[id]/cancel/route.ts` exists — CHECK if a UI surfaces it
- **Missing:** Search for a "Cancel intro" button in the inbox thread view.
- **Severity:** med (backend supports it, UI unclear)

### I-4 · Invite revocation
- **Where:** [src/app/(app)/invite/page.tsx](src/app/(app)/invite/page.tsx)
- **Missing:** After sending an invite, can the inviter revoke/cancel it? The pre-vouch is stored; if the inviter changes mind, no UI path visible.
- **Severity:** med

### I-5 · Block / report user flow
- **Where:** Nowhere found in audit
- **Missing:** Trust platform with no block mechanism. `/api/incidents/route.ts` exists — what does it do? CHECK if a UI surfaces.
- **Severity:** high (safety / trust platform minimum viable)

---

## Unreachable states

### U-1 · `TrustTag` has 7 documented states; no "loading" skeleton
- **Where:** [src/components/trust/trust-tag.tsx](src/components/trust/trust-tag.tsx)
- **Missing:** While trust data resolves, the tag shows raw props (or nothing). A skeleton shimmer state would prevent CLS on browse tiles.
- **Severity:** low

### U-2 · `VouchModal` "remove confirmation" state
- **Where:** [src/components/trust/vouch-modal.tsx](src/components/trust/vouch-modal.tsx)
- **Missing:** State exists in code; no obvious user path from the public app (only from /profile/[id] with existing vouch — verify).
- **Severity:** low

### U-3 · `GatedListingDialog` "signed_out" branch
- **Where:** [src/components/browse/gated-listing-dialog.tsx](src/components/browse/gated-listing-dialog.tsx)
- **Missing:** For signed-out users on /browse clicking a gated tile, does the dialog render a sign-in prompt or just close? CHECK.
- **Severity:** med (signed-out conversion moment)

---

## Under-specified trust states

### T-1 · 0° viewer on `/listings/[id]` with only "anyone_anywhere" preview rule
- **Missing:** Public signed-out viewer lands on a listing with `see_preview = anyone_anywhere`. What do they see? No host identity, no message CTA, no intro button (because intro requires auth). Just photos + location. Is there a clear "Sign in to connect" primary CTA?
- **Severity:** high — conversion surface

### T-2 · 4°+ viewer on `/profile/[id]`
- **Missing:** Zinc pill + chain of names. Is there a "Request intro through X" CTA from profile page? Or does the intro flow only live on listings?
- **Severity:** med

### T-3 · Viewer saves a listing to wishlist, then vouch is revoked
- **Missing:** Wishlist now contains listings the viewer can no longer fully access. `/wishlists/[id]` UNDEFINED behavior for this case.
- **Severity:** low

### T-4 · 0° user dashboard onboarding
- **Where:** `/dashboard/network` empty state
- **Missing:** CHECK that empty state has clear CTAs: invite someone, vouch for someone, browse. If only shows "You haven't vouched for anyone yet" with no action, dead-end.
- **Severity:** high — new-user moment

### T-5 · Visibility mode "hidden"
- **Where:** [src/lib/trust/check-access.ts:59](src/lib/trust/check-access.ts#L59) returns NO_ACCESS
- **Missing:** How does a host turn a listing off? If they hit "hidden", does `/hosting` show the listing as paused? Is there a clear "Reactivate" path?
- **Severity:** low (backend-correct; verify UI feedback)

---

## Missing confirmations

### C-1 · Vouch save — toast or just modal close?
- **Where:** [src/components/trust/vouch-modal.tsx](src/components/trust/vouch-modal.tsx) `onVouchSaved` callback
- **Missing:** Does the user see a toast confirming "You vouched for {name}" after save? Easy to lose signal on mobile.
- **Severity:** med

### C-2 · Invite send confirmation
- **Where:** [src/app/(app)/invite/page.tsx](src/app/(app)/invite/page.tsx) — copy says "Invitation sent!"
- **Missing:** Does the screen persist until user clicks "Invite another person"? Or auto-redirect? CHECK.
- **Severity:** low

### C-3 · Intro request confirmation in inbox
- **Where:** `/api/trust/request-intro/route.ts`
- **Missing:** After request sent, does a thread appear in `/inbox`? Is the connector notified by email/SMS? Feedback loop for the requester?
- **Severity:** high — core trust flow visibility

### C-4 · Phone verification success on `/settings/phone`
- **Where:** [src/app/(app)/settings/phone/page.tsx](src/app/(app)/settings/phone/page.tsx) — "Phone number updated" message
- **Missing:** Verify UI actually surfaces this to the user — not just a silent nav back.
- **Severity:** low

---

## Silent failures

### S-1 · Clerk env not set
- **Where:** [src/middleware.ts:48](src/middleware.ts#L48) falls through `NextResponse.next()`
- **Missing:** If env vars are missing in a prod deploy, every route becomes public silently. Worth a server-side red-banner or telemetry event.
- **Severity:** med (defense in depth)

### S-2 · Trust score computation failure
- **Where:** [src/lib/trust-data.ts](src/lib/trust-data.ts)
- **Missing:** If Supabase RPC errors, what does TrustTag render? Empty? A wrong degree label? Needs graceful error state.
- **Severity:** med

### S-3 · Photo upload failures
- **Where:** [src/app/api/photos/upload/route.ts](src/app/api/photos/upload/route.ts)
- **Missing:** User-facing error feedback in the photo uploader component during hosting/create or edit.
- **Severity:** med

---

## Mobile-broken candidates (verify at 375px)

### M-1 · `/hosting/create` is a long form (~2500 lines)
- **Where:** [src/app/(app)/hosting/create/page.tsx](src/app/(app)/hosting/create/page.tsx) — file is 2500+ lines
- **Missing:** Forms this dense rarely render well at 375px without explicit mobile treatment. High risk of cramped inputs, overflowing tabs, keyboard jumping.
- **Severity:** high (host onboarding)

### M-2 · `BookingSidebar` — mobile-fixed-bottom handoff
- **Where:** [src/components/listing/booking-sidebar.tsx](src/components/listing/booking-sidebar.tsx)
- **Missing:** Sticky bar at the bottom. Should be inspected for iOS safe-area overlap and overlap with the mobile nav.
- **Severity:** med

### M-3 · `ConnectionPopover` — does it have a mobile sheet variant?
- **Where:** [src/components/trust/connection-breakdown.tsx](src/components/trust/connection-breakdown.tsx)
- **Missing:** Popover on desktop, but on mobile the trust tag is small and tap targets must open a sheet. Verify.
- **Severity:** med

### M-4 · `BrowseLayout` map + grid
- **Where:** [src/components/browse/browse-layout.tsx](src/components/browse/browse-layout.tsx)
- **Missing:** Map view must stack or toggle on mobile. Verify the split-pane doesn't render a postage-stamp map at 375px.
- **Severity:** med

### M-5 · Long listing titles truncate on `/browse` tiles
- **Where:** [src/components/listing-card.tsx](src/components/listing-card.tsx)
- **Missing:** Is there truncation / ellipsis logic for long seed-listing titles on a 165px tile width?
- **Severity:** low

---

## Airbnb-clone orphans to strip

### A-1 · Superhost
- **Where:** 14 mock rows, 5 render sites in /listings/[id]. See copy-inconsistencies.md § 3.
- **Severity:** med (signal confusion)

### A-2 · "Host a Luxe property", "Experiences"
- **Status:** No matches in the grep. ✓ **PASS**.

### A-3 · Price-range-slider on /browse — upper bound
- **Where:** [src/components/browse/price-range-slider.tsx](src/components/browse/price-range-slider.tsx)
- **Missing:** Max price defaults may reflect Airbnb's ceiling, not Trustead's seed-listing pricing reality. Check defaults.
- **Severity:** low

### A-4 · Cancellation policy copy on /listings/[id]
- **Where:** "Free cancellation before 48 hours of check-in. Review the full policy at the time of booking."
- **Missing:** Cancellation policy is an on-platform-booking concept. In Trustead the booking isn't on-platform. This copy is leftover.
- **Severity:** med

### A-5 · "Service fee" on /listings/[id]/reserve
- **Where:** [src/app/(app)/listings/[id]/reserve/page.tsx](src/app/(app)/listings/[id]/reserve/page.tsx) labels
- **Missing:** Trustead is not party to rental agreements and doesn't process payments. Service fee has no meaning.
- **Severity:** med

---

## Top-5 priority gap candidates (my pick from the above)

1. **[O-1] `/listings/[id]/reserve` orphan** — entire route contradicts the off-platform model; primary CTA drift breaks the trust flow. (high)
2. **[I-5] Block / report flow missing** — trust platform without safety controls is a liability. (high)
3. **[I-1] Host-side post-stay vouch prompt** — asymmetric flow breaks the vouch-power derivation math. (high)
4. **[C-3] Intro-request confirmation loop** — core trust flow has no visible feedback for the requester. (high)
5. **[T-4] 0° new-user dashboard onboarding** — empty `/dashboard/network` for new signups is the moment where users either grow their network or bounce. (high)

Phase B should validate these with persona journey maps before acting.
