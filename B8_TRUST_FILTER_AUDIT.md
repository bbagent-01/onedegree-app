# B8 — Trust filter audit

Every read of the `vouches` table that feeds real-user-to-real-user
trust math now filters `is_demo_origin = false`. Writes and the
single intentional self-view read query (which selects the demo
subset) are also called out below for completeness.

Migration: [supabase/migrations/054_b8_demo_origin_vouches.sql](supabase/migrations/054_b8_demo_origin_vouches.sql)
Webhook: [src/app/api/webhooks/clerk/route.ts](src/app/api/webhooks/clerk/route.ts) (`autoVouchFromDemoPresidents`)

---

## DB-side filters (migration 054)

These RPCs and triggers were rewritten so the SQL execution path
matches the JS execution path on every read site that has a
fallback.

| Function | File | What changed |
|----------|------|--------------|
| `trg_isolation_vouches` | 054 | Bypass test↔real isolation when `NEW.is_demo_origin = true` (only legitimate demo→real write path) |
| `compute_vouch_score_and_counts` | 054 | Skip `vouch_count_given` / `vouch_count_received` increments for demo-origin rows |
| `decrement_vouch_counts_on_delete` (NEW) | 054 | Mirror the increment skip on DELETE so post-alpha `DELETE WHERE is_demo_origin=true` requires no count backfill |
| `calculate_one_degree_scores` | 054 (was 001) | Added `v_vc.is_demo_origin = false AND v_ct.is_demo_origin = false` |
| `get_trust_data_for_viewer` | 054 (was 014b) | Same dual filter |
| `get_user_network` | 054 (was 014b) | Both UNION halves filter `v.is_demo_origin = false` |
| `get_degrees_of_separation_batch` | 054 (was 015) | Both legs of the recursive UNION filter |
| `recalculate_vouch_power_for_user` | 054 (was 014b) | Filter outgoing demo-origin |
| `calculate_vouch_power` | 054 (was 001) | Filter outgoing demo-origin |
| `recalculate_vouch_power` (trigger) | 054 (was 014b) | Both inner SELECT and outer JOIN filter |

## App-side filters

Every TypeScript read of `vouches` outside the intentional self-view
list is filtered. The list below is exhaustive — re-running
`grep -rn "from(\"vouches\")\|from('vouches')" src/` should match
the table line-for-line.

### `src/lib/trust-data.ts` (13 reads — all filtered)

