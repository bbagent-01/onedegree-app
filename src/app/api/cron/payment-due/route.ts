export const runtime = "edge";

import { runPaymentDueSweep } from "@/lib/cron-payment-due";

/**
 * POST /api/cron/payment-due
 *
 * Daily sweep — posts payment_due structured messages into the
 * thread for any scheduled payment whose due_at window has opened
 * (today + a 2-day lead).
 *
 * Authenticated via x-cron-secret matching CRON_SECRET. Accepts
 * GET for manual browser-driven testing (same secret header).
 */
async function handle(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[cron/payment-due] CRON_SECRET not configured");
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
    const result = await runPaymentDueSweep();
    console.log("[cron/payment-due] sweep complete:", JSON.stringify(result));
    return Response.json(result);
  } catch (e) {
    console.error("[cron/payment-due] sweep failed:", e);
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
