export const runtime = "edge";

import { runReminderSweep } from "@/lib/cron-reminders";

/**
 * POST /api/cron/check-reminders
 *
 * Called hourly by the standalone Cloudflare Worker (cron-worker/) with
 * an x-cron-secret header that matches CRON_SECRET. Runs the reminder
 * sweep and returns a JSON summary of what fired.
 *
 * Also accepts GET so we can hit it from a browser to test (with the same
 * header). Never expose this without the secret check.
 */
async function handle(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[cron] CRON_SECRET not configured");
    return Response.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 }
    );
  }
  const provided = req.headers.get("x-cron-secret");
  if (provided !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runReminderSweep();
    console.log("[cron] sweep complete:", JSON.stringify(result));
    return Response.json(result);
  } catch (e) {
    console.error("[cron] sweep failed:", e);
    return Response.json(
      { error: "Sweep failed", message: String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
