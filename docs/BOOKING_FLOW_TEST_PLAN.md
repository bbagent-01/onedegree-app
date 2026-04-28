# Booking-flow end-to-end test plan

Ordered walkthrough of every stage in the booking lifecycle on
alpha-c. Stage 1–6 are executed live via the UI; stages 7–11 need
past or in-progress dates, so they're seeded on demand with
`scripts/seed-stage.ts`.

**Environment**

- Live site: https://alpha-c.onedegreebnb.com
- Impersonation: the grey identity bar at the bottom-right of every
  page. Type a host's first name to switch perspective.
- Guest identity throughout: your real account (`loren polster`,
  lorenpolster@gmail.com). **Don't impersonate yourself** — stay
  real to exercise the real Clerk/edge path.

**State going in**

All contact_requests, message_threads, messages, payment_events,
and stay_confirmations were wiped before this plan was written.
Vouches are preserved (98 rows). User rating aggregates reset.

Re-running the wipe at any time:

```
cd ~/Claude/Projects/onedegree-app-track-b
npx tsx --env-file=.env.local scripts/wipe-bookings.ts
```

---

## Stage 1 — Guest sends a reservation request

**Who:** you (guest), real account.

1. Go to https://alpha-c.onedegreebnb.com/browse
2. Pick any listing whose host is NOT `loren polster`. Good first
   test: one of Hana Yoon's or Maya Chen's. Click it.
3. On the listing page, pick dates ~10 days from today (leaves room
   to test the 5-days-before-check-in payment trigger).
4. Click **Request to stay**. Type a short intro. Submit.

