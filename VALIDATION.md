# CC-5.5 Scaffold Validation

> Last updated: April 10, 2026

## Checklist

### Task 1: `.env.local` for local dev
- ✅ Copied from `.env.local.example`
- ✅ Clerk keys populated (publishable, secret, webhook signing secret)
- ✅ Supabase URL + anon key + service role key populated
- ✅ All env vars stored in `~/.zshrc` for rebuild
- ✅ `npm run dev` boots clean on port 3001
- ⬜ `RESEND_API_KEY` left blank (not wired yet)

### Task 2: CF Pages preview env vars
- ✅ Confirmed Production had all 6 vars set
- ✅ Confirmed Preview had 0 vars (root cause of preview deploy crashes)
- ✅ All 6 vars duplicated to Preview environment:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (Text)
  - `CLERK_SECRET_KEY` (Secret)
  - `CLERK_WEBHOOK_SECRET` (Secret)
  - `NEXT_PUBLIC_SUPABASE_URL` (Text)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Text)
  - `SUPABASE_SERVICE_ROLE_KEY` (Secret)

### Task 3: Clerk Pro + phone verification
- ✅ Upgraded to Clerk Pro plan ($25/mo)
- ✅ No add-ons enabled (B2B Auth, Administration, Billing all skipped)
- ✅ Phone number: sign-up enabled
- ✅ Phone number: required at sign-up
- ✅ Phone number: verify at sign-up (SMS code)
- ✅ Restrict phone changes: off (can enable later if needed)
- ✅ Sign-in with phone: off (Google SSO + email is primary auth)

## Ready for CC-6a
All blockers cleared. Schema migration + trust RPCs can proceed.
