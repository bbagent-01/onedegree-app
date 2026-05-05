export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

const DISMISS_DAYS = 30;

/**
 * Soft-dismiss an incoming vouch from the vouch-back section for
 * `DISMISS_DAYS` days. The row resurfaces automatically on the
 * /dashboard network section once expires_at is in the past —
 * filtering happens at query time, no cron cleanup needed.
 */
export async function POST(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const voucherId = body?.voucherId;
  if (typeof voucherId !== "string" || !voucherId) {
    return new Response("Missing voucherId", { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) {
    return new Response("User not found", { status: 404 });
  }

  if (currentUser.id === voucherId) {
    return new Response("Cannot dismiss self", { status: 400 });
  }

  // Sanity check: the voucher must actually have vouched the current
  // user. Prevents arbitrary row insertion. Demo-origin (B8) excluded
  // — auto-vouches don't surface in the vouch-back section so a
  // dismissal request for one is malformed.
  const { data: vouch } = await supabase
    .from("vouches")
    .select("id")
    .eq("voucher_id", voucherId)
    .eq("vouchee_id", currentUser.id)
    .eq("is_demo_origin", false)
    .maybeSingle();
  if (!vouch) {
    return new Response("No incoming vouch from that user", { status: 400 });
  }

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + DISMISS_DAYS * 24 * 60 * 60 * 1000
  );

  // Upsert so repeat clicks (e.g. if the row didn't clear client-side)
  // just bump the expiry forward rather than returning a unique-key
  // violation.
  const { error } = await supabase
    .from("vouch_back_dismissals")
    .upsert(
      {
        user_id: currentUser.id,
        voucher_id: voucherId,
        dismissed_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "user_id,voucher_id" }
    );

  if (error) {
    console.error("vouch-back dismiss upsert error:", error);
    return new Response("Failed to dismiss", { status: 500 });
  }

  return Response.json({ ok: true });
}
