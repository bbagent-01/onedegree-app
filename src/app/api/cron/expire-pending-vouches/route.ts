export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/cron/expire-pending-vouches
 *
 * Called hourly by the cron-worker. Flips any pending_vouches row
 * past expires_at into 'expired' AND scrubs recipient_phone in the
 * same UPDATE statement (the phone CHECK constraint on the table
 * means this is the only valid way to do it).
 *
 * Idempotent: a second pass on the same data is a no-op because the
 * WHERE filters on status='pending'.
 *
 * Auth via the same x-cron-secret header pattern used by the other
 * /api/cron/* endpoints.
 */
async function handle(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[cron:expire-pending-vouches] CRON_SECRET not configured");
    return Response.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 }
    );
  }
  if (req.headers.get("x-cron-secret") !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("pending_vouches")
    .update({ status: "expired", recipient_phone: null })
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("[cron:expire-pending-vouches] update failed:", error);
    return Response.json(
      { error: "update failed", message: error.message },
      { status: 500 }
    );
  }

  const count = (data ?? []).length;
  console.log(`[cron:expire-pending-vouches] expired ${count} rows`);
  return Response.json({ expired: count });
}

export async function POST(req: Request) {
  return handle(req);
}
export async function GET(req: Request) {
  return handle(req);
}
