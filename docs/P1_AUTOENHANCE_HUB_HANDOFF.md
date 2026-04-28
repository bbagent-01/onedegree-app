# P1 — Autoenhance.ai Investigation — Session Recap

> **Status: PAUSED.** Investigation complete; integration deferred. Loren wants to consider lower-hanging-fruit alternatives (sync APIs, in-place editors) before committing to Autoenhance.ai. This doc is the on-record handoff for the build plan in case we revisit.

---

## Session metadata

| | |
|---|---|
| **Session ID** | P1.inv – Alpha-C – CC-Dev2 – Autoenhance Investigation |
| **Date** | 2026-04-28 |
| **Branch** | `track-b/photo-tools` |
| **Migration** | None |
| **Commits** | 1 — `11246c1` ("P1.inv: Autoenhance investigation report") |
| **Files shipped** | `docs/P1_AUTOENHANCE_INVESTIGATION.md` (full report, 273 lines) |
| **Code shipped** | None (investigation-only session) |
| **$ spent** | $0 — free-trial signup, no paid downloads |

---

## What we found

### Headline (positive)
**Per-feature toggles are fully supported.** Every Build-Plan §P1 locked-list item maps to an explicit API parameter. No hacks needed. The default settings JSON we'd ship looks like:

    {
      "ai_version": "stable",
      "enhance_type": "neutral",
      "sky_replacement": false,
      "vertical_correction": true,
      "lens_correction": false,
      "window_pull_style": "ONLY_WINDOWS",
      "auto_privacy": false
    }

Reasoning: lean truthful, not pretty, on every controversial toggle (no fake skies, no warped wide-angle correction, no auto-blurred faces).

### Headline (negative — the friction points)

1. **Async job model = 5–10 min wait per processing run.** This was the dealbreaker for the per-photo-individual UX Loren wanted. A host with 10 photos who tunes each individually = 50–100 min of waiting if they iterate even once per photo.
2. **TOS training-data clause** — "irrevocable, non-exclusive, worldwide right to use Source Material and Output Image for training Autoenhance Software." Survives termination. **Loren accepted this as acceptable for alpha** (treating it as a temporary proof-of-concept), but it's on record as an issue to revisit.
3. **Doc inconsistency:** the `auto_privacy` toggle is documented as `privacy` on its dedicated doc page but as `auto_privacy` in the official usage example. Either works in practice; needs confirmation with their support.
4. **Webhook auth is weak** — they document an "authentication value" header, no HMAC signing scheme. Pushed us toward polling for v1.

### Pricing (locked-in answers)

- **$0.29 per finalized photo** on the Essential plan ($29/mo, 100 images included, currently 50% off limited offer).
- **$0.75 per finalized photo** on pay-per-image (no monthly).
- **Enterprise quote** for 5,000+/mo.
- **Free trial = unlimited watermarked previews, no credit card.** Critical insight: Autoenhance bills per *download*, not per *processing run* — so per-photo toggle iteration does NOT multiply cost. ~$290 estimated for the 1,000-photo alpha regardless of UX shape.

### API surface (key facts)

- **Auth:** `x-api-key: <key>` header. Optional `x-dev-mode: true` to test without consuming credits.
- **Base URL:** `https://api.autoenhance.ai/v3/`
- **Async upload model:** register image → get presigned PUT URL → upload binary → poll status (`enhanced: bool`) or wait for webhook.
- **Formats:** JPEG, WEBP, AVIF, HEIC, TIFF, PNG (PNG is API-only), wide RAW support.
- **Polling vs webhooks:** polling recommended for v1 (simpler, no signed callback endpoint needed).
- **AI version:** `stable` (currently 5.3, April 2026).

---

## Account state (real, persistent)

| Asset | Location | Status |
|---|---|---|
| Autoenhance account | `loren@staytrustead.com` | ✅ Created |
| API key | Cloudflare Pages alpha-c env vars (`AUTOENHANCE_API_KEY`, type: Secret) | ✅ Set (deploy-side) |
| API key — local | `.env.local` in both `onedegree-app-track-b` and `onedegree-app-photo-tools` worktrees | ✅ Set (gitignored) |
| Sample order (anonymous) | https://app.autoenhance.ai/orders/6718d83e-dd35-47ab-aedb-741ff528d117 | ✅ Live (one image, watermarked preview — free) |
| Webhook config | NOT configured (intentional) | ⏸️ Skipped — polling chosen for v1; revisit only if polling becomes a bottleneck |