**Expected:**
- Toast: "Message sent to host"
- You land in `/inbox` (or sidebar opens) with a new thread.
- Thread shows a plain-text system message card ("loren requested
  to reserve from X to Y · N guests") + your typed intro as your
  own bubble.
- Reservation sidebar on the right shows status **Pending**, the
  trip timeline with **Awaiting host** as the current stage.

---

## Stage 2 — Host reviews & sends terms

**Who:** the host you booked. Switch via the impersonation bar.

1. In the impersonation bar (bottom right), type the host's first
   name (e.g. "Hana") → select → you now see the site as them.
2. Navigate to `/inbox`. The pending request should be at the top.
3. Click the thread. On the right sidebar you'll see amber
   "Reservation request pending · review & send terms below".
4. Scroll to the bottom of the thread — the **Review & send terms**
   inline editor is there. Try editing at least one thing:
   - dates (push them by a day or two)
   - total (change it by $50 — forces "Host updated" pill on guest side)
   - cancellation preset (try switching Moderate → Strict to force
     "Host updated" on the policy section)
5. Click **Approve & send terms**.

**Expected:**
- Toast: "Terms sent to Loren"
- The Review & send editor unmounts.
- A `terms_offered` card renders inline in the thread showing the
  full snapshot: dates, guests, total breakdown, policy, host
  payment methods, with red "Host updated" pills on any section you
  changed.
- Reservation sidebar status flips to **Confirmed**, timeline
  advances to **Terms accepted** as the current stage.

---

## Stage 3 — Guest accepts terms

**Who:** you (guest). Open the impersonation bar and click **Stop
impersonating**.

1. Go to `/inbox` — the thread should be at the top with the updated
   preview.
2. Open the thread. The `terms_offered` card should still be there,
   now from your perspective: "Hana approved your stay" + the red
   Host updated pills you triggered.
3. Tap the collapsed **"Pay in installments — each nonrefundable"**
   row to inspect the full policy body. Close it.
4. Scroll to the bottom of the card and click
   **Accept terms & confirm reservation**.

**Expected:**
- Toast: "Terms accepted — reservation confirmed"
- The card's middle content auto-collapses; the green
  **Reservation confirmed** footer is now the bottom of the card,
  acceptance date visible.
- Two `payment_due` cards appear in the thread directly below —
  **Payment 1 of 2** (due 5 days before check-in) + **Payment 2 of
  2** (due at check-in).
- The upcoming one (check-in payment) shows a grey "Coming up"
  pill and a collapsed **Pay early** button.
- The imminent one (5-days-before) is expanded by default with
  payment method links + Mark as paid.

---

## Stage 4 — Guest marks first payment as paid

**Who:** you (guest).

1. On the first `payment_due` card (the one due 5 days before
   check-in), click **Mark as paid — $X**.

**Expected:**
- Toast: "Marked $X as paid"
- Card swaps to a blue `payment_claimed` card: "loren sent $X via
  Venmo" + "Marked paid on [today]" + your own row says
  "Hana will confirm once it lands."
- There's an **Unmark as paid** button next to that note — click
  it once to confirm it reverts back to the due card, then
  click Mark as paid again to move forward.

---

## Stage 5 — Host confirms receipt

**Who:** Hana (impersonation bar).

1. Switch to Hana. Open the same thread.
2. The thread's `payment_claimed` card for Payment 1 now shows a
   **Confirm received** button on her side.
3. Click **Confirm received**.

**Expected:**
- Toast: "Payment confirmed"
- Card swaps to a `payment_confirmed` receipt: top row shows the
  ordinal / amount / method / date, bottom shows a big blue
  **Payment completed** check block.
- Payment 2 of 2 is still in its coming-up state further down.

---

## Stage 6 — Pay the second installment

Same as Stages 4–5 on the second payment. Goal: both payments end
up in the blue **Payment completed** state in the thread.

**Check the timeline** (sidebar): two per-payment stages should
show "Payment 1 of 2 — $X" and "Payment 2 of 2 — $X", both
**done**. Next stage: **Upcoming**.

---

## Stage 7 — In-stay (time-gated → seed it)

The live reservation you built in Stages 1–6 has check-in a few
days out, so you can't hit in-stay via the UI today. Seed a
separate in-stay reservation:

```
cd ~/Claude/Projects/onedegree-app-track-b
npx tsx --env-file=.env.local scripts/seed-stage.ts in-stay
```

The command prints the inbox URL — open it. This lives on a
different host (Maya Chen by default) so it doesn't collide with
your live thread.

**Expected:**
- Thread shows terms cards (collapsed) + confirmed payments +
  a full-width **"Heads up — check-in is tomorrow"** system
  message card.
- Timeline (sidebar + `/trips/[id]`) shows **During stay** as the
  current stage.

---

## Stage 8 — Checked out (seed)

```
npx tsx --env-file=.env.local scripts/seed-stage.ts checked-out
```

Separate host (Rosa Delgado). Thread shows the whole payment
history + a **ReviewPromptCard** at the bottom: "Stay ended — How
was your stay with Rosa?" with a prominent **Leave a review**
button.

---

## Stage 9 — Guest leaves review (+ vouches)

**Who:** you (guest). Continue from the checked-out thread you
just seeded.

1. Click **Leave a review** on the ReviewPromptCard.
2. The dialog opens inline. Rate Rosa as a host (stars) + rate
   the place (stars) + optional text. Click **Submit review**.
3. Toast: "Review saved". The dialog swaps to the vouch step:
   "Want to vouch for Rosa too?" with a type picker (Standard /
   Inner Circle) and years-known buckets.
4. Pick "Standard · 1–3 years" → click **Vouch**.
5. Toast: "Vouched for Rosa" → "Done" → dialog closes.

**Expected:**
- ReviewPromptCard auto-collapses: title row visible + emerald
  **Review submitted** chip at the bottom. Tap the header to
  expand the body.
- Reservation sidebar: the "Leave a review" button is gone.
- Open the **View full trip details** link at the bottom of the
  sidebar. The trip page shows the listing header on top, then a
  **Trip timeline** block collapsed to "Reviewed" as the current
  stage. Tap **Show all** to see every stage.

### Shortcut: sidebar button

If you want to test the sidebar path, seed a fresh checked-out
stay without stepping through Stage 9 first. The sidebar's
**Leave a review** button (visible only when `stay_reviewed_by_me`
is false) opens the same ReviewFlowDialog inline. No navigation.

---

## Stage 10 — Host leaves review (+ vouches)

**Who:** Rosa Delgado (impersonate).

1. Switch to Rosa. Open her inbox.
2. The same thread is at the top. Open it.
3. Rosa sees her ReviewPromptCard: "How was Loren as a guest?"
4. Click **Leave a review** → rate guest → optional text →
   submit. Vouch step shows "Want to vouch for Loren?" (skip or
   vouch, your call).

**Alternative path:** host reviews from the Hosting dashboard
(`/hosting`). Find the stay in the completed tab → **Review guest**
button opens the same ReviewFlowDialog (host role).

---

## Stage 11 — Fully reviewed

With Stage 9 + 10 done, the timeline (both in the inbox sidebar
and on `/trips/[id]`) shows **Reviewed** as the final stage.
Everything past that is complete.

---

## Extra seeded states

Useful if you want to jump straight to a specific UX without
walking through every prior step:

```
# already reviewed by guest, host hasn't yet
npx tsx --env-file=.env.local scripts/seed-stage.ts reviewed-by-guest

# already reviewed by host, guest hasn't yet
npx tsx --env-file=.env.local scripts/seed-stage.ts reviewed-by-host

# both sides already reviewed — terminal state
npx tsx --env-file=.env.local scripts/seed-stage.ts fully-reviewed
```

Each lives on its own host thread so they don't collide.

---

## What to flag

As you walk through, note:
- Any stage where the sidebar + thread UI don't agree on state.
- Any card that doesn't auto-collapse when it should (terms
  after acceptance, confirmed payments don't need to collapse —
  they're already summary-sized, but the ReviewPromptCard should).
- Any time a button navigates to `/trips/[id]` when it should
  open a dialog inline.
- Any stage where the timeline's "current stage" label doesn't
  match what's happening in the thread.

Use the impersonation bar's "Real: loren polster" chip at the
bottom-right of every page to confirm which identity you're
currently acting as.
