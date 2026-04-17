# CC-C4 Handoff → Next Session

Trust UI is mostly finished. A few items didn't close out and belong
in a fresh session so they get proper focus. Context for each is
below; start from the top.

---

## 1. Seed listings are missing photos

**Symptom.** On `/browse` the 10 listings created by
`scripts/seed-host-graph.ts` (Rosa, Kai, Priya Reddy, Omar Chowdhury,
Sophie, Hana, Diego, Zara, Björn, Mei) render blank image tiles.

**What the seed tried to do.** For each listing it upserts one row
into `listing_photos` pointing at `https://picsum.photos/seed/{slug}/800/600`
with `is_cover: true`, `is_preview: true`.

**Likely causes.**

- `picsum.photos` URLs return a 302 to a real image, and the
  `<img>` tag might be blocked by a CSP or the image falls into the
  blurred-preview path because of how the preview filter works.
- The `listing_photos` upsert uses
  `onConflict: "listing_id,storage_path"` — if that unique index
  doesn't exist in Track B the upsert may no-op silently. Verify
  with: `select * from listing_photos where listing_id in (...);`
- Even if one photo lands, the gallery on the listing detail page
  wants ≥3 photos for its 2×2 layout; a single-photo listing looks
  especially empty.

**Plan.**

- Query the live DB to confirm whether seed photos landed.
- Switch to a more deterministic image CDN (e.g. Unsplash Source
  with a curated category — `https://source.unsplash.com/800x600/?apartment,{area}`)
  and insert 3–5 photos per listing with varied `sort_order`.
- Make sure `is_cover: true` is set on exactly one row per listing
  and `is_preview: true` is set on at least one non-cover for the
  preview gallery to fill.

**Files.**
- `scripts/seed-host-graph.ts` — photo block at the bottom of the
  listings loop.
- `src/components/browse/live-listing-card.tsx` — cover resolution.
- `src/lib/browse-data.ts` — photo hydration order.

---

## 2. Gated / preview listings should surface the trust relationship

**Symptom.** When a viewer hits a listing they can only see in preview,
the TrustTag / score / connector avatars are absent or collapsed —
the single most useful moment for a guest to understand *why* the
listing is gated isn't being exploited.

**What's there today.**

- `src/components/listing/gated-listing-view.tsx` renders a medium
  TrustTag at line ~181 behind `{(score > 0 || trust?.hasDirectVouch)}`.
  With the direction flipped to incoming, seeded hosts may return
  `score = 0` if the host hasn't vouched toward the viewer yet —
  which hides the tag entirely.
- The sidebar CTA (`GatedListingCTA`) handles next-step buttons but
  doesn't spell out the degree / connector count.

**Plan.**

- Always render a TrustTag on the gated view, even for
  `score === 0` — the "Not connected" variant. It's a teaching
  moment: the viewer can see exactly how far they are from the
  host and which connectors exist.
- Consider showing connector avatars (with names masked per
  anonymity rule) as a "You're N connections away" row above the
  Request Intro CTA. This is the strongest argument for asking a
  mutual for the intro.
- Decide how / whether to show the host's first name on gated
  views (currently behind `show_host_first_name`). If we're going
  to display trust-via-Maya, we probably need to at least show the
  host's first name so the chain is legible ("Sam's circle").

**Files.**
- `src/components/listing/gated-listing-view.tsx`
- `src/components/listing/gated-listing-cta.tsx`

---

## 3. Multi-hop 2°+ reachability (deferred from this session)

**Why it matters.** The expanded seed adds three "peripheral"
users (Amira, Luka, Jules) who are 2-hop reachable from Loren but
not 1-hop. Under the current engine they show as Not connected
because `compute1DegreeScore{,Incoming}` only walks two edges.

**Plan.**

- Extend the server-side engine with a bounded BFS capped at 3
  hops. It returns degree only — no score. Per spec: 2°+ displays
  the degree label, no number, muted shield.
- Update `TrustResult.degree` to allow `1 | 2 | 3 | null` and
  populate 3 for multi-hop reaches.
- No RPC exists yet; either add one (`calculate_degree_of_separation`)
  or do it in JS since the graph is small.
- Verify the peripheral seed users render as `2°` on the tile after
  the extension lands.

**Files.**
- `src/lib/trust-data.ts` — add multi-hop BFS helper.
- `src/lib/trust/compute-score.ts` — optional incoming BFS variant.
- `src/components/trust/trust-tag.tsx` — already renders a `{degree}°`
  label for `degree >= 2`; confirm 3 works.

---

## 4. Audit surfaces for direction consistency

With the direction flip landed, spot-check:

- **Profile pages (viewing another user's profile).** Should stay
  outgoing (*you vouched for them*) — current state. Verify the
  math popover reads right.
- **Reservations (host dashboard).** Stays outgoing. The host IS
  the viewer and the guest is the target; current direction is
  correct semantically.
- **Host side of inbox threads.** Should be outgoing (host trusting
  guest), while guest side is incoming. Inbox already branches on
  role. Verify both sides of a shared thread display as expected.
- **Trust score filter on browse.** The "Min trust score" filter
  still compares against `trustByListing[...].trust_score` which is
  now the incoming number — make sure the filter slider copy still
  makes sense ("show listings where the host trusts me at ≥ N").

---

## 5. Polish / small bugs noticed

- **Direct vouch chip in the popover now says "Direct"** (fixed in
  this session, commit `TBD`) — but audit that there's no path
  where a StrengthChip tier still leaks for direct cases. Look at
  `PathRow` in `connection-breakdown.tsx` — it renders a tier chip
  per path which is correct; the fix only touched the
  `direct_forward` / `direct_reverse` summary.
- **Preview content toggles now default on** for seeded listings
  (fixed in this session). But previously-seeded listings in the
  live DB may still have missing/partial `preview_content` — the
  seed is idempotent and the re-run updated them. If any
  inconsistency remains, re-run `scripts/seed-host-graph.ts`.

---

## Session baseline for picking up

- Branch: `track-b/1db-overlay`
- Last commit that should be deployed: check `git log --oneline -5`
- Live URL: https://alpha-c.onedegreebnb.com
- Loren's test account login: his production credentials.

## Quick seed re-run commands

```bash
npx tsx --env-file=.env.local scripts/seed-host-graph.ts
npx tsx --env-file=.env.local scripts/seed-avatars.ts --force
```
