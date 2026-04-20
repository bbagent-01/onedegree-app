# Copy Inconsistencies Report

Phase A audit snapshot. Terms scanned across `src/`. Each row is a hit that indicates drift or ambiguity the UX Phase B should reconcile.

---

## 1. Trust-score terminology drift

Three interchangeable names for the same concept, used inconsistently in user-facing copy:

| Term | Where | Context |
|---|---|---|
| **Trust Score** | [src/components/trust/trust-gate.tsx:65](src/components/trust/trust-gate.tsx#L65) | `Requires Trust Score of {requiredScore}` |
| **Trust score** | [src/components/listing/gated-listing-view.tsx:387](src/components/listing/gated-listing-view.tsx#L387) | `Trust score of ${required} required` (toast title) |
| **Trust Score** | [src/components/trust/connection-breakdown.tsx:305](src/components/trust/connection-breakdown.tsx#L305) | `Trust Score:` (label) |
| **Trust score** | [src/components/trust/connection-breakdown.tsx:647](src/components/trust/connection-breakdown.tsx#L647) | `Trust score:` (label) — same component, different casing |
| **vouch score** | [src/components/trust/connection-breakdown.tsx:269](src/components/trust/connection-breakdown.tsx#L269) | `vouch score = {vouch.vouch_score} pts` |
| **vouch score** | [src/components/trust/connection-breakdown.tsx:279](src/components/trust/connection-breakdown.tsx#L279) | `vouch score = {data.reverseVouch.vouch_score} pts` |
| **vouch score** | [src/components/trust/connection-breakdown.tsx:347](src/components/trust/connection-breakdown.tsx#L347) | `vouch score = {p.link_a.toFixed(1)} pts` |
| **Vouch score** | [src/app/(app)/invite/page.tsx:363](src/app/(app)/invite/page.tsx#L363) | `Vouch score` — label on invite review step |
| **1° score** | [src/app/(app)/profile/[id]/page.tsx:258](src/app/(app)/profile/[id]/page.tsx#L258) | `...raises your 1° score with everyone...` |
| **Your Trust Score** | [src/app/(app)/profile/[id]/page.tsx:247](src/app/(app)/profile/[id]/page.tsx#L247) | Section heading |
| **Trust Score** | [src/app/(app)/profile/[id]/page.tsx:339](src/app/(app)/profile/[id]/page.tsx#L339) | Label |
| **trust score** | [src/app/(app)/browse/page.tsx:252](src/app/(app)/browse/page.tsx#L252) | Comment (not user-facing) |
| **trust score** | [src/app/(app)/hosting/create/page.tsx:2442](src/app/(app)/hosting/create/page.tsx#L2442) | Visibility option description (user-facing) |
| **trust score** | [src/app/(app)/hosting/create/page.tsx:2452](src/app/(app)/hosting/create/page.tsx#L2452) | Visibility option description (user-facing) |
| **1° Vouch Score** | [src/lib/trust/compute-score-batch.ts:2](src/lib/trust/compute-score-batch.ts#L2) | Comment only |
| **1° vouch score** | [src/lib/trust/compute-score.ts:17](src/lib/trust/compute-score.ts#L17) | Comment only |
| **trust score** | [src/components/browse/live-listing-card.tsx:160](src/components/browse/live-listing-card.tsx#L160) | `Your trust score with this host is below the required threshold.` |

**Recommendation for Phase B:** Pick ONE user-facing label. The implementation comments use "1° vouch score" (the math); the UI is oscillating between "Trust Score" and "trust score". Worst offender: [connection-breakdown.tsx](src/components/trust/connection-breakdown.tsx) mixes "vouch score", "Trust Score", and "Trust score" in one component.

---

## 2. Booking terminology — off-platform model drift

The product is off-platform messaging only (no on-platform payment/reservation). "Reserve" / "Request to Book" copy should have been swept to "Contact Host" during CC-C5, but residues remain:

| Term | Where | Issue |
|---|---|---|
| **Reserve** | [src/components/listing/booking-sidebar.tsx:89](src/components/listing/booking-sidebar.tsx#L89) | `canReserve` variable — and the CTA copy it gates |
| **Reserve** | [src/components/listing/sticky-anchor-bar.tsx:22-130](src/components/listing/sticky-anchor-bar.tsx#L22) | "Reserve" button mentioned 7× in logic/comments — the rendered CTA is likely "Reserve" too |
| **Reserve** button | (inferred in BookingSidebar) | The booking sidebar's primary CTA is likely still "Reserve" on `/listings/[id]` at full-access |
| **Request to Book** | [src/app/(app)/hosting/create/page.tsx:2175](src/app/(app)/hosting/create/page.tsx#L2175) | Copy block in hosting create |
| **"Confirm and reserve"** | [src/app/(app)/listings/[id]/reserve/page.tsx:169](src/app/(app)/listings/[id]/reserve/page.tsx#L169) | Final CTA on /reserve page |
| **request to book** | [src/lib/trust/types.ts:248](src/lib/trust/types.ts#L248) | Type comment (not user-facing) but signals flow isn't renamed |
| **requests to book** | [src/components/settings/notifications-form.tsx:21](src/components/settings/notifications-form.tsx#L21) | `When a guest requests to book your listing.` — user-facing email preference copy |
| **Booking request/confirmed/declined** | [src/components/settings/notifications-form.tsx](src/components/settings/notifications-form.tsx) | Notification category names still speak of bookings |
| **"Contact host"** (correct) | [src/app/(app)/listings/[id]/reserve/page.tsx:94](src/app/(app)/listings/[id]/reserve/page.tsx#L94) | Page title has been updated |
| **"Contact Host"** (correct) | /listings/[id] GatedListingCTA | CTA in gated view |

**Recommendation for Phase B:** Full sweep. The `/listings/[id]/reserve` route itself is likely dead — off-platform messaging should happen via `/inbox`. If retained, every "Reserve" / "Request to Book" string must become "Contact Host". Component names `ReserveForm`, `BookingSidebar`, `canReserve`, `showReserve` also drift.

---

## 3. Airbnb-clone orphans

### Superhost — should be zero in 1DB (trust is the equivalent signal, not badges):

| File | Line | Context |
|---|---|---|
| [src/app/(app)/listings/[id]/page.tsx:122](src/app/(app)/listings/[id]/page.tsx#L122) | `const isSuperhost = …` (likely a mock-data derived flag) |
| [src/app/(app)/listings/[id]/page.tsx:155-158](src/app/(app)/listings/[id]/page.tsx#L155) | `<span className="font-semibold">Superhost</span>` |
| [src/app/(app)/listings/[id]/page.tsx:218](src/app/(app)/listings/[id]/page.tsx#L218) | Conditional Superhost render |
| [src/app/(app)/listings/[id]/page.tsx:250](src/app/(app)/listings/[id]/page.tsx#L250) | `" · Superhost"` |
| [src/app/(app)/listings/[id]/page.tsx:437-440](src/app/(app)/listings/[id]/page.tsx#L437) | Another Superhost render |
| [src/lib/mock-listings.ts](src/lib/mock-listings.ts) | 14 mock rows still set `isSuperhost: true/false` |
| [src/lib/browse-utils.ts:99](src/lib/browse-utils.ts#L99) | `isSuperhost: false` fallback |

**Recommendation:** Strip Superhost. Its role is replaced by the trust score + direct-vouch badge. If a "long-time host" signal is desired, introduce a separate 1DB-native badge (e.g. "Host rating 4.8" already present).

### Experiences — should be zero in 1DB:
Grep found NO matches for "Experiences" in user-facing src. **PASS.** ✓

---

## 4. Trust direction drift

The trust score is directional (viewer→host vs host→viewer). Copy should consistently pick one direction and stick with it. Currently mixed:

| Direction | Where | Context |
|---|---|---|
| "Your trust score with this host" (viewer→host) | [src/components/browse/live-listing-card.tsx:160](src/components/browse/live-listing-card.tsx#L160) | Correct for gate check |
| "the displayed 'Trust Score' is the host's trust of the viewer" (host→viewer) | [src/lib/trust-data.ts:524](src/lib/trust-data.ts#L524) | Code comment — contradicts the browse copy direction |
| "Your Trust Score" (viewer's own, global) | [src/app/(app)/profile/[id]/page.tsx:247](src/app/(app)/profile/[id]/page.tsx#L247) | On viewing another's profile, "Your Trust Score" heading is ambiguous — is it the viewer's score to them, or their score to the viewer? |
| "Your connection to {first}" (direction-neutral) | /profile/[id] heading | OK |
| "Host's trust to guest" | /listings/[id] trust tag | Direction documented in source code comments |
| "Guest's trust score to this host" | [src/lib/trips-data.ts:32](src/lib/trips-data.ts#L32) | Comment says guest→host for trips context |
| "Host's trust score to this guest" | [src/lib/hosting-data.ts:35](src/lib/hosting-data.ts#L35) | Comment says host→guest for hosting context — correct for context |
| "Viewer's trust score with the other participant" | [src/lib/messaging-data.ts:32](src/lib/messaging-data.ts#L32) | Symmetric phrasing — ambiguous |

**Recommendation for Phase B:** Write a direction-rules doc. Every surface must answer:
- Who is the viewer?
- Whose trust score is being shown?
- Is it the score the viewer has (their vouch strength to the other party) OR the score they inspire (the other party's vouch strength to them)?

Suggested convention: always show **score from viewer's direction toward target** unless on a host-dashboard surface where the host is inspecting a guest (then host→guest makes sense). Profile `/profile/[id]` should label clearly: "Your score to them" vs "Their score to you" — or show one score per direction side-by-side.

---

## 5. Notification-category copy still on-platform-booking model

[src/components/settings/notifications-form.tsx](src/components/settings/notifications-form.tsx):
- "New booking request" (should be "New intro request" or "New message about your listing")
- "When a guest requests to book your listing." (should be "When a guest contacts you about your listing.")
- "Booking confirmed" / "Booking declined" (post-confirmation status — OK to keep if booking = accepted-intro-handoff, but user mental model may not map)

---

## 6. Mixed component CTAs — `/listings/[id]` detail page

A single viewer at full access may see multiple overlapping CTAs:
- "Reserve" (BookingSidebar)
- "Contact Host" (via GatedListingCTA, maybe)
- "Message Host" (inbox link)
- "Request Intro" (when gated)
- "Sign in to view" (signed-out)
- "Save" (favorite heart)

These must be consolidated into a clear hierarchy. Phase B should decide whether the primary CTA at full-access is "Contact Host" or "Message Host" (and then remove Reserve / Request-to-Book entirely).

---

## 7. Summary recommendations for Phase B

1. **One name for trust score.** Pick "Trust Score" (Title Case) as the user-facing label. Use it everywhere. Reserve "vouch score" for power-user / admin surfaces (the underlying math term).
2. **Retire booking verbs.** Replace every "Reserve", "Request to Book", "booking request" with "Contact", "Message", "Intro request". Route `/listings/[id]/reserve` should either be removed or renamed `/listings/[id]/contact`.
3. **Kill Superhost.** 14 mock rows + 5 render sites + derivation logic. Replace with "Direct vouch" badge or remove entirely.
4. **Direction doc.** Before any UI touch, produce a trust-direction convention doc so every screen shows the right score from the right side.
5. **Notifications form rewrite.** Rename categories to match the 1DB mental model.
