/**
 * Trustead — hourly cron worker.
 *
 * Cloudflare Pages doesn't natively support cron triggers, so this tiny
 * standalone Worker is the only piece of cron infrastructure. Every hour
 * (minute :07) it POSTs to one or more cron endpoints on the Pages app
 * with a shared secret header. All business logic lives in the Pages app
 * — this worker is just the trigger.
 *
 * Currently fans out to:
 *   /api/cron/check-reminders     — hourly check-in + review sweep
 *   /api/cron/payment-due         — daily payment_due window opener
 *   /api/cron/expire-proposals    — flips lapsed proposals to expired
 *   /api/cron/recompute-trust-v2  — Trust v2 user-score recompute
 *                                   (self-throttles to ~once/day via
 *                                   last_score_computed_at staleness)
 *
 * All endpoints are safe to fire hourly: payment-due is idempotent,
 * expire-proposals is filtered by status+expires_at, and
 * recompute-trust-v2 short-circuits when last_score_computed_at is
 * fresher than TRUST_RECOMPUTE_STALE_HOURS.
 *
 * Bound vars (set in wrangler.toml [vars]):
 *   - TARGET_URL: base URL of the Pages app (e.g. https://alpha-c.onedegreebnb.com)
 *
 * Bound secrets (set with `wrangler secret put`):
 *   - CRON_SECRET: shared with the Pages app's CRON_SECRET env var
 */

export interface Env {
  TARGET_URL: string;
  CRON_SECRET: string;
}

const CRON_PATHS = [
  "/api/cron/check-reminders",
  "/api/cron/payment-due",
  "/api/cron/expire-proposals",
  "/api/cron/recompute-trust-v2",
];

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(fireAll(env));
  },

  // Manual trigger via fetch (handy for one-off testing from a browser
  // with the secret in the header). Same auth as the cron path.
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.headers.get("x-cron-secret") !== env.CRON_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
    const result = await fireAll(env);
    return Response.json(result);
  },
} satisfies ExportedHandler<Env>;

async function fireAll(env: Env) {
  const startedAt = new Date().toISOString();
  // Legacy TARGET_URL: if it already points at a specific path (old
  // deploys set it to the full check-reminders URL), use its origin
  // as the base so we don't double-suffix.
  const base = (() => {
    try {
      return new URL(env.TARGET_URL).origin;
    } catch {
      return env.TARGET_URL.replace(/\/$/, "");
    }
  })();
  const results: Record<string, unknown> = {};
  for (const path of CRON_PATHS) {
    results[path] = await fireOne(env, `${base}${path}`, startedAt);
  }
  return { at: startedAt, results };
}

async function fireOne(env: Env, url: string, startedAt: string) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-cron-secret": env.CRON_SECRET,
        "content-type": "application/json",
      },
      body: JSON.stringify({ source: "cron-worker", at: startedAt }),
    });
    const text = await res.text();
    console.log(
      `[cron-worker] ${startedAt} POST ${url} → ${res.status}\n${text.slice(0, 1000)}`
    );
    return { ok: res.ok, status: res.status, body: text.slice(0, 2000) };
  } catch (e) {
    console.error(`[cron-worker] ${startedAt} fetch failed:`, e);
    return { ok: false, error: String(e) };
  }
}
