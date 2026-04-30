/**
 * Demo-account write block (B6 partial).
 *
 * Stop-gap to prevent a real (non-test) user from creating
 * relationships with seeded demo accounts. The demo accounts will
 * never reply and the relationship rows pollute the trust graph.
 *
 * One-way block (asymmetric): only `target.is_test=true AND
 * requester.is_test=false` returns 403. The reverse direction (Loren
 * impersonating a demo account to message a real tester) stays open
 * so admin testing flows still work. Demo↔demo and real↔real both
 * pass through.
 *
 * READ paths are intentionally NOT filtered here — Loren wants demo
 * accounts visible. The visible-labeling UI ([DEMO] pills) ships in
 * a later session. Until then this helper is the only safety net
 * keeping testers from accidentally writing into demo accounts.
 *
 * Service-role only (relies on getSupabaseAdmin to read the
 * is_test_user column on a non-RLS users table).
 */

import { getSupabaseAdmin } from "./supabase";

export const DEMO_BLOCK_RESPONSE = () =>
  Response.json({ error: "demo_account_blocked" }, { status: 403 });

/**
 * Loads both users' is_test_user flags in one round-trip and returns a
 * 403 Response if the requester+target pair crosses the demo boundary.
 * Returns null when the write should proceed.
 */
export async function blockIfDemoMix(
  requesterUserId: string,
  targetUserId: string
): Promise<Response | null> {
  if (!requesterUserId || !targetUserId) return null;
  if (requesterUserId === targetUserId) return null;

  const supabase = getSupabaseAdmin();
  const { data: rows } = await supabase
    .from("users")
    .select("id, is_test_user")
    .in("id", [requesterUserId, targetUserId]);

  if (!rows || rows.length < 2) return null;

  const requester = rows.find(
    (r: { id: string; is_test_user: boolean | null }) => r.id === requesterUserId
  );
  const target = rows.find(
    (r: { id: string; is_test_user: boolean | null }) => r.id === targetUserId
  );
  if (!requester || !target) return null;

  const requesterIsTest = Boolean(requester.is_test_user);
  const targetIsTest = Boolean(target.is_test_user);

  // Asymmetric: only block real-user → demo-user writes. The reverse
  // path (demo → real) stays open so admin/impersonation testing
  // flows can still write back to real testers from a demo account.
  if (targetIsTest && !requesterIsTest) {
    return DEMO_BLOCK_RESPONSE();
  }
  return null;
}