| Line | Function | Purpose |
|------|----------|---------|
| 163 | `computeTrustPaths` | Direct viewer→target vouches |
| 234 | `computeTrustPaths` | Viewer's outgoing edges (connector candidates) |
| 254 | `computeTrustPaths` | Connector→target edges |
| 559 | `computeIncomingTrustPaths` | Direct source→viewer vouches |
| 600 | `computeIncomingTrustPaths` | Each source's outgoing edges |
| 629 | `computeIncomingTrustPaths` | Connector→viewer edges |
| 908 | `findNDegreeReach` | BFS hop expansion |
| 931 | `findNDegreeReach` | BFS final hop |
| 1013 | `applyMultiHopChains` | Edge strengths within a chain |
| 1060 | `applyMultiHopChains` | Whole graph for bridge enumeration |
| 1252 | `computeIndirectFallback` | RPC-missing JS fallback (viewer's edges) |
| 1276 | `computeIndirectFallback` | RPC-missing JS fallback (connector→target) |
| 1473 | `findAllChains` | Whole graph for simple-path enumeration |

### `src/lib/trust/compute-score.ts` (4 reads — all filtered)

| Line | Function | Purpose |
|------|----------|---------|
| 141 | `incomingFallbackQuery` | Source's outgoing |
| 163 | `incomingFallbackQuery` | Connectors→viewer |
| 278 | `fallbackQuery` | Viewer's outgoing (RPC-missing fallback) |
| 297 | `fallbackQuery` | Connectors→targets (RPC-missing fallback) |

### `src/lib/trust/vouch-power.ts` (1 read — filtered)

| Line | Function | Purpose |
|------|----------|---------|
| 26 | `computeVouchPower` | Outgoing vouches — input to vouch_power formula |

### `src/lib/trust/v2-compute.ts` (3 reads — all filtered)

| Line | Function | Purpose |
|------|----------|---------|
| 78 | `computeVouchSignalForUser` | Inbound vouches |
| 118 | `computeVouchPowerForUser` | Outgoing vouches |
| 165 | `recomputeAllTrustV2` | Whole graph for fixed-point iteration |

### `src/lib/trust/degrees.ts` (1 read — filtered)

| Line | Function | Purpose |
|------|----------|---------|
| 114 | `fallbackBFS` | RPC-missing JS BFS over the whole graph |

### `src/lib/network-data.ts` (3 reads — all filtered)

| Line | Function | Purpose |
|------|----------|---------|
| 137 | `getNetworkData` | Open-link tagging on outgoing real vouches |
| 246 | `getVouchBackCandidates` | Incoming vouches for vouch-back nudges |
| 265 | `getVouchBackCandidates` | Outgoing reciprocity check |

### `src/lib/listing-data.ts` (4 reads — all filtered)

| Line | Function | Purpose |
|------|----------|---------|
| 110 | `listListingsForViewer` | Viewer's vouch count for listing-access gates |
| 133 | `listListingsForViewer` | Inner-circle vouches from hosts (full-access unlock) |
| 251 | `getListingForViewer` | Viewer's vouch count (single listing) |
| 264 | `getListingForViewer` | Inner-circle from this host |

### `src/lib/messaging-data.ts` (1 read — filtered)

| Line | Function | Purpose |
|------|----------|---------|
| 520 | thread loader | Has the viewer already vouched the other party? |

### API routes (filtered)

| File | Line | Purpose |
|------|------|---------|
| `src/app/api/vouches/route.ts` | 38 | GET existing vouch — populates the vouch dialog |
| `src/app/api/vouches/route.ts` | 104 | priorOutgoing check before create-or-update |
| `src/app/api/vouches/route.ts` | 137 | Reciprocal close-the-loop check |
| `src/app/api/vouches/route.ts` | 206 | DELETE — scoped so a UI delete cannot remove an auto-vouch |
| `src/app/api/vouches/route.ts` | 221 | Recount given (mirrors trigger's real-only counter) |
| `src/app/api/vouches/route.ts` | 227 | Recount received (mirrors trigger's real-only counter) |
| `src/app/api/trust/connection/route.ts` | 68 | Direct vouch query for the trust popover |
| `src/app/api/users/search/route.ts` | 70 | "already_vouched" badge in user search results |
| `src/app/api/vouch-back/dismiss/route.ts` | 46 | Sanity-check the dismissed vouch is real |
| `src/app/join/[token]/complete/page.tsx` | 369 | Pre-check whether a real invite was already claimed |

### Writes (no filter needed)

These create `vouches` rows. Real flows leave `is_demo_origin` at
its default of `false`; the B8 webhook routine explicitly sets
`true`. Listing for completeness only.

| File | Line | Writes |
|------|------|--------|
| `src/app/api/webhooks/clerk/route.ts` | 237 | `claimPendingInvites` upsert (real) |
| `src/app/api/webhooks/clerk/route.ts` | 365 | **B8 `autoVouchFromDemoPresidents` upsert (`is_demo_origin: true`)** |
| `src/app/api/webhooks/clerk/route.ts` | 410 | `claimPendingVouches` upsert (real) |
| `src/app/api/vouches/route.ts` | 112 | POST upsert (real, user-initiated) |
| `src/app/join/[token]/complete/page.tsx` | 121, 424 | Pending-vouch claim upserts (real) |

### Intentional self-view read (filters TO the demo subset)

| File | Line | Purpose |
|------|------|---------|
| `src/app/(app)/profile/[id]/page.tsx` | `DemoConnectionsSelfView` | The ONE place that selects `is_demo_origin = true` — renders the "Welcome connections" card on the profile owner's own page |

## Cleanup

Single statement to wipe every B8 row when alpha ends:

```sql
DELETE FROM vouches WHERE is_demo_origin = true;
```

The counter-trigger pair installed in migration 054 skips
demo-origin rows on both INSERT and DELETE, so `users.vouch_count_*`
need no backfill afterward.
