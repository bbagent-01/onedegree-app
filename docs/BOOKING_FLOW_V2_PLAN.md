# Booking Flow v2 — plan

Captured 2026-04-20 from the CC-Dev1 Scenario 1 walkthrough. Scope
is everything a guest + host touch from inquiry through post-stay,
*except* reviews (that flow already exists and shipped with CC-C5).

Goal: make the booking flow feel like a first-class platform
experience on a trust-based facilitator — not a thin Airbnb clone
with fewer features. Platform does not process payments; it
structures them.

---

## Chunk 0 — quick wins (shipped with this plan)

- [x] Rename "Contact Host" → "Request to stay" site-wide
      (booking sidebar, sticky anchor bar, reserve page header, FAQ).

## Chunk 1 — Inbox layout overhaul

Match the 3-pane pattern from Airbnb's screenshot:

- **Left (list):** existing thread list with filter tabs at the top
  - Tabs: **All · Hosting · Traveling · Support** (counts in each)
  - Tabs derive from `message_threads.host_id = me` vs `guest_id = me`;
    Support is a future mailbox.
  - "Unread" pill filter stays.
- **Middle (thread):** existing message pane.
- **Right (reservation sidebar):** new. Shows the contact_request +
  stay details tied to this thread. See Chunk 2.

Affected files:
- `src/app/(app)/inbox/page.tsx`, `[threadId]/page.tsx`
- `src/components/inbox/*` (new tab component + sidebar)
- `src/lib/messaging-data.ts` (add counts per tab)

## Chunk 2 — Reservation sidebar / trip timeline

Replaces the reservation summary block with a **vertical timeline**
— the trip moves from one stage to the next over time, and each
stage surfaces the action that's relevant right now.

Stages (pseudo-state machine, derived from `contact_requests.status`
+ dates + payment events):

