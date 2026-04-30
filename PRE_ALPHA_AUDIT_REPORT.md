# Pre-Alpha Audit Report — Trustead

**Date:** 2026-04-29
**Scope:** Read-only inspection of code, migrations, workflows, and config. Zero changes made. No live dashboards or APIs were called — every "Loren-must-check" item below requires you to verify in the third-party console.
**Method:** Five parallel investigation passes (auth, database, secrets/infra, UX/legal, email/SMS/observability) + four targeted spot-checks to verify the highest-impact findings firsthand.

---

## Executive summary

Trustead has solid auth-handler discipline (every server route I sampled checks Clerk auth before DB access) and a well-designed impersonation feature with triple-gate enforcement. **However, three findings would put alpha testers — and the platform — at real risk if invites went out today:**

1. **Row Level Security is OFF on the most sensitive tables** (`users`, `listings`, `vouches`, `contact_requests`, `invites`, `payment_events`, `stay_confirmations`, `listing_photos`). Supabase's default `anon` role has SELECT/INSERT/UPDATE/DELETE on these. The `NEXT_PUBLIC_SUPABASE_ANON_KEY` ships in every client bundle. **An alpha tester opening DevTools could enumerate every user's phone, email, location, and payment-method handle in 30 seconds.**
2. **Two GitHub workflows fire on every push to `main`** — `deploy-prod.yml` (the real one, deploys to `trustead.app`) and `deploy.yml` (a legacy file that still pushes to a Pages project named `onedegree-app`). Source-of-truth conflicts like this are how the recent Clerk-cutover bug happened.
3. **No SMS opt-out (STOP) handling, despite "Reply STOP to opt out" being sent in invite SMS bodies.** This is a concrete A2P 10DLC violation and Twilio can suspend the sender. Also no rate limiting anywhere — invite SMS, contact-request creation, proposal creation, and DM sends are all uncapped.

The rest of the punch list is mostly polish and ops gaps (no error tracker, no uptime monitor, no GDPR data-export endpoint, no first-sign-in onboarding, demo accounts not visually labeled). None individually break alpha, but together they make incident response and tester support much harder than it should be.

---

## 🔴 BLOCKING (fix before invites)

