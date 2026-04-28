export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * Returns all undelivered vouch_back_notifications for the current
 * user + marks them delivered in the same round-trip. The client-side
 * toaster calls this on mount and renders a toast per row. Marking
 * them delivered here (rather than after the toast renders) keeps the
 * API idempotent — repeat calls don't re-emit the same toast.
 */
export async function POST() {
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ notifications: [] });

  const supabase = getSupabaseAdmin();

  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!currentUser) return Response.json({ notifications: [] });

  const { data: rows } = await supabase
    .from("vouch_back_notifications")
    .select("id, vouched_back_by_id, created_at")
    .eq("user_id", currentUser.id)
    .is("delivered_at", null)
    .order("created_at", { ascending: true })
    .limit(20);

  if (!rows || rows.length === 0) {
    return Response.json({ notifications: [] });
  }

  const voucherIds = Array.from(
    new Set(rows.map((r) => r.vouched_back_by_id as string))
  );
  const { data: voucherRows } = await supabase
    .from("users")
    .select("id, name")
    .in("id", voucherIds);
  const nameById = new Map(
    (voucherRows ?? []).map((u) => [u.id as string, (u.name as string) ?? ""])
  );

  const ids = rows.map((r) => r.id as string);
  await supabase
    .from("vouch_back_notifications")
    .update({ delivered_at: new Date().toISOString() })
    .in("id", ids);

  return Response.json({
    notifications: rows.map((r) => ({
      id: r.id,
      userId: r.vouched_back_by_id,
      userName: nameById.get(r.vouched_back_by_id as string) ?? "Someone",
    })),
  });
}
