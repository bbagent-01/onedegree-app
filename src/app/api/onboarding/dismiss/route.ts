export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * POST /api/onboarding/dismiss
 *
 * Marks the calling user's onboarding takeover as dismissed by
 * stamping users.onboarding_seen_at = now() on the row whose
 * clerk_id matches the caller. Idempotent — repeat calls just bump
 * the timestamp; the gate only checks IS NOT NULL.
 *
 * Service-role write so RLS is bypassed cleanly; we scope it
 * ourselves by the auth-derived clerk_id, so a caller can only ever
 * mark their own row.
 */
export async function POST() {
  const { userId } = await effectiveAuth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("users")
    .update({ onboarding_seen_at: new Date().toISOString() })
    .eq("clerk_id", userId);

  if (error) {
    console.error("[onboarding/dismiss] update failed:", error);
    return Response.json({ error: "Couldn't dismiss" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
