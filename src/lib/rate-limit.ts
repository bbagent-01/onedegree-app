/**
 * Per-user rate limiting on sensitive write endpoints (R1).
 *
 * Backed by Upstash Redis (REST API — edge-runtime safe). When the
 * env vars are missing (local dev, preview deploy without secrets),
 * limit() returns success: true so the app stays usable; a single
 * console.warn fires on first call so it's obvious in logs.
 *
 * Buckets are keyed by Clerk user ID. Caps mirror the audit's
 * R1 recommendation:
 *   - invite           10 / hour
 *   - contactRequest   20 / hour
 *   - dmMessage        60 / hour
 *   - proposal          5 / hour
 *   - messageThread    20 / hour
 *
 * Loren-must-check (post-merge): create an Upstash Redis instance at
 * https://console.upstash.com/redis , then add to GitHub Secrets +
 * Cloudflare Pages env (production):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 * Same value in both places. Then trigger a fresh deploy.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type LimitName =
  | "invite"
  | "contactRequest"
  | "dmMessage"
  | "proposal"
  | "messageThread";

interface LimitSpec {
  requests: number;
  windowSeconds: number;
}

const LIMITS: Record<LimitName, LimitSpec> = {
  invite: { requests: 10, windowSeconds: 3600 },
  contactRequest: { requests: 20, windowSeconds: 3600 },
  dmMessage: { requests: 60, windowSeconds: 3600 },
  proposal: { requests: 5, windowSeconds: 3600 },
  messageThread: { requests: 20, windowSeconds: 3600 },
};

let _redis: Redis | null = null;
let _warned = false;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!_warned) {
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — rate limits disabled"
      );
      _warned = true;
    }
    return null;
  }
  _redis = new Redis({ url, token });
  return _redis;
}

const _limiters = new Map<LimitName, Ratelimit>();

function getLimiter(name: LimitName): Ratelimit | null {
  const cached = _limiters.get(name);
  if (cached) return cached;
  const redis = getRedis();
  if (!redis) return null;
  const spec = LIMITS[name];
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(spec.requests, `${spec.windowSeconds} s`),
    analytics: false,
    prefix: `rl:${name}`,
  });
  _limiters.set(name, limiter);
  return limiter;
}

export interface LimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(
  name: LimitName,
  key: string
): Promise<LimitResult> {
  if (!key) {
    // No identity to rate-limit on — allow but log.
    console.warn(`[rate-limit] empty key for bucket ${name}`);
    return { success: true, remaining: -1, resetAt: 0 };
  }
  const limiter = getLimiter(name);
  if (!limiter) {
    return { success: true, remaining: -1, resetAt: 0 };
  }
  const res = await limiter.limit(key);
  return {
    success: res.success,
    remaining: res.remaining,
    resetAt: res.reset,
  };
}

/**
 * Returns a 429 Response with Retry-After when the limit is exceeded,
 * or null when allowed. Pattern: `const blocked = await rateLimitOr429(...);
 * if (blocked) return blocked;`
 */
export async function rateLimitOr429(
  name: LimitName,
  key: string
): Promise<Response | null> {
  const result = await checkRateLimit(name, key);
  if (result.success) return null;
  const retryAfter = Math.max(
    1,
    Math.ceil((result.resetAt - Date.now()) / 1000)
  );
  return new Response(JSON.stringify({ error: "rate_limited" }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfter),
    },
  });
}