If we resume: the API key is already in place, no new account work needed.

---

## Why we paused

Loren's preferred UX was **per-photo individual toggle control** — host picks settings on each photo, not just a single batch default. We confirmed this is technically possible (API takes a fresh JSON per photo) and cost-neutral (billing is per-download, not per-iteration).

But the **5–10 min API round-trip per toggle change** is the friction point. A host with 10 photos who tunes each individually = 50–100 min of waiting if they iterate even once per photo. That's the dealbreaker for the per-photo UX shape Loren wanted, and the reason we paused before locking the integration spec.

Autoenhance's capabilities are real and well-matched to the locked enable list. The only mismatch is its **async job model** vs. the **synchronous, in-place editing experience** Loren wants for hosts. If we accept the async UX (e.g., batch-process all photos with a default preset, no per-photo override), Autoenhance is a fit. If we want sync per-photo editing, Autoenhance is the wrong tool — not because it's broken, but because that's not what it does.

---

## Open questions for whoever picks this back up

1. **Strategic direction:** Stay with Autoenhance and accept the async UX, OR pivot to a sync auto-enhance API and accept worse real-estate-specific quality, OR shelve P1 entirely?
2. **`auto_privacy` vs `privacy`** parameter inconsistency — confirm with Autoenhance support before any integration ships.
3. **Webhook signing** — if we ever flip from polling to webhooks, demand a real HMAC scheme from Autoenhance.
4. **Training-data disclosure** — does host-facing UI need explicit copy that "your photos may be used to improve our 3rd-party AI partner's models," or is the broader Trustead privacy policy update sufficient?
5. **Cost ceiling for alpha** — $290 for 1,000 photos was the working assumption; was never explicitly approved.
6. **Sample quality** — the live anonymous order link above should be inspected before committing to Autoenhance. Loren did not get a chance to gut-check output during this session.

---

## Edge cases / gotchas captured

- **Worktree env-file gotcha:** Loren first added the API key to `~/Claude/Projects/onedegree-app-track-b/.env.local` (sibling worktree) instead of `~/Claude/Projects/onedegree-app-photo-tools/.env.local` (this session's worktree). Both worktrees share the same git repo but have independent gitignored `.env.local` files. Resolution: copied the line over. Future fix: consider symlinking, or pick a single worktree to be canonical for this work.
- **No account created by CC.** Built-in safety rules block account creation on user's behalf even with explicit session permission. Loren did the signup himself.
- **No-account preview flow:** Autoenhance lets anyone preview enhancements (watermarked, free) at https://app.autoenhance.ai without signing up. Useful for sample testing without burning credits or committing to a paid plan.

---

## What's needed next (if we resume Autoenhance specifically)

1. Decide whether the async UX is acceptable (batch-process default → host sees enhanced previews 5–10 min later; no real-time toggle UI).
2. If yes: lock the default-settings JSON above and draft the integration prompt in Build chat → spawn a new CC session to implement.
3. Confirm `auto_privacy` vs `privacy` parameter naming with Autoenhance support before shipping.
4. Inspect the live sample order URL to gut-check output quality.

If we don't resume: the Cloudflare API key can sit unused (no monthly cost on free trial). No cleanup required unless you want to deactivate the account.

---

## Appendix — Source artifacts

- Full investigation report: `docs/P1_AUTOENHANCE_INVESTIGATION.md`
- Anonymous sample order: https://app.autoenhance.ai/orders/6718d83e-dd35-47ab-aedb-741ff528d117
- Autoenhance docs root: https://docs.autoenhance.ai
- Autoenhance docs (LLM-friendly export): https://docs.autoenhance.ai/llms-full.txt
- Autoenhance app dashboard: https://app.autoenhance.ai
- Autoenhance API key page: https://app.autoenhance.ai/settings/account
