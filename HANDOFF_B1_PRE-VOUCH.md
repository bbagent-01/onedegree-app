# Handoff — B1 / B2 invite + pre-vouch alpha (status: live, polish in progress)

## TL;DR

The "invite + pre-vouch a friend" feature ships in three modes (phone, phoneless link, group blast link), all with auto-vouch on signup. Mode A auto-sends via Twilio. The recipient `/join/[token]` card was just redesigned with a larger serif headline + Trustead wordmark card.

Loren is testing live on [trustead.app](https://trustead.app). The remaining real-world test (Clerk OTP signup as a brand-new recipient user) is blocked because Loren's Google Voice setup hit a verification mismatch with someone else's Google identity. He's chosen to keep iterating without a second test phone — using the admin self-invite bypass to exercise the sender flow end-to-end.

---

## Current state on prod

### Deployed and working

- **Migration 047** (B1: `pending_vouches` + `pending_vouch_mismatch_events` tables) — applied
- **Migration 048** (B2: `mode` column + open-mode CHECK relaxations + `vouches.from_pending_vouch_id` provenance + `increment_pending_vouch_claim_count()` stored proc) — applied
- **Cron worker** with `/api/cron/expire-pending-vouches` path — deployed
- **Endpoints**: `POST /api/pending-vouches/create`, `DELETE /api/pending-vouches/[id]`, `POST /api/cron/expire-pending-vouches`
- **Webhook**: `user.created` extended to claim pending_vouches by phone match (multi-claim)
- **UI routes**: `/invite/share` (chooser + 3 modes), `/dashboard/pending-vouches` (list + cancel + resend), `/join/[token]` (recipient card, redesigned), `/join/[token]/complete` (mode-aware claim)
- **Twilio auto-send for Mode A** — Trustead-sent SMS via `sendPendingVouchSMS()` helper; share-sheet fallback if Twilio fails

### Recent merges (in chronological order)

| PR | Branch | What | SHA |
|---|---|---|---|
| [#2](https://github.com/bbagent-01/trustead/pull/2) | feat/b1-contacts-prevouch | B1 ship (Mode A only, share-sheet) | `ed93dbe` |
| [#3](https://github.com/bbagent-01/trustead/pull/3) | feat/b1-contacts-prevouch | Admin self-invite bypass | `b3d939c` |
| [#4](https://github.com/bbagent-01/trustead/pull/4) | feat/b1-contacts-prevouch | B2 (Modes B + C, mode-aware schema) | `760fb95` |
| [#5](https://github.com/bbagent-01/trustead/pull/5) | feat/b1-mode-a-twilio-autosend | Mode A Twilio auto-send | `a3763bb` |
| [#6](https://github.com/bbagent-01/trustead/pull/6) | feat/b1-chooser-polish | Chooser: no preselect, tap-to-advance, brighter text | `92ca19b` |
| [#7](https://github.com/bbagent-01/trustead/pull/7) | feat/b1-cta-and-join-redesign | Dual-CTA + recipient card redesign | `35307e3` |

---

## SMS body shapes (locked, live now)

Three bodies, picked by mode + send-channel:

- **Mode A auto-send (Trustead Twilio → recipient)** — third-person, names sender, STOP footer:
  > Loren just vouched for you on Trustead - a platform for renting your home to people in a trust network. Come check it out and sign up for free at: <url> Reply STOP to opt out.

- **Mode A "Send it myself" + Mode B share-sheet (sender's phone is source)** — first-person, no name:
  > Hey, I just vouched for you on Trustead. Come check it out and sign up for free at: <url>

- **Mode C share-sheet (group context)**:
  > Hey friends! I'm inviting you to this new platform for renting your home to people in a trust network called Trustead. Come check it out and sign up for free at: <url>

Hyphens not em-dashes (keeps body GSM-7, 1 segment instead of UCS-2 4-segment).

---

## What Loren can do today and what's blocked

### Working for Loren end-to-end (admin self-invite bypass active)

  - Pick any of the 3 modes via the chooser
  - Mode A: send invite to his own phone, see SMS arrive from Trustead's Twilio number, see success state in browser
  - Mode A "Send it myself": same flow but skips Twilio, opens his share sheet with the personal-style body
  - Mode B / Mode C: see the share sheet open with the right copy
  - Tap any link to see the redesigned `/join/[token]` recipient card
  - Cancel / resend from `/dashboard/pending-vouches`

### Blocked — needs a real second phone Loren controls

  - Genuine new-user Clerk OTP signup as a recipient
  - Watching the dashboard row flip from Pending → Claimed when a real recipient signs up
  - Mismatch logging (sign up with a different phone than the one targeted)
  - Mode C multi-claim with multiple real users

### Why not Google Voice

Loren tried setting up Google Voice. Hit a Google identity-verification screen labeled with someone else's name (his cousin's wife "Lauren Thomas"). We chose not to chase that rabbit hole. Fallback options if it ever becomes critical:

1. Buy a Twilio number on Loren's existing account, configure SMS forwarding to his iPhone (~$1.15/mo, ~15 min config)
2. Try TextNow / TextFree iOS apps (free, no ID verification)
3. Borrow a friend's phone for a one-time test

DB-side simulation has already verified the claim flows for all three modes — the only gap is real Clerk OTP delivery, which is platform-vendor plumbing that's been deployed and used elsewhere in the app.

---

## Architecture quick reference

### `pending_vouches` table (migrations 047 + 048)

```
id, sender_id, mode ('phone' | 'open_individual' | 'open_group')
recipient_name (nullable, required for phone+open_individual)
recipient_phone (nullable, required for mode='phone' status='pending')
group_label (nullable, required for mode='open_group')
max_claims (nullable, required 2..50 for open_group)
claim_count (default 0, atomic via increment_pending_vouch_claim_count RPC)
vouch_type, years_known_bucket, rating_stake
token (unique, ~32 char base64url)
status ('pending' | 'claimed' | 'canceled' | 'expired')
created_at, expires_at (default +30d)
claimed_by, claimed_at
```

CHECK constraints enforce: phone↔mode invariants, label↔mode invariants, max_claims range, claim_count range, recipient_name length.

### Claim flow per mode

- **Mode A**: webhook auto-claims by phone match → vouch row created. /complete is the safety net (token-based) and mismatch logger.
- **Mode B**: webhook ignores (NULL phone). /complete claims by token, single-shot. Status flips to 'claimed'.
- **Mode C**: webhook ignores. /complete claims by token; row stays 'pending' across multiple claims; `claim_count` bumps via `increment_pending_vouch_claim_count` RPC (race-safe). Cap enforced via DB CHECK and RPC predicate.

### `vouches.from_pending_vouch_id`

Set on every claimed vouch (all three modes). Drives the "from open link — review?" badge on `/dashboard/network` for Mode B/C vouches — sender's safety valve to revoke if the wrong person claimed.

### Files of note

- `supabase/migrations/047_pending_vouches.sql`
- `supabase/migrations/048_pending_vouches_modes.sql`
- `src/app/api/pending-vouches/create/route.ts` — three-mode-aware POST + Twilio auto-send + skipAutoSend bypass
- `src/app/api/pending-vouches/[id]/route.ts` — DELETE (cancel + scrub phone)
- `src/app/api/cron/expire-pending-vouches/route.ts` — sweeper
- `src/app/api/webhooks/clerk/route.ts` — extended `claimPendingVouches()` for phone-mode
- `src/app/(app)/invite/share/page.tsx` — chooser + 3 mode forms + ShareStep
- `src/app/(app)/dashboard/pending-vouches/page.tsx` — sender management list (server component)
- `src/components/invite/pending-vouches-list.tsx` — list rows + cancel + resend (client)
- `src/components/invite/InviteAcceptCard.tsx` — recipient card (just redesigned)
- `src/app/join/[token]/page.tsx` — token dispatch (invites table OR pending_vouches)
- `src/app/join/[token]/complete/page.tsx` — mode-aware `consumePendingVouch`
- `src/lib/sms/send-pending-vouch.ts` — Twilio helper, body-as-param
- `src/lib/network-data.ts` — adds `from_open_link` flag to NetworkPerson
- `src/components/trust/network-section.tsx` — "from open link — review?" badge UI

---

## Known minor issues / nice-to-haves

  - The `.next/types/validator.ts` cache occasionally references stale sandbox routes — pre-existing, doesn't affect deployment
  - Resend on a Mode A row currently uses the share-sheet (not Twilio re-send). If Loren ever wants to re-trigger Twilio specifically, that's an unbuilt option.
  - Mismatch reconciliation tooling (admin view of `pending_vouch_mismatch_events`) is deferred per original B1 spec
  - Open-mode rows count toward the 20-active-per-sender cap — could be relaxed if it becomes a friction point
  - The `vouches.from_pending_vouch_id` column doesn't have an FK→pending_vouches relationship in PostgREST cache; the `network-data.ts` query does a two-step join to work around it. Reloading PostgREST schema would let us inline the join.

---

## What might come next

Loren has been iterating on UX live. Likely follow-up areas (no commitment yet):

  - End-to-end test once Loren gets a working second-phone path
  - More copy/visual polish on the recipient card (logo sizing, tagline tone, CTA hierarchy)
  - Possible Mode A Resend → Twilio re-send button on the dashboard
  - Possible "send invite via existing-member chooser" flow for users who do exist but haven't been searched for
  - Capacitor contact-picker for beta (not alpha)

---

## Pick-up checklist for the next session

1. Read this file. The full plan-mode write-up that drove the B2 work is at [`~/.claude/plans/ok-that-all-went-melodic-lake.md`](~/.claude/plans/ok-that-all-went-melodic-lake.md).
2. Working dir: `~/Claude/Projects/trustead-b1` (worktree on branch `feat/b1-cta-and-join-redesign`, recently merged to main)
3. The `.env.local` for the worktree is NOT committed — the canonical one lives at `~/Claude/Projects/trustead/.env.local` and gets copied into the worktree only when running the dev server, then deleted
4. Supabase Management API access: `SUPABASE_ACCESS_TOKEN` is in the env file. Project ref: `ldoueidykjeglqndbaev`
5. Cloudflare creds: `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` are in Loren's shell env (`zsh -ic 'echo $X'`)
6. Deploy flow: branch → PR → merge to main → auto-deploys via `.github/workflows/deploy-prod.yml`. Cron worker has its own `wrangler deploy` from `cron-worker-prod/`.
7. The `feat/b1-contacts-prevouch` branch and its descendants are all merged. Future work should branch from `main`.
