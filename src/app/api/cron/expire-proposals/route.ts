export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/cron/expire-proposals
 *
 * Called hourly by the cron-worker. Flips any active proposal whose
 * expires_at has passed into the 'expired' status. Idempotent — a
 * second run on the same data is a no-op because the WHERE filters on
 * status = 'active'.
 */
async function handle(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[cron:expire-proposals] CRON_SECRET not configured");
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
    .from("proposals")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("[cron:expire-proposals] update failed:", error);
    return Response.json(
      { error: "update failed", message: error.message },
      { status: 500 }
    );
  }

  const count = (data ?? []).length;
  console.log(`[cron:expire-proposals] expired ${count} proposals`);
  return Response.json({ expired: count });
}

export async function POST(req: Request) {
  return handle(req);
}
export async function GET(req: Request) {
  return handle(req);
}