1. **Inquiry sent** (status = pending, host hasn't responded)
2. **Approved** (status = accepted, no agreed_price yet)
3. **Terms + price** (agreed_price set, payment_schedule chosen)
4. **Payment** (one or more scheduled payments — see Chunk 3)
5. **Upcoming** (all payments fulfilled or host marked "I'll handle")
6. **Checked in** (today between check_in and check_out)
7. **Checked out** (past check_out, pre-review)
8. **Reviewed** (stay_confirmation.guest_rating + host_rating both set)

Each stage row shows: icon, label, timestamp, and — when active —
an inline action (accept, set price, add payment method, etc.).

Affected:
- `src/components/booking/TripTimeline.tsx` (new)
- `src/lib/booking-stage.ts` (new — pure stage resolver)
- Mounts in the new inbox sidebar AND on `/trips/[bookingId]` and
  host reservation detail.

## Chunk 3 — Payment preferences + schedule

### Schema (migration 023)

```
users table — host-level defaults:
  payment_methods       JSONB DEFAULT '[]'
    -- [{type:'venmo', handle:'@lorenp', enabled:true}, …]
    -- allowed types: venmo, zelle, paypal, wise, self_managed
  payment_schedule      JSONB DEFAULT NULL
    -- [{days_before_checkin:30, pct:50}, {days_before_checkin:0, pct:50}]
    -- null means "handle myself — no structured schedule"

listings table — per-listing overrides (null = inherit host default):
  payment_methods_override   JSONB DEFAULT NULL
  payment_schedule_override  JSONB DEFAULT NULL

contact_requests table — per-reservation locked-in terms:
  agreed_price               INTEGER           (total, not nightly)
  payment_methods            JSONB DEFAULT NULL (snapshot at accept)
  payment_schedule           JSONB DEFAULT NULL (snapshot at accept)
  currency                   TEXT DEFAULT 'USD'

new table — payment events (recorded, not processed):
  payments
    id UUID pk
    contact_request_id UUID fk
    amount_cents INTEGER
    due_date DATE
    status TEXT CHECK (status IN
      ('scheduled','sent_by_guest','confirmed_by_host','waived','refunded'))
    method TEXT             -- venmo | zelle | paypal | wise | self_managed
    confirmed_at TIMESTAMPTZ
    note TEXT
```

### UX surfaces

- **Settings → Payments** (host-level preferences page)
  - Section 1: payment methods list with type + handle inputs.
    Receive-only — no bank routing numbers.
  - Section 2: default schedule builder. Empty state = "I'll handle
    myself — no structured schedule".
  - Section 3: default cancellation policy (see Chunk 4).
- **Hosting → Listing edit → "Payment & cancellation"** tab
  - Toggle: "Use my host defaults" vs "Override for this listing".
  - Same form as Settings → Payments when overridden.
- **Reservation detail (both sides)**
  - After approval, host sets `agreed_price`. Schedule + methods
    snapshot from listing override → host default.
  - Either party can edit the snapshot up until first payment
    fires; after that only the host can edit with guest's consent.
  - Guest sees the schedule + "Mark as sent" action per payment.
  - Host sees the schedule + "Confirm received" action per payment.
- **"I'll handle myself" path** — skips the structured schedule,
  flattens the timeline to: inquiry → approved → upcoming → stay.
  A single "Arranged directly between us" note replaces payment
  rows.

### API routes (all `effectiveAuth` + edge)

- `GET/PUT /api/users/payments` — host's default prefs
- `GET/PUT /api/listings/[id]/payments` — per-listing override
- `POST /api/contact-requests/[id]/terms` — set agreed price + snapshot schedule
- `POST /api/payments/[id]/mark-sent` — guest confirmation
- `POST /api/payments/[id]/mark-received` — host confirmation

## Chunk 4 — Cancellation policy

Same 3-level model as payments: host default → listing override →
reservation snapshot at accept.

### Presets (borrow Airbnb's taxonomy, adapt to off-platform payment)

| Name | Refund window | Refund schedule |
|---|---|---|
| Flexible | up to 24h pre-checkin | 100% before, 50% day-of |
| Moderate | up to 5d pre-checkin | 100% before, then 50% up to 24h |
| Strict | up to 14d pre-checkin | 100% before, 50% up to 7d, 0 after |
| Custom | inviter-defined | arbitrary rules |

Stored as:
```
cancellation_policy JSONB = {
  preset: 'moderate' | 'strict' | 'flexible' | 'custom',
  windows: [{ cutoff_days_before_checkin, refund_pct }],
  custom_note: TEXT
}
```

### UX

- Same Settings / Listing-edit / Reservation-snapshot layering.
- On request approval, guest sees the cancellation policy as a
  required checkbox ("I've read and accept these terms") before
  terms are locked.
- Cancel flow honors the policy — computes refund % from today's
  distance to check-in and shows it on the cancel dialog.

## Chunk 5 — Issue reporting + photo requests (Task 8 from earlier)

Deferred to its own doc after Chunks 1–4 ship; relates to in-stay
UX more than booking terms.

---

## Suggested sequencing

**If the goal is "test the whole flow end-to-end ASAP":**

1. Chunk 1 (inbox 3-pane) — quick, visible, unblocks sharing
   screenshots that feel right.
2. Chunk 2 (trip timeline on the sidebar) — takes the visible
   inbox win and makes it functional.
3. Chunk 4 (cancellation) — simpler schema than payments, easy
   early ship.
4. Chunk 3 (payments) — biggest schema + UX surface, do last so
   Chunks 1/2 are stable to build on.
5. Chunk 5 (issues + photos) — when payments is stable.

**If the goal is "make the platform feel real to outside testers":**

Payments (Chunk 3) has the biggest credibility lift — swap 3 and 1.

## What I need from Loren before building

1. **Sequence confirmation** — do Chunks 1 → 2 → 4 → 3 → 5 work,
   or flip any?
2. **Payment method list** — final set (Venmo, Zelle, PayPal, Wise).
   Add Cash App? Revolut? Anything else?
3. **Default cancellation preset** — which of the 3 is the
   platform default for new hosts?
4. **Currency** — USD-only for alpha, or do we need currency
   per-listing now?
5. **Timeline vs separate pages** — OK to put the full trip
   timeline in the inbox sidebar AND on trip/reservation detail
   pages? Or is one of those surfaces sufficient?
