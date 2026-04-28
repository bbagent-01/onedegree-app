# Trustead UX Audit — Phase A Snapshot

> Ground-truth snapshot of the `track-b/1db-overlay` build for the pending UX gap analysis. Produced read-only (no application source modified).

**Audit date:** 2026-04-20
**Branch:** `track-b/1db-overlay`
**Commit audited:** `0f28398840eb4aaa127374b444361da87ad86325` (tip of branch at audit time)
**Target URL (live):** https://alpha-c.onedegreebnb.com

---

## What's in this folder

| File | What it is |
|---|---|
| [routes.json](routes.json) | Every Next.js route + API route. Auth, gates, persona-access, entry/exit points, states. |
| [components.json](components.json) | Priority component inventory (39 detailed) + flat list of other components (29). Props, states, used-by routes, known issues. |
| [gate-matrix.json](gate-matrix.json) | Route × trust-level matrix. Every cell answers: "what does a viewer at this trust level see here?" Includes `flags[]` array for undefined/inconsistent cells. |
| [capture.mjs](capture.mjs) | Playwright script (not yet run). Produces deterministic screenshots across 3 trust levels × 2 viewports × 27 routes. Requires Playwright install + Clerk storage-state setup. Written as `.mjs` so it stays outside the Next.js tsconfig's type-check scope. See top-of-file docstring. |
| [copy.json](copy.json) | 342 user-facing strings grouped by route. Titles, CTAs, labels, empty states, error messages, tooltips, system messages. |
| [copy-inconsistencies.md](copy-inconsistencies.md) | Flagged terminology drift: trust-score names, booking verbs, Superhost residue, direction ambiguity. |
| [flags.md](flags.md) | Low-hanging gaps caught during the audit. Dead ends, orphans, missing inverse flows, mobile risks, trust-state coverage holes. |
| [screenshots/](screenshots/) | Output directory for capture.mjs. Empty at Phase A — see "Phase A limitations" below. |

---

## Totals

- **Routes:** 27 user-facing + 44 API routes
- **Components:** 39 priority (with full state/prop/issue annotations) + 29 other (flat inventory) = 68 total
- **User-facing strings:** ~342 extracted across 27 routes
- **Screenshots planned:** 27 routes × 3 trust levels × 2 viewports = 162 targets + signed-out subset
- **Gap flags logged:** 31 (5 high-severity picks in flags.md § Top-5)

---

## Executive summary — most obvious gaps (pulled from flags.md)

1. **`/listings/[id]/reserve` is orphaned by the off-platform model.** The whole reserve page + `ReserveForm` component descend from the Airbnb clone. Copy drift ("Reserve", "Confirm and reserve", "Request to Book") sits directly in the primary trust funnel. High.
2. **No block/report safety flow.** A trust platform without block or report mechanisms is a liability. `/api/incidents` exists but no UI surfaces it. High.
3. **Post-stay vouch is asymmetric.** Guest sees a vouch-for-host banner; no matching host-side prompt to vouch for the guest. This breaks the vouch-power math since hosts rating guests is the input. High.
4. **Intro-request feedback loop unclear.** Sent an intro request — where does confirmation appear? Inbox? Toast? Needs verification and likely a dedicated thread-type. High.
5. **0° new-user onboarding is empty.** `/dashboard/network` with zero connections needs to drive to invite or vouch, not just show "You haven't vouched for anyone yet". High.

See [flags.md](flags.md) for the full list (31 items, categorized by type + severity).

---

## Trust-model quick reference (for readers who skipped PROJECT_PLAN.md)

Viewer's trust to any target user is one of five states. The audit uses these as columns in the gate matrix:

| State | Meaning | Visual (TrustTag component) |
|---|---|---|
| **signed_out** | Not authenticated. Middleware redirects protected routes to /sign-in. | N/A |
| **0deg** | Signed in but no vouches or shared connectors. `degree = null`, score = 0. | Zinc "not connected" pill |
| **1deg** | Direct vouch (either direction). `degree = 1`. | Purple pill + score |
| **2deg** | Through a shared connector. `degree = 2`. | Emerald pill + shield + score + connector dots |
| **3deg** | 3-hop chain. `degree = 3`. Score dampened ×0.6. | Mustard pill + chain + score |
| **4deg_plus** | ≥4 hops or no path within 4. No score. | Zinc pill + chain only |

Listing visibility/access is resolved via [src/lib/trust/check-access.ts](../src/lib/trust/check-access.ts) using the host's `access_settings`. Rules: `anyone_anywhere`, `anyone`, `min_score`, `max_degrees`, `specific_people`. Inner gate (`full_listing_contact`) is clamped: never more permissive than outer gate (`see_preview`).

---

## Phase A limitations (what still needs doing)

1. **Screenshots not captured.** [capture.mjs](capture.mjs) is ready but requires:
   - `npm install --save-dev @playwright/test` + `npx playwright install chromium`
   - Three Clerk storage-state JSON files at `audit/.auth/0deg.json` / `1deg.json` / `4deg.json`
   - Real seed-data IDs injected via env vars (`AUDIT_TEST_LISTING_ID`, `AUDIT_TEST_PROFILE_ID`, etc. — see top of capture.mjs)
   - A fresh 0deg Clerk test account named `audit-0deg-<timestamp>` (not yet created)

   These are operational steps best done by (a) a follow-up CC session with migration + Clerk credentials, or (b) Loren kicking off the script locally. The artifacts in this audit folder are structured to support either path.

2. **Verification round not run.** The audit didn't execute Playwright against the live site to confirm rendering matches the gate matrix. Phase B should verify 2-3 high-risk cells (e.g. `/listings/[id]` at 4°+ on mobile) manually before building persona maps.

3. **Some states inferred from code, not observed.** Several gate-matrix cells are marked "UNDEFINED" or "VERIFY" — these need live-site confirmation to convert to concrete gap entries.

---

## How downstream consumers should use this

### Loren + Claude strategy chat (Phase B)
1. Load [flags.md](flags.md) and [copy-inconsistencies.md](copy-inconsistencies.md) first — they're the provocations.
2. Then [gate-matrix.json](gate-matrix.json) — the trust-state coverage view is the single clearest input to persona journey mapping.
3. Cross-reference with [routes.json](routes.json) for entry/exit-point analysis.
4. Produce persona journey maps (new user 0°, growing user 2°, established user 4°+) and prioritized fix backlog.

### Claude Design session
1. Point Claude Design at this repo.
2. Use the Claude Design web-capture tool on https://alpha-c.onedegreebnb.com for live visuals.
3. Reference [gate-matrix.json](gate-matrix.json) and the trust model quick-reference above for the five viewer states to prototype.
4. When capture.mjs has been run, the [screenshots/](screenshots/) folder will be the canonical visual reference.

### Future CC sessions (acting on the backlog)
- Each item in [flags.md](flags.md) has severity. The five high-severity picks are the first actionable batch.
- Any fix should re-read the relevant copy-inconsistencies.md row before editing — terminology drift is the single most common source of confused UX here.

---

## Self-check / verification

**Every route in routes.json got an entry in gate-matrix.json?** Yes — 27 rows in both.
**Every priority component has a `file` that exists?** Yes — spot-check: `src/components/trust/trust-tag.tsx`, `src/components/listing/gated-listing-view.tsx`, `src/components/browse/live-listing-card.tsx` all present.
**copy.json parses as valid JSON?** Yes (342 strings extracted).
**Any application source modified?** No. Audit is read-only. Only writes are to this `audit/` folder.
**Screenshots captured?** No — deferred to a follow-up operational step. See "Phase A limitations" § 1.

---

*Produced by CC-Audit session, 2026-04-20.*