| # | Item | Current state | Risk if left | Recommended action | Effort |
|---|---|---|---|---|---|
| **B1** | **RLS missing on core PII tables** | Across all 44 migrations only 18 tables have `ENABLE ROW LEVEL SECURITY`. Tables with NO RLS include `users` (phone, email, location, payment_methods JSONB), `listings`, `vouches`, `contact_requests`, `stay_confirmations`, `invites` (invitee_phone + invitee_email), `listing_photos`, `payment_events`. No `REVOKE … FROM anon` statements exist in any migration. | Anyone with the public anon key (which ships in every client JS bundle) can `SELECT * FROM users` and pull every tester's phone number, email, and location. Phones are unique-indexed (migration 021), making targeted enumeration trivial. **This is the single most consequential finding in the audit.** | (a) Verify in the Supabase SQL editor: open a new query as the `anon` role and run `SELECT phone_number, email, location FROM users LIMIT 1;` — if it returns rows, you have the bug. (b) For each unprotected table, decide whether it should be unreachable to anon (then `ENABLE ROW LEVEL SECURITY` with no policies) or selectively readable (add `FOR SELECT USING (...)` policies). Code already routes through `getSupabaseAdmin()` + Clerk-auth ownership checks for legitimate access, so locking down anon should not break the app. | **L** (every table needs a thought-through policy; suggest a dedicated session) |
| **B2** | **Dual deploy workflows on `main`** | `.github/workflows/` has 4 workflows. Two trigger on push to `main`: `deploy-prod.yml` (deploys to `trustead.app`, sets prod Clerk user `user_3D00SQt8…KroV`) and `deploy.yml` (deploys to a Pages project named `onedegree-app`, no env var injection). The other two are branch-scoped (`track-b/airbnb-clone`, `track-b/1db-overlay`). | Every commit to main fires two deploys to two different Pages projects. The `onedegree-app` build runs without Clerk/Supabase env vars getting set, so it ships broken — but it is still consuming a public URL and could be indexed or seen by testers. This kind of split-brain is exactly the failure mode that produced the dev→prod Clerk cutover bug. | Verify in [Cloudflare dash → Pages](https://dash.cloudflare.com/) which projects exist (`trustead`, `onedegree-app`, plus track-b artifacts). If `onedegree-app` is no longer the production deploy, delete `.github/workflows/deploy.yml` and the corresponding Pages project. | **S** |
| **B3** | **Cron worker target mismatch (alpha-c, not prod)** | `cron-worker/wrangler.toml` line 14 has `TARGET_URL = "https://alpha-c.onedegreebnb.com"` — cron is hitting the alpha-c environment. `cron-worker-prod/wrangler.toml` exists with `TARGET_URL = "https://trustead.app"` but it's a separate Worker (`name = "trustead-cron-worker"`) that has to be deployed independently. | If `trustead-cron-worker` was never deployed, then **no cron jobs are running against `trustead.app`** — review reminders, payment-due messages, proposal expiry, and trust score recompute all silently broken on prod. Alpha testers will see check-in reminders that never arrive and trust scores that don't update. | Verify in [Cloudflare dash → Workers & Pages](https://dash.cloudflare.com/) that BOTH workers exist and BOTH show recent successful invocations on the schedule `7 * * * *`. If `trustead-cron-worker` is missing, deploy it: `cd cron-worker-prod && npx wrangler deploy && npx wrangler secret put CRON_SECRET`. | **S** if just needs deploy; **M** if you decide to retire alpha-c first. |
| **B4** | **No SMS opt-out handling (A2P 10DLC violation)** | `src/lib/sms/send-invite.ts` invite body includes "Reply STOP to opt out" (good — required by Twilio). But there is no inbound webhook handler for STOP/HELP, no `sms_opt_out` table or column, and no pre-send check that filters out users who replied STOP. | Twilio audits A2P 10DLC campaigns. Sending the canonical "Reply STOP" copy without honouring inbound STOP is a documented violation that can trigger campaign suspension or shadow-blocking on the sender number. Beyond compliance: any tester who replies STOP and then keeps getting alert SMS will (rightly) consider it spam. | (a) [Loren-must-check] In [Twilio console → Messaging → Campaigns](https://console.twilio.com/us1/account/messaging) confirm A2P 10DLC campaign + brand are registered and the sender number is assigned. (b) Add a Twilio inbound-message webhook → `/api/webhooks/twilio/sms` that records STOP/HELP replies into a new `sms_opt_outs` table. (c) Filter `phone_number` against that table before any direct-Twilio send (invite, proposal alert). | **M** |
| **B5** | **`users` table contains PII enumerable across the trust graph** | Per migration 001, `users` row has `phone_number`, `email`, `location`, plus the `payment_methods` JSONB added in migration 026 (Venmo/PayPal handles). With no RLS and the anon key public, this is the same finding as B1 but worth calling out separately because the data is uniquely sensitive — payment handles in particular are typically a "never expose to other users" category. | Worst-case: tester pulls every other tester's Venmo handle and the Twilio phone, then off-platform messages or pays them, completely outside Trustead's safety surface. | Same fix as B1, but specifically for `users.payment_methods` consider moving it to a separate `user_payment_methods` table that is service-role-only. | **M** (covered by B1's larger fix but flag separately during policy design) |
| **B6** | **Demo / seeded accounts indistinguishable from real users** | Migration 022 added `users.is_test_user`. The flag is checked in `/api/admin/impersonate/list` and the join-completion page, but no UI surface (badge, prefix, color) marks a test user. `src/lib/network-data.ts` and `src/lib/trust-data.ts` do NOT filter `is_test_user` out of trust-degree computations or browse results. | An alpha tester sees demo accounts in their trust graph, vouches them, sends them messages — and the "person" never replies because they're seeded fixtures. The seed accounts may also boost or distort real users' trust scores if degree paths route through them. | (a) Add an `is_test_user` filter to all browse/trust/network read paths exposed to non-admin users. (b) Add a `[DEMO]` badge in profile + listing cards when `is_test_user = true`, gated to admin/impersonation views only (don't show real testers — the demo accounts should be invisible to them, not labeled). | **M** |
| **B7** | **No first-sign-in experience** | Per memory + commit `03d04a8`, B1 onboarding was reverted. `middleware.ts` lands signed-in users on `/browse`. No tour, no "what to try first", no profile-completion nudge. | First impression is a grid of properties with no context. Tester confusion will dominate the early feedback channel, and you'll lose signal on the actual product because everyone's stuck on "what am I supposed to do?" | Decide between (a) ship a 3-screen welcome swiper (the reverted B1 work — see commit `042755b` for the previous implementation) or (b) write a 1-page "Welcome to Trustead alpha — start here" that the invite email links to AS WELL AS the app. Option (b) is shippable today. | **S** (option b) / **M** (option a) |

---

## 🟡 RECOMMENDED (fix before invites if cheap; track immediately if not)

| # | Item | Current state | Risk | Recommended action | Effort |
|---|---|---|---|---|---|
| R1 | **No rate limiting anywhere** | Grep across `src/` returns zero hits for Upstash, Ratelimit, or any throttling middleware. Endpoints with no cap include: invite SMS/email creation, contact-request creation, proposal creation, DM send, message-thread creation. | A single tester (or compromised tester account) can fan out hundreds of invite SMS in seconds. Twilio bill spike + sender-reputation damage. Same risk on email via Resend. | Add Upstash Ratelimit (free tier covers alpha). Suggested caps: invites 10/hour/user, contact-requests 20/hour/user, DM 60/hour/user, proposals 5/hour/user. | M |
| R2 | **No image upload validation** | `src/app/api/photos/upload/route.ts` writes files to the `listing-photos` Supabase bucket using the client-supplied `file.type` and a filename extension split. No MIME whitelist, no size limit, no extension check. | Tester uploads a 50MB file → Supabase storage cost spike. Tester uploads `evil.html` with `Content-Type: text/html` → bucket serves attacker-controlled HTML on `*.supabase.co` (limited because of CORS, but still ugly). | Whitelist `image/jpeg`, `image/png`, `image/webp`. Cap size to 10MB. Validate the actual extension, not the client filename. | S |
| R3 | **No GDPR data-export or self-service deletion** | `src/app/(app)/settings/page.tsx` offers deactivation only with a comment "We don't delete your data — contact support if you need a full deletion." No `/api/users/me/export` endpoint. | A tester in the EU has the right to download/delete their data on request. Until you have a UI, every request becomes a manual ticket Loren has to handle by hand. Probably fine at <50 testers, becomes painful fast. | Add a "Download my data" button that triggers a JSON export of every row across users/vouches/contact_requests/messages/etc keyed to the user. Add a "Delete my account" button that sets a deletion-pending flag and triggers a 30-day hard-delete via cron. | M |
| R4 | **No error tracking** | No Sentry/Logflare/Datadog/PostHog/Axiom in `package.json` or anywhere in the repo. There are 80 `console.error` calls in `src/app/api/`. Errors are visible only in Cloudflare Pages Functions logs (24-48h retention, not queryable). | When a tester reports "it broke," you have no way to pull the matching server-side error without scrolling Cloudflare's tail-log UI within 24h. Most reports will become unreproducible. | Free Sentry tier handles alpha scale. Drop in `@sentry/nextjs`, set `SENTRY_DSN` in Cloudflare Pages env vars, route `console.error` through it. | M |
| R5 | **No external uptime monitor** | `/api/health` exists and pings Resend/Clerk/Twilio/Supabase. No external pinger is hitting it (not visible in code or `.github/`). | If `trustead.app` goes down at 2am, no one knows until a tester emails. | Free [Uptime Robot](https://uptimerobot.com/) tier does 5-min pings + email alerts. Point it at `https://trustead.app/api/health` and at `https://trustead.app/`. | S |
| R6 | **`message_threads` and `messages` RLS uses placeholder policies** | Migration 007 enables RLS but the policies were not visible in the spot-check — Agent 2 reports they may use `USING (true)` (effectively no restriction). Routes use service-role anyway, so app behaviour is correct, but the policy is meaningless. | If service-role usage is ever refactored away, anon-key access reads everyone's messages. Latent footgun. | Replace `USING (true)` with `USING (auth.jwt() ->> 'sub' IN (SELECT clerk_id FROM users WHERE id = guest_id OR id = host_id))` or equivalent — needs Clerk JWT integration with Supabase. | M |
| R7 | **`NEXT_PUBLIC_ENABLE_IMPERSONATION=true` ships to client** | `deploy-prod.yml` line 37 hardcodes this on the prod build. Triple-gate (env flag + admin allowlist + HMAC cookie) holds, so attackers can't actually impersonate, but the *existence* of the feature is discoverable from the bundle. | Disclosure of internal admin tooling. Low immediate risk because the gates are sound, but attackers love discovering admin paths. Per your own `.env.example` comment: "Production deploys MUST leave these unset." | Pre-beta: remove the env var from `deploy-prod.yml`, delete the impersonation routes + lib code, drop the `impersonation_log` table and `is_test_user` triggers (per the ALPHA_REMOVAL_CHECKLIST referenced in migration 022). Agent 1 also recommends adding a CI check that fails the build if `NEXT_PUBLIC_ENABLE_IMPERSONATION` is set in a "production" workflow. | M (pre-beta only — tracked but acceptable for alpha) |
| R8 | **No loading.tsx skeletons** | Spot-check found no `loading.tsx` files under `src/app/(app)/*`. Next.js App Router uses these for instant feedback during navigation. | Tester clicks a tab, screen freezes for 600-1500ms while server-render happens. Looks like the app is broken. | Add `loading.tsx` to `(app)/browse`, `(app)/inbox`, `(app)/trips`, `(app)/dashboard`. Each can be a 30-line skeleton component. | S-M |
| R9 | **No empty states on key pages** | Brand-new user with zero bookings/listings/messages opens `/inbox` or `/trips` and likely sees a blank-ish list. Also no "you haven't made a wishlist yet" copy on `/wishlists`. | Every blank state is a moment where a tester questions whether the app even loaded. | Add empty-state cards to `inbox-list.tsx`, trips list, wishlists, dashboard pending-requests. Each gives 1 sentence + 1 CTA. | M |
| R10 | **Email FROM domain not yet verified** | `src/lib/email.ts` sends as `Trustead <hello@staytrustead.com>` but a code comment notes the underlying SMTP domain is still `onedegreebnb.com` pending DNS verification of `staytrustead.com`. Per memory, the brand is now `trustead.app` (not `staytrustead.com`) — three different domains in the email path. | Inbound replies to `hello@staytrustead.com` may not deliver if MX isn't set. Sender alignment (SPF/DMARC) on `onedegreebnb.com` for messages claiming to be from `staytrustead.com` will degrade deliverability — alpha invites land in spam. | (a) Decide canonical email domain (recommend `trustead.app` for brand consistency). (b) [Loren-must-check] In [Resend dash → Domains](https://resend.com/domains), add and verify whichever domain you pick — SPF, DKIM, return-path. (c) Update `FROM` and `REPLY_TO` in `email.ts` to match. | M |
| R11 | **Per-action audit log gap on impersonation** | `impersonation_log` records start/end of an impersonation session but `actions_count` is never incremented and there's no per-mutation log. | If you impersonate a user and accidentally do something destructive, you have no record of what you touched, only that you were logged in as them at the time. | If keeping impersonation past alpha (you shouldn't), wrap mutating endpoints to insert into an `impersonation_actions` table when `imp_user_id` cookie is present. Otherwise just delete the feature pre-beta. | S during fix; defer if removing pre-beta |
| R12 | **No backup of GitHub Secrets** | All deploy secrets (`CLOUDFLARE_API_TOKEN`, `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `TWILIO_AUTH_TOKEN`, `CRON_SECRET`, `IMPERSONATION_COOKIE_SECRET`) live only in GitHub repo secrets. | Loss of access to the `bbagent-01` GitHub account = unrecoverable secret loss. You'd have to rotate every credential at every provider. | Export each secret value to your password manager (1Password works) under a "Trustead deploy" vault. Re-export when rotated. | S (one-time) |
| R13 | **`/dev/design-system` reachable to alpha testers** | `src/app/dev/` exists and is not in any auth-protect list per the middleware spot-check. | Cosmetic, but design-token reference pages in front of testers look unfinished. | Either gate `/dev/*` behind admin check (re-use impersonation admin gate while it exists) or `notFound()` it in production. | S |

---

## 🟢 NICE-TO-HAVE (track for later)

| # | Item | Recommended action |
|---|---|---|
| N1 | No CWV / web-vitals monitoring | Enable Cloudflare Web Analytics (free, passive) on the Pages project — toggle in [Cloudflare dash → Web Analytics](https://dash.cloudflare.com/?to=/:account/analytics/web). |
| N2 | No status page | Free [Instatus](https://instatus.com) tier; not urgent at <50 testers. |
| N3 | Signup flow unclear (open vs invite-only) | No `SIGNUP_MODE` env var references in code. If invites should be required, add gate. If open is intentional, OK. |
| N4 | Per-inviter invite quota | None enforced. Add a cap (e.g., 5 outstanding invites per tester) to prevent runaway fan-out. |
| N5 | Stale `users` rows when Clerk user is deleted server-side | Add a daily cron to mark/prune. |
| N6 | `legal-status` page exists but unclear if linked from footer | Verify it appears in app-wide footer alongside `/privacy` and `/terms`. |
| N7 | TODO/FIXME comments in active code paths | 5 found (sign-up, invite, hosting create/edit, proposals feed, booking-stage). Most are explicit "Phase B" stubs. Pre-alpha sweep recommended to make sure none are user-visible "coming soon" placeholders. |
| N8 | `1degreebnb.com` redirect to `trustead.app` | Not visible in code (would live at the DNS layer). Confirm in Cloudflare DNS for both `onedegreebnb.com` and `1degreebnb.com` zones. |
| N9 | Twilio `from` number in E.164 format checked at runtime? | Spot a 5-line guard in `src/lib/sms/*` that throws if `TWILIO_PHONE_NUMBER` doesn't start with `+`. |
| N10 | Cron worker has no retry / failure alerting | Hourly cron is idempotent so a missed beat is recoverable, but a multi-hour outage goes silent. Tie cron-worker errors into Sentry once R4 is in place. |

---

## ✅ Passed audit (areas confirmed solid)

- **Clerk webhook signature verification** — `src/app/api/webhooks/clerk/route.ts` requires `CLERK_WEBHOOK_SECRET`, verifies via Svix, rejects on invalid signature before any DB write.
- **Route-handler auth discipline** — Sampled 10+ POST/PATCH/DELETE handlers across bookings, vouches, contact-requests, invites, proposals, message-threads, dm/open-thread. Every one calls `effectiveAuth()` before DB access and scopes queries to the authenticated user. No IDOR detected in the sample.
- **Impersonation triple-gate logic** — `passesTripleGate()` checks env flag + admin allowlist + HMAC cookie on every request. Constant-time HMAC comparison. Cookie is httpOnly + secure + sameSite=strict. Restricted to `is_test_user = true` rows only — real users cannot be impersonated. Logged on session start.
- **Cron endpoint auth** — All 4 cron endpoints (`/api/cron/{check-reminders, payment-due, expire-proposals, recompute-trust-v2}`) require `x-cron-secret` header matching `CRON_SECRET`.
- **Cron job idempotency** — All 4 jobs are safe to re-run and safe if a beat is skipped. Sent-at flags on reminders, status filters on proposal expiry, self-throttling on trust recompute.
- **Service-role usage hygiene** — 7 of 8 `getSupabaseAdmin()` callsites do their own Clerk auth + ownership check before the service-role query. The 8th is the health-endpoint diagnostic — acceptable.
- **PII at the application layer** — All sampled write handlers properly scope by `clerk_id → users.id`. No mass-assignment, no trusted-from-body user IDs.
- **Privacy policy + Terms of Service** — Substantive documents (not Lorem ipsum), last updated 2026-04-25, contact email on file, CCPA/CPRA rights documented. Cookie banner present in `src/components/layout/cookie-banner.tsx`. Suppressed on legal pages.
- **Error pages don't leak stack traces** — `src/app/error.tsx` shows a generic "Something went wrong" + error digest + retry, no stack.
- **404 page** — Branded, has home + browse + support links.
- **Migrations idempotent** — All 44 migrations use `IF NOT EXISTS` / `DO $$ BEGIN … EXCEPTION WHEN … END $$` patterns; safe to re-apply.
- **Database indexes** — 42 `CREATE INDEX` statements across migrations; FK lookups and hot WHERE clauses (host_id, guest_id, status, due_at) are all covered. No obvious missing indexes.
- **Email error handling** — All `send()` paths wrap Resend in try/catch; failures logged to console, never bubble to user-facing errors. Cron-driven reminders use `Promise.all` and surface errors in `result.errors[]`.
- **No accidental `.env` in git history** — `.gitignore` covers `.env*.local`. No `.env` committed in any commit on any branch.
- **No hardcoded secrets in source** — Grepping for AKIA/sk_live/private-key markers across history returns nothing.
- **Stale `clerk_id` handling** — `effectiveAuth()` returns null if user lookup fails; downstream routes return 401/404 cleanly.

---

## Loren-must-check (third-party dashboards I can't see from the repo)

These cannot be derived from code. Pull each of these up and confirm before invites go out.

### Supabase ([dashboard](https://supabase.com/dashboard/project/ldoueidykjeglqndbaev))
- **PRIORITY** Open SQL Editor as the `anon` role and run `SELECT count(*) FROM users;`. If it returns a number, B1 is confirmed and you cannot invite testers until RLS is added.
- Settings → Backups → confirm Point-in-Time Recovery is enabled, retention ≥ 7 days. If on free tier, consider upgrading before alpha.
- Storage → `listing-photos` bucket → Policies tab. Confirm public read OK, write/delete restricted to authenticated/service-role.
- Storage → bucket settings → file-size limit set (suggested 10MB).

### Clerk Production instance ([dashboard](https://dashboard.clerk.com))
- Domains → confirm `trustead.app` is added and verified.
- Webhooks → confirm endpoint is `https://trustead.app/api/webhooks/clerk`, status "Healthy", recent deliveries succeeded.
- Sessions → confirm session lifetime is reasonable (default 7 days).
- Social Connections → Google → status. Per memory, consent screen is "In production" but unverified — verify domain, upload logo, complete branding review.
- Phone, Email → confirm phone is required for signup (per project plan).

### Twilio ([console](https://console.twilio.com))
- Messaging → Campaigns → A2P 10DLC: brand registered, campaign approved, sender number assigned.
- Messaging → Settings → daily/monthly send caps adequate for ~50-100 testers (assume 5-10 SMS per tester).
- Messaging → Webhooks → inbound webhook URL set (currently NOT — see B4).
- Account → Balance + spend cap set so a runaway loop can't drain your card.

### Resend ([dashboard](https://resend.com))
- Domains → confirm chosen send-domain (`trustead.app` recommended) is verified — SPF, DKIM, return-path all green.
- API Keys → key in use is scoped (sending only, not full account).
- Email Analytics → bounce + complaint rates < 5%.

### Cloudflare ([dashboard](https://dash.cloudflare.com))
- Pages → list every project. Confirm `trustead` is the live one. Decide whether `onedegree-app` (and any track-b projects) should still exist — see B2.
- Workers & Pages → confirm `onedegree-cron-worker` AND `trustead-cron-worker` both show recent successful invocations on `7 * * * *`. See B3.
- DNS → `trustead.app` zone: confirm CNAME for apex/www → Pages, MX records present (if email on this domain), SPF/DKIM/DMARC TXT records.
- DNS → `onedegreebnb.com` zone: confirm what's still routed where. Decide if alpha-c.* and alpha-b.* subdomains should be retired now or post-alpha.
- DNS → `1degreebnb.com` zone: confirm 301 redirect to `trustead.app` exists if you want that legacy URL to still resolve.
- Web Analytics → enable on the Pages project (free).
- Security → Bot Fight Mode → on (free tier OK).

### GitHub ([repo](https://github.com/bbagent-01/trustead))
- Settings → Secrets and variables → Actions: confirm every secret listed in `deploy-prod.yml` exists (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, plus Twilio + Resend + CRON_SECRET if cron-worker secrets live here).
- Export each value to your password manager (R12).

### Google Cloud Console ([OAuth consent](https://console.cloud.google.com/apis/credentials))
- OAuth consent screen → publishing status. If still "In testing", users outside the test-user list cannot sign in via Google.
- Authorized domains → `trustead.app` and `clerk.trustead.app` (or whatever Clerk's hosted domain is) listed.
- Branding → logo uploaded, app name set, support email set.

---

## Notes on what I could not check from the repo
- Live RLS state on the actual database (only the dashboard or a query against the live DB would confirm whether what's in migrations matches what's in production — but if the migrations don't enable RLS, the live DB doesn't have it either).
- Whether `track-b/airbnb-clone` and `track-b/1db-overlay` Pages projects are still active.
- Whether Twilio is in trial mode or production messaging service.
- Whether Resend domain is verified.
- Whether Google OAuth consent screen is in production-published vs testing mode.
- Whether Supabase backups are enabled and the retention window.
- Cron worker actual deployment status and most recent successful run time.
- Any WAF rules / Bot Fight Mode setting in Cloudflare.

Each of those is captured above as a "Loren-must-check" with a specific dashboard URL.
