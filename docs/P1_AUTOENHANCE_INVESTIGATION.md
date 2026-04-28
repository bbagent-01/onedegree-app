# P1 — Autoenhance.ai Investigation

**Session:** P1.inv – Alpha-C – CC-Dev2 – Autoenhance Investigation
**Date:** 2026-04-28
**Branch:** `track-b/photo-tools`
**Method:** Public docs + dashboard recon via Chrome agent (no account created — see §1)

---

## TL;DR (5 bullets)

1. **Per-feature toggles: YES, fully supported.** Every Trustead-relevant feature is an explicit boolean or string parameter — `sky_replacement`, `vertical_correction`, `lens_correction`, `window_pull_style`, `privacy`, plus a `restage` block for fireplaces/TVs/grass/photographer. Headline blocker is cleared.
2. **Per-image cost: $0.29 (Essential plan, limited 50% offer)** or **$0.75 (Pay-per-image)**. At alpha scale (1,000 images) the Essential plan = ~$290 with 100 free, or pay-per-image = $750. Enterprise tier exists for 5,000+/mo (custom quote).
3. **Sample quality test: partial.** Confirmed the no-account "Try for free" preview flow works; kicked off a sample order ([live link](https://app.autoenhance.ai/orders/6718d83e-dd35-47ab-aedb-741ff528d117)) — still processing at end of session (their docs cite 5–10 min). Loren can revisit the URL to evaluate.
4. **TOS red flag: Autoenhance grants *itself* an "irrevocable, non-exclusive, worldwide right" to use Source Material AND Output Images for AI training** (Privacy Policy + Article 8.2 General T&Cs). Default image retention is only 24 hours (good), but the training-data grant survives termination. **This needs an explicit decision before integration.**
5. **Top open question for Loren:** Are you willing to accept the training-data clause as-is, or do we need an Enterprise contract carve-out before sending host photos? Everything else is straightforward.

---

## 1. Account Setup

**Status: NOT CREATED.**

Built-in safety rules ("Never create accounts on the user's behalf") prevent me from completing the signup in `loren@onedegreebnb.com`'s name even with explicit session authorization. Loren needs to create the account himself (~60 seconds).

- **Signup URL:** https://app.autoenhance.ai/register
- **API key location after signup:** https://app.autoenhance.ai/settings/account (per docs)
- **Webhook config location:** https://app.autoenhance.ai/application-interface

**Important — no signup needed for sample testing:** The app exposes a no-account preview flow at https://app.autoenhance.ai. Hosted samples can be enhanced in-place, watermarked output is free, and only paid downloads require an account. I used this path for §2.

---

## 2. Sample Image Quality

**Status: partial — order kicked off but processing not complete in session window.**

- **Live order created (no account):** https://app.autoenhance.ai/orders/6718d83e-dd35-47ab-aedb-741ff528d117 — Loren should be able to revisit this URL anonymously and inspect the before/after slider once processing finishes.
- The "Our samples" tab pre-loads 4 representative photos: bright bedroom, dark/dim kitchen, bright living room with greenery, exterior overcast house. Good mix matching task brief.
- Default processing time per their docs: **5–10 minutes per batch**.
- Public marketing samples on the homepage and pricing page show plausible-looking white-balance correction, sky replacement (overcast → bright blue), and window pulls. Quality looks B2B-credible, not gimmicky — but a real-eye assessment requires the live order to finish.

**Recommendation:** Loren spends 2 minutes opening the live order link above to gut-check quality before locking the integration prompt.

---

## 3. API Per-Feature Toggle Capability — THE HEADLINE FINDING

### Verdict: **YES, granular per-feature toggles exist.** Every parameter Trustead's feature list cares about is exposed as a boolean or string.

### Exact parameter names (verbatim from docs)

Source: https://docs.autoenhance.ai/images/basic-enhancements/* — one doc page per feature. Sample full request body from `usage-example.md`:

```json
{
  "image_name": "your-image-name",
  "contentType": "image/jpeg",
  "enhance_type": "property",
  "sky_replacement": true,
  "cloud_type": "CLEAR",
  "vertical_correction": true,
  "auto_privacy": true
}
```

### Per-feature parameter table

| Feature | Param | Type | Allowed values | Trustead enable? |
|---|---|---|---|---|
| Enhancement style | `enhance_type` | string | AI v3: `property`, `property_usa`. AI v4: `warm`, `neutral`. AI v5: optional, `neutral` | ✅ enable (use `neutral` on v5) |
| Sky replacement | `sky_replacement` | bool | `true` / `false` | ❌ **disable** (per build plan) |
| Cloud type (when sky on) | `cloud_type` | string | `CLEAR`, `LOW_CLOUD`, `LOW_CLOUD_LOW_SAT`, `HIGH_CLOUD` | n/a (sky off) |
| Vertical / horizon correction | `vertical_correction` | bool | `true` / `false` | ✅ enable |
| Lens / FOV correction | `lens_correction` | bool | `true` / `false` | ❌ **disable** (per build plan) |
| Window pull | `window_pull_style` | string | `NONE`, `ONLY_WINDOWS`, `WINDOWS_WITH_SKIES` | ✅ enable as `ONLY_WINDOWS` |
| Auto privacy (face/license-plate blur) | `privacy` (per dedicated doc page) — **but the official `usage-example.md` shows `auto_privacy`** | bool | `true` / `false` | ❌ **disable** (per build plan); confirm exact key with their support |
| Restaging — TV blackout | `restage.tvs` | string | `BLACK_OUT` | ❌ disable (out of scope) |
| Restaging — fireplaces | `restage.fire_in_fireplaces` | string | `ALIGHT` | ❌ disable |
| Restaging — reflection / photographer removal | `restage.photographer` | string | `REMOVE` | ❌ disable |
| Restaging — grass greening | `restage.grass` | string | `GREEN` | ❌ disable |

**Doc inconsistency to flag:** The dedicated [auto-privacy](https://docs.autoenhance.ai/images/basic-enhancements/auto-privacy) page calls the param `privacy`, but the official [usage-example](https://docs.autoenhance.ai/images/basic-enhancements/usage-example) page sends `auto_privacy: true`. We should confirm with their support which is canonical before shipping. Either way the feature is toggleable.

**Build-plan §P1 locked enable list — full match against API capability:**

- ✅ White balance / color correction → covered by default enhancement (no toggle off; baseline `enhance_type`)
- ✅ HDR merge → upload as bracket via `POST /v3/brackets/` then process via `POST /v3/orders/{id}/process` with `number_of_brackets_per_image`
- ✅ Window pulling → `window_pull_style: "ONLY_WINDOWS"`
- ✅ Horizon / vertical leveling → `vertical_correction: true`
- ✅ Sky replacement OFF → `sky_replacement: false`
- ✅ Aggressive relighting OFF → not exposed as a separate toggle; covered by choosing `enhance_type: "neutral"` on v5 (avoids the warm/saturated style)
- ✅ FOV / lens correction OFF → `lens_correction: false`
- ✅ Auto privacy OFF → `auto_privacy: false` (or `privacy: false` — TBC per inconsistency above)

**100% match.** No locked-list item requires an undocumented hack.

---

## 4. Full API Surface

### Authentication
- **Header:** `x-api-key: YOUR_API_KEY`
- Optional dev-mode header: `x-dev-mode: true` — runs jobs without consuming credits during development. Useful for the alpha-c integration.

### Base URL
- `https://api.autoenhance.ai`
- API version path prefix: `/v3/`

### Core endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v3/images/` | Register image, returns `{ image_id, order_id, upload_url }` |
| `PUT` | `{upload_url}` | Upload binary to S3-style presigned URL |
| `GET` | `/v3/images/{image_id}` | Status + metadata (`enhanced` bool, `error`, etc.) |
| `GET` | `/v3/images/{image_id}/enhanced` | Download enhanced image |
| `DELETE` | `/v3/images/{image_id}` | Delete image |
| `POST` | `/v3/brackets/` | Register a bracket file for HDR groups |
| `POST` | `/v3/orders/` | Create an order |
| `GET` | `/v3/orders/{order_id}` | Order status (`is_merging`, `is_processing`, `images[]`) |
| `POST` | `/v3/orders/{order_id}/process` | Trigger HDR grouping + enhancement on the order. Body accepts `ai_version`, `number_of_brackets_per_image`, manual `images[].bracket_ids` |
| `DELETE` | `/v3/orders/{order_id}` | Delete order |

### Async model
- **Async, job-based.** `POST /v3/images/` returns immediately with an upload URL + image_id; you `PUT` the file separately, then poll status or wait for webhook.
- Status polling via `GET /v3/images/{image_id}` — fields `enhanced` (bool), `error` (bool/string).
- **Order status** has `is_merging`, `is_processing` booleans and an `images[]` array that fills in as enhancements complete.
- Typical wall-clock: 5–10 minutes per batch (per their UI copy).

### Webhooks (preferred over polling)
Configured at https://app.autoenhance.ai/application-interface (URL + optional auth token). Events:

- `webhook_updated` — sent on settings change as a confirmation ping. Payload: `{"event": "webhook_updated"}`
- `image_registered` — fires when an image is added to an order. Payload includes event type, image_id, order_id.
- `image_processed` — fires on completion. Payload includes event type, image_id, error status, order_id, order processing status.

Auth: their docs say "your authentication token is included with POST requests" but signature/HMAC details aren't specified. **Open Q: confirm webhook signing scheme with their support before relying on it for B2B.** No retry behavior or timeout documented.

### AI version selector
- Stable (recommended for production): `5.3` (as of April 2026)
- Latest: April 2026 release
- Beta: not currently exposed
- Param value can be a string like `"stable"`, `"latest"`, or a specific version like `"5.x"` / `"5.3"`. Older versions back to `1.1` are available; build-plan should target `stable`.

### Limits (documented)
- **Formats:** JPEG, WEBP, AVIF, HEIC, TIFF, PNG (PNG is API-only — not allowed in their web UI), and a wide RAW list (Canon CR2/CR3, Nikon NEF/NRW, Sony ARW/SR2, Fujifilm RAF, Apple ProRaw, Adobe DNG, etc.). Some compressed RAW variants flagged as problematic (Nikon HE/HE*, Sony L, Canon CRAW).
- **Max file size:** *not documented* — needs confirmation
- **Rate limits:** *not documented*
- **Max images per order:** *not documented*

### Error codes (documented)
- `403 Forbidden` — Content-Type mismatch on upload
- Other 4xx/5xx not documented in detail

---

## 5. Pricing + Alpha-Scale Cost Estimate

(USD, captured 2026-04-28 from https://www.autoenhance.ai/pricing)

| Tier | Price | Per-image | Notes |
|---|---|---|---|
| **Pay per image** | No subscription | **$0.75 / image** | Downloaded images invoiced monthly; AI v5; 6K res; 45-day storage |
| **Essential (limited 50% offer)** | **$29 / mo** (was $58) | $0.29 overage / image | 100 images included; rollover credits; 6K res; 45-day storage |
| **Enterprise / Custom** | Quote | — | For 5,000+/mo, custom enhancement solutions, contact sales |

**Free trial:** Full feature access with watermarked previews — no credit card required, no account required for previews. Only paid downloads need a paid plan.

### Alpha-scale cost (100 hosts × 10 photos = 1,000 images first-time enhance)

- **Pay-per-image:** 1,000 × $0.75 = **$750 one-time**
- **Essential plan:** 1 month × $29 + 900 overage × $0.29 = **$290 one-time** (assumes done in one billing month)
- **Enterprise:** unknown — would only matter if Loren expects >5,000/mo sustained

**Recommendation for alpha:** Essential plan ($29/mo) — 60% cheaper than pay-per-image, and the rollover-credit policy lets us amortize unused capacity if hosts upload slowly. If alpha grows past ~3,000 images/mo, request an Enterprise quote.

**Watermark policy is a useful feature, not a bug:** Free unwatermarked previews mean we can show hosts an enhanced version BEFORE charging — i.e. Trustead can let a host preview enhanced photos in-app and only pay on "publish enhanced version" / "save to listing." Worth threading through the UX.

---

## 6. TOS / Privacy Findings

Sources: `/legal/general-terms-and-conditions`, `/legal/terms-of-use`, `/legal/privacy-policy`, `/legal/additional-terms-and-conditions`.

### Data retention — ✅ acceptable default

> "Autoenhance is not obliged to retain Customer's data, uploaded images or enhanced images longer than 24 hours" — Article 5.2 / 4.2

Privacy Policy adds: account-tied data retained "in no event no longer than 12 months after the closing of your account." Default retention is 24h; longer retention only if explicitly chosen in dashboard. Good for privacy posture.

### AI training rights — ⚠️ **MAJOR FRICTION POINT**

> Autoenhance receives "an irrevocable, non-exclusive worldwide right to use such Source Material and Output Image…for training the Autoenhance Software" — Article 8.2 General T&Cs

> "an irrevocable, non‑exclusive, worldwide right to use Source Material and Enhanced Images" — Privacy Policy

The training rights **survive service termination** (Article 6.2 Terms of Use). Combined with the "non-exclusive, transferable, sub-licensable, perpetual" license-back to the customer for output images, the practical effect is: every photo a Trustead host uploads becomes permanent training fuel for Autoenhance's models — even if the host or Trustead deletes the account.

**Implications for B2B integration:**
- We need to disclose to hosts that uploaded photos may be used by Autoenhance for ML training.
- "Their photo of their bedroom may end up in a training set" is not nothing — particularly if hosts are in jurisdictions with strong consent regimes (UK GDPR, California CCPA).
- Negotiable? Almost certainly yes via Enterprise contract — most enterprise SaaS shops will carve out training rights for paying customers. **But it's not free, and it's not a button you click — it requires a sales conversation.**

### Commercial use & resale — ✅ permitted

> "Autoenhance grants to Customer a non-exclusive, transferable, sub-licensable, perpetual right…to use of Output Images" — Article 8.4

Trustead can use enhanced images commercially, transfer rights to hosts, and let hosts sub-license (e.g. publish to Airbnb, OneDegreeBnB, etc.). White-labeling/reselling is permitted but Autoenhance reserves discontinuance rights if usage "deviates from intended purpose" (Additional T&Cs).

### Confidentiality — ✅ standard mutual NDA

Article 10.2: standard mutual confidentiality / non-distribution.

### Other — payment

Subscription auto-renews. Unused credits are non-refundable on cancellation. Overage fees billed monthly. Standard for B2B SaaS.

---

## 7. Recommended Trustead Feature Enable List (echoes Build Plan §P1 locked list)

This list maps the Build Plan locked decisions onto exact Autoenhance API parameters. Use as the canonical "default settings" payload in the integration.

```json
{
  "ai_version": "stable",
  "enhance_type": "neutral",
  "sky_replacement": false,
  "vertical_correction": true,
  "lens_correction": false,
  "window_pull_style": "ONLY_WINDOWS",
  "auto_privacy": false
}
```

**Rationale per toggle:**
- `enhance_type: "neutral"` → photographic-faithful color, avoids the warm/saturated "real-estate brochure" look
- `sky_replacement: false` → keeps actual weather (no fake blue skies on rainy days; truthfulness > prettiness for guest-trust)
- `vertical_correction: true` → cleans up casual phone-camera tilt without distorting content
- `lens_correction: false` → preserves spatial truth (no stretched corners that misrepresent room size)
- `window_pull_style: "ONLY_WINDOWS"` → pulls highlights inside windows (real wins) but does NOT replace exterior view
- `auto_privacy: false` → guests/people are already vetted by host; no unnecessary face-blur disruption
- HDR merge (`POST /v3/brackets/` + `number_of_brackets_per_image`) → only invoked if a host uploads bracketed exposures; opt-in

---

## 8. Open Questions for Loren

1. **Training-data clause:** Acceptable as-is, or do we need to escalate to an Enterprise contract before the alpha rolls out? (My read: this is the single biggest blocker; everything else is plumbing.)
2. **Account ownership:** Whose name is the Autoenhance account in — `loren@onedegreebnb.com` (Loren personal) or a service email (`bbagent@brightbase.co` / new shared email)? Affects who gets the API key, who pays the invoice, and what the "Customer" entity is on the contract.
3. **Pricing tier confirmation:** Start with **Essential ($29/mo, $0.29 overage)** for alpha? Switch to Enterprise if we cross ~3,000/mo?
4. **`auto_privacy` vs `privacy` parameter inconsistency:** Want me to email their support to confirm canonical key before drafting the integration prompt, or accept the risk of one extra round-trip during build?
5. **Webhook signing:** No HMAC scheme is documented. Are we OK using the optional auth-token header they provide, or do we need to demand a real signature scheme before relying on webhooks (vs polling)?
6. **Host disclosure copy:** Do we need to surface "your photos may be used to improve Autoenhance's AI models" in the photo-tools UI (TOS/consent), or is the broader Trustead privacy policy update sufficient?
7. **Sample quality verification:** Before drafting the integration prompt, do you want to spend 5 minutes on https://app.autoenhance.ai/orders/6718d83e-dd35-47ab-aedb-741ff528d117 (and re-run with the other 3 sample types) so we have a shared mental model of output quality?

---

## Appendix A — Source URLs

- Pricing: https://www.autoenhance.ai/pricing
- API marketing: https://www.autoenhance.ai/api
- Docs root: https://docs.autoenhance.ai
- Sitemap: https://docs.autoenhance.ai/sitemap.md
- Full docs export (LLM-friendly): https://docs.autoenhance.ai/llms-full.txt
- Per-feature toggles (each its own page): https://docs.autoenhance.ai/images/basic-enhancements/{sky-replacement, lens-correction, vertical-correction, window-pull, auto-privacy, enhancement-style, restaging, usage-example}
- Webhooks: https://docs.autoenhance.ai/webhooks
- Quickstart (single bracket): https://docs.autoenhance.ai/getting-started/quickstart/single-bracket
- General T&Cs: https://www.autoenhance.ai/legal/general-terms-and-conditions
- Privacy: https://www.autoenhance.ai/legal/privacy-policy
- App: https://app.autoenhance.ai
- Live anonymous sample order (kicked off this session): https://app.autoenhance.ai/orders/6718d83e-dd35-47ab-aedb-741ff528d117
