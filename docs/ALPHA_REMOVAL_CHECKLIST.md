# Alpha Removal Checklist

The impersonation switcher shipped in **CC-Dev1** is alpha-only and **must be
fully removed before beta**. This file documents every removal step so a
single PR can delete it cleanly.

Success criterion: after removal, `grep -rni "impersonation" src/ supabase/ docs/`
returns **zero hits**.

---

## 1. Delete source files (whole directories / groups)

- [ ] `rm -rf src/lib/impersonation/`
- [ ] `rm -rf src/app/api/admin/impersonate/`
- [ ] `rm src/components/admin/ImpersonationSwitcher.tsx`
- [ ] `rm src/components/admin/ImpersonationBar.tsx`
- [ ] `rm src/components/admin/ImpersonationMount.tsx`
- [ ] `rmdir src/components/admin` *(only if directory is empty after the above)*

### Dev2 (design system page) — same removal sweep

- [ ] `rm -rf src/app/dev/design-system/`
- [ ] `rm -rf src/components/dev/`
- [ ] `rm -rf src/lib/dev-theme/`
- [ ] `rmdir src/app/dev` *(only if directory is empty after the above)*

## 2. Revert call-site shims

All shims import `getEffectiveUserId` from `@/lib/impersonation/session`
and call it in place of the clerk_id→users.id lookup. Remove the
import + restore the original lookup in each file:

- [ ] `src/app/(app)/browse/page.tsx` — drop the `getEffectiveUserId`
      import, restore `getInternalUserIdFromClerk(clerkId)` call.
- [ ] `src/app/(app)/listings/[id]/page.tsx` — drop the
      `getEffectiveUserId` import, restore
      `getInternalUserIdFromClerk(clerkId)` call.
- [ ] `src/app/(app)/profile/[id]/page.tsx` — same pattern.
- [ ] `src/lib/network-data.ts` — drop the `getEffectiveUserId` import,
      revert `getNetworkData()` to look up by `clerk_id` directly.
- [ ] `src/app/api/users/me/route.ts` — drop the `getEffectiveUserId`
      import, restore `runtime = "edge"`, restore
      `.eq("clerk_id", userId)` lookup.

## 3. Revert middleware

- [ ] `src/middleware.ts` → delete the `IMPERSONATION_COOKIE` block
      (const + `impersonationEnabled()` + `isAdminId()` helpers) and
      the cookie-strip `if` inside `clerkMiddleware(...)`. Restore the
      original `const { userId, redirectToSignIn } = await auth();`
      pattern inside the `!isPublicRoute(req)` branch — no need to
      resolve `userId` outside that branch.

## 4. Revert `(app)/layout.tsx`

- [ ] Drop the `isImpersonationEnabled` import and the dynamic-import
      block that renders `<ImpersonationMount />`. Make the component
      sync again (no `async`).
- [ ] Drop the Dev2 `SandboxMount` dynamic import + `{sandboxMount}`
      JSX in the same block — comment-tagged `REMOVE BEFORE BETA (Dev2)`.

## 5. Drop DB objects

Ordering matters — export first, then drop child objects before parents.

- [ ] **Export audit log** (compliance bread-crumb):
      `\copy (SELECT * FROM impersonation_log ORDER BY started_at)
      TO 'impersonation_log_export.csv' WITH CSV HEADER;`
- [ ] `DROP TRIGGER vouches_test_real_isolation ON vouches;`
- [ ] `DROP TRIGGER message_threads_test_real_isolation ON message_threads;`
- [ ] `DROP TRIGGER contact_requests_test_real_isolation ON contact_requests;`
- [ ] `DROP TRIGGER stay_confirmations_test_real_isolation ON stay_confirmations;`
- [ ] `DROP TRIGGER incidents_test_real_isolation ON incidents;`
- [ ] `DROP FUNCTION trg_isolation_vouches;`
- [ ] `DROP FUNCTION trg_isolation_message_threads;`
- [ ] `DROP FUNCTION trg_isolation_contact_requests;`
- [ ] `DROP FUNCTION trg_isolation_stay_confirmations;`
- [ ] `DROP FUNCTION trg_isolation_incidents;`
- [ ] `DROP FUNCTION check_test_real_isolation;`
- [ ] `DROP TABLE impersonation_log;`
- [ ] `DELETE FROM users WHERE is_test_user = true;`  *(scrub all test rows first)*
- [ ] `DROP INDEX idx_users_is_test_user;`
- [ ] `ALTER TABLE users DROP COLUMN is_test_user;`

Bundle these as a single migration file (e.g. `0NN_remove_impersonation.sql`).

## 6. Env vars

Per-environment (local, each CI runner, Cloudflare Pages preview, Cloudflare
Pages production):

- [ ] Remove `NEXT_PUBLIC_ENABLE_IMPERSONATION`
- [ ] Remove `IMPERSONATION_ADMIN_USER_IDS`
- [ ] Remove `IMPERSONATION_COOKIE_SECRET`
- [ ] Remove the same 3 entries from `.env.example`

## 7. Seed script

- [ ] `scripts/seed-host-graph.ts` → drop the `is_test_user: true`
      field from the upsert payload + the explanatory comment.

## 8. Docs

- [ ] Delete this file: `rm docs/ALPHA_REMOVAL_CHECKLIST.md`
- [ ] Remove the CC-Dev1 entry from any session log / handoff markdown
      once it's purely historical (optional — handoffs can stay).

## 9. Verification

- [ ] `grep -rni "impersonation" src/ supabase/ docs/ scripts/ .env.example`
      returns **zero hits**.
- [ ] `grep -rni "is_test_user" src/ supabase/ docs/ scripts/` returns **zero hits**.
- [ ] `npm run build` succeeds.
- [ ] Deploy to alpha-c; confirm no 404s, no console errors, no
      residual purple bar in the DOM.
