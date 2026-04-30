export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * DELETE /api/pending-vouches/[id]
 *
 * Cancel a pending vouch. Flips status='canceled' AND scrubs
 * recipient_phone to NULL in the same UPDATE so the privacy
 * scrub never falls behind the status change. The phone CHECK
 * constraint on the table also enforces this — any UPDATE that
 * sets status='canceled' but leaves the phone non-null will
 * fail at the DB layer.
 *
 * Only the original sender can cancel their own row. Cancelling
 * is idempotent: if the row is already canceled/expired/claimed,
 * returns 200 with no-op (we don't want to leak whether a row
 * exists with a 404 vs. 403 path).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: sender } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();
  if (!sender) return new Response("User not found", { status: 404 });

  // Only flip rows that are still pending AND owned by the caller.
  // Combining both filters in the UPDATE means a wrong-id or
  // wrong-owner request silently no-ops — we return 200 either way
  // so the UI's optimistic remove looks the same regardless.
  const { data, error } = await supabase
    .from("pending_vouches")
    .update({ status: "canceled", recipient_phone: null })
    .eq("id", id)
    .eq("sender_id", sender.id)
    .eq("status", "pending")
    .select("id");

  if (error) {
    console.error("[pending-vouches:delete] update error:", error);
    return Response.json({ error: "Failed to cancel." }, { status: 500 });
  }

  return Response.json({ ok: true, canceled: (data ?? []).length });
}
