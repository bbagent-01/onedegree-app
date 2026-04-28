/**
 * GET /api/health — pre-launch health probe (S11.pre.1).
 *
 * Single public endpoint that confirms every critical env var is set
 * and that each external provider authenticates. Built because the
 * S9c.0 incident showed RESEND_API_KEY was silently missing in prod
 * for weeks (the email lib log-fallback hid the failure). S11 Task 0
 * uses this output as a hard gate before launch.
 *
 * Response NEVER includes secret values — only `present` / `missing`.
 */

// Cloudflare Pages requires edge runtime; nodejs API routes silently
// 404 on deploy via @cloudflare/next-on-pages (see S10.7 fix, commit
// 4ef81e2). All provider pings use native fetch — edge-safe.
export const runtime = "edge";

const PING_TIMEOUT_MS = 3_000;

type EnvStatus = "present" | "missing" | "using-default";
type ProviderName = "resend" | "clerk" | "twilio" | "supabase";

type ProviderResult = { auth_ok: boolean; error?: string };

type HealthResponse = {
  status: "ok" | "degraded";
  timestamp: string;
  env: Record<string, EnvStatus>;
  providers: Record<ProviderName, ProviderResult>;
};

// Each entry MUST reference process.env.FOO with a static literal name.
// Next.js inlines NEXT_PUBLIC_* vars at build time only when statically
// referenced — `process.env[dynamicName]` returns undefined at runtime
// on Cloudflare Pages edge for those keys, so a dynamic loop would
// produce false "missing" reports for vars that are actually present
// (the providers ping fine using the same vars below).
const REQUIRED_ENV: Array<readonly [string, string | undefined]> = [
  ["RESEND_API_KEY", process.env.RESEND_API_KEY],
  ["CLERK_SECRET_KEY", process.env.CLERK_SECRET_KEY],
  [
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  ],
  ["TWILIO_ACCOUNT_SID", process.env.TWILIO_ACCOUNT_SID],
  ["TWILIO_AUTH_TOKEN", process.env.TWILIO_AUTH_TOKEN],
  ["TWILIO_PHONE_NUMBER", process.env.TWILIO_PHONE_NUMBER],
  ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
  [
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ],
  ["SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY],
  ["CRON_SECRET", process.env.CRON_SECRET],
  // S11.pre.3 diagnostic: impersonation switcher returns 404 even
  // though /pages/projects API confirms both vars set in production
  // env_vars. Surfacing presence here will tell us whether the
  // variables actually bind to process.env at edge runtime.
  [
    "NEXT_PUBLIC_ENABLE_IMPERSONATION",
    process.env.NEXT_PUBLIC_ENABLE_IMPERSONATION,
  ],
  ["IMPERSONATION_ADMIN_USER_IDS", process.env.IMPERSONATION_ADMIN_USER_IDS],
  ["IMPERSONATION_COOKIE_SECRET", process.env.IMPERSONATION_COOKIE_SECRET],
];

// TRUST_VOUCH_K is the only trust-config var actually read from env
// (config.ts line 14). The other TRUST_* constants are hardcoded in
// code — including them would always read "missing" and produce false
// alarms. If they ever become env-configurable, add them here.
const OPTIONAL_ENV_WITH_DEFAULT: Array<readonly [string, string | undefined]> = [
  ["TRUST_VOUCH_K", process.env.TRUST_VOUCH_K],
];

function statusOf(value: string | undefined): "present" | "missing" {
  return value != null && value.length > 0 ? "present" : "missing";
}

function optionalStatusOf(
  value: string | undefined
): "present" | "using-default" {
  return value != null && value.length > 0 ? "present" : "using-default";
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await p;
  } finally {
    clearTimeout(timer);
  }
}

async function pingResend(): Promise<ProviderResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { auth_ok: false, error: "RESEND_API_KEY missing" };
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });
    if (res.ok) return { auth_ok: true };
    return {
      auth_ok: false,
      error: `HTTP ${res.status} ${res.statusText}`.trim(),
    };
  } catch (e) {
    return { auth_ok: false, error: errorMessage(e) };
  }
}

async function pingClerk(): Promise<ProviderResult> {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) return { auth_ok: false, error: "CLERK_SECRET_KEY missing" };
  try {
    // Clerk Backend API — cheap auth probe. limit=1 keeps the response
    // small. fetch is edge-safe; avoids importing clerkClient just for
    // a credential check.
    const res = await fetch("https://api.clerk.com/v1/users?limit=1", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });
    if (res.ok) return { auth_ok: true };
    return {
      auth_ok: false,
      error: `HTTP ${res.status} ${res.statusText}`.trim(),
    };
  } catch (e) {
    return { auth_ok: false, error: errorMessage(e) };
  }
}

async function pingTwilio(): Promise<ProviderResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return {
      auth_ok: false,
      error: "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN missing",
    };
  }
  try {
    const auth = btoa(`${sid}:${token}`);
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}.json`,
      {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(PING_TIMEOUT_MS),
      }
    );
    if (res.ok) return { auth_ok: true };
    return {
      auth_ok: false,
      error: `HTTP ${res.status} ${res.statusText}`.trim(),
    };
  } catch (e) {
    return { auth_ok: false, error: errorMessage(e) };
  }
}

async function pingSupabase(): Promise<ProviderResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return {
      auth_ok: false,
      error: "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing",
    };
  }
  try {
    // PostgREST tiny select against users (always exists). Service
    // role bypasses RLS, so a 200 confirms credentials + reachability.
    const res = await fetch(`${url}/rest/v1/users?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });
    if (res.ok) return { auth_ok: true };
    return {
      auth_ok: false,
      error: `HTTP ${res.status} ${res.statusText}`.trim(),
    };
  } catch (e) {
    return { auth_ok: false, error: errorMessage(e) };
  }
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === "TimeoutError" || e.name === "AbortError") {
      return `timeout after ${PING_TIMEOUT_MS}ms`;
    }
    return e.message || e.name;
  }
  return String(e);
}

export async function GET(): Promise<Response> {
  const env: Record<string, EnvStatus> = {};
  for (const [name, value] of REQUIRED_ENV) env[name] = statusOf(value);
  for (const [name, value] of OPTIONAL_ENV_WITH_DEFAULT) {
    env[name] = optionalStatusOf(value);
  }

  const [resend, clerk, twilio, supabase] = await Promise.all([
    withTimeout(pingResend(), PING_TIMEOUT_MS + 500),
    withTimeout(pingClerk(), PING_TIMEOUT_MS + 500),
    withTimeout(pingTwilio(), PING_TIMEOUT_MS + 500),
    withTimeout(pingSupabase(), PING_TIMEOUT_MS + 500),
  ]);

  const providers = { resend, clerk, twilio, supabase };

  const allEnvOk = Object.values(env).every(
    (s) => s === "present" || s === "using-default"
  );
  const allProvidersOk = Object.values(providers).every((p) => p.auth_ok);

  const body: HealthResponse = {
    status: allEnvOk && allProvidersOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    env,
    providers,
  };

  return Response.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
