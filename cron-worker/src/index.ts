/**
 * One Degree BNB — hourly reminder cron worker.
 *
 * Cloudflare Pages doesn't natively support cron triggers, so this tiny
 * standalone Worker is the only piece of cron infrastructure. Every hour
 * (minute :07) it POSTs to the Pages app's /api/cron/check-reminders
 * endpoint with a shared secret header. All business logic lives in the
 * Pages app — this worker is just the trigger.
 *
 * Bound vars (set in wrangler.toml [vars]):
 *   - TARGET_URL: full URL of the cron endpoint
 *
 * Bound secrets (set with `wrangler secret put`):
 *   - CRON_SECRET: shared with the Pages app's CRON_SECRET env var
 */

export interface Env {
  TARGET_URL: string;
  CRON_SECRET: string;
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(fire(env));
  },

  // Manual trigger via fetch (handy for one-off testing from a browser
  // with the secret in the header). Same auth as the cron path.
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.headers.get("x-cron-secret") !== env.CRON_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
    const result = await fire(env);
    return Response.json(result);
  },
} satisfies ExportedHandler<Env>;

async function fire(env: Env) {
  const startedAt = new Date().toISOString();
  try {
    const res = await fetch(env.TARGET_URL, {
      method: "POST",
      headers: {
        "x-cron-secret": env.CRON_SECRET,
        "content-type": "application/json",
      },
      body: JSON.stringify({ source: "cron-worker", at: startedAt }),
    });
    const text = await res.text();
    console.log(
      `[cron-worker] ${startedAt} POST ${env.TARGET_URL} → ${res.status}\n${text.slice(0, 1000)}`
    );
    return { ok: res.ok, status: res.status, body: text.slice(0, 2000) };
  } catch (e) {
    console.error(`[cron-worker] ${startedAt} fetch failed:`, e);
    return { ok: false, error: String(e) };
  }
}
