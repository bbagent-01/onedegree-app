// REMOVE BEFORE BETA — see CC-Dev1 recap. All files in
// src/lib/impersonation/, src/components/admin/Impersonation*.tsx, and
// src/app/api/admin/impersonate/ delete together. Env vars IMPERSONATION_*
// and the impersonation_log table + is_test_user column must also be removed.
//
// Server-only module. Never import from a client component.

import "server-only";
import { cookies, headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase";

const COOKIE_NAME = "imp_user_id";
// 12h is long enough for a dev session but short enough that a
// forgotten browser tab eventually self-expires.
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;

export const IMPERSONATION_COOKIE_NAME = COOKIE_NAME;

/**
 * Gate 1: feature flag. `NEXT_PUBLIC_ENABLE_IMPERSONATION` is the
 * sole runtime kill-switch — when it's not literally `"true"` every
 * impersonation code path returns 404 / null. Cloudflare Pages runs
 * Next.js with `NODE_ENV=production` at runtime even on the alpha-c
 * deploy, so we cannot use NODE_ENV as a gate — doing so would
 * disable impersonation on the alpha env where we actually need it.
 * The real prod/alpha distinction is: prod deploys leave this
 * variable unset. Deliberately documented here so the trade-off is
 * visible to future readers.
 */
export function isImpersonationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_IMPERSONATION === "true";
}

/** Gate 3: Clerk user ID must be in the admin allowlist. */
export function isAdmin(clerkUserId: string | null | undefined): boolean {
  if (!clerkUserId) return false;
  const raw = process.env.IMPERSONATION_ADMIN_USER_IDS ?? "";
  if (!raw) return false;
  const allowlist = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allowlist.includes(clerkUserId);
}

/** All three gates at once. Use this as the top-line API route guard. */
export function passesTripleGate(clerkUserId: string | null | undefined): boolean {
  return isImpersonationEnabled() && isAdmin(clerkUserId);
}

// ── HMAC cookie signing (Web Crypto — works in both edge and node) ──

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

async function hmacHex(payload: string): Promise<string> {
  const secret = process.env.IMPERSONATION_COOKIE_SECRET;
  if (!secret) {
    throw new Error(
      "IMPERSONATION_COOKIE_SECRET is not set — cannot sign impersonation cookie"
    );
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return bytesToHex(new Uint8Array(sig));
}

async function signPayload(userId: string): Promise<string> {
  const sig = await hmacHex(userId);
  return `${userId}.${sig}`;
}

async function verifyPayload(payload: string): Promise<string | null> {
  const dot = payload.lastIndexOf(".");
  if (dot <= 0 || dot === payload.length - 1) return null;
  const userId = payload.slice(0, dot);
  const sig = payload.slice(dot + 1);
  let expected: string;
  try {
    expected = await hmacHex(userId);
  } catch {
    return null;
  }
  if (sig.length !== expected.length) return null;
  // Constant-time compare — loop every byte regardless of mismatch.
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0 ? userId : null;
}

// ── Cookie read / write ──

export async function getImpersonatedUserId(): Promise<string | null> {
  if (!isImpersonationEnabled()) return null;
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return await verifyPayload(raw);
}

/**
 * Sets the signed impersonation cookie AND inserts an audit row.
 * Caller is responsible for re-validating the admin gate first — we
 * do it here too as defense in depth.
 */
export async function setImpersonation(
  clerkAdminId: string,
  targetUserId: string
): Promise<void> {
  if (!passesTripleGate(clerkAdminId)) {
    throw new Error("Impersonation gate failed");
  }

  const supabase = getSupabaseAdmin();
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = hdrs.get("user-agent") ?? null;

  // Close any still-open sessions for this admin — avoids stacked
  // "active" rows when they switch without explicitly stopping.
  await supabase
    .from("impersonation_log")
    .update({ ended_at: new Date().toISOString() })
    .eq("admin_user_id", clerkAdminId)
    .is("ended_at", null);

  await supabase.from("impersonation_log").insert({
    admin_user_id: clerkAdminId,
    impersonated_user_id: targetUserId,
    ip_address: ip,
    user_agent: ua,
    action_type: "impersonate",
  });

  const signed = await signPayload(targetUserId);
  const jar = await cookies();
  jar.set(COOKIE_NAME, signed, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearImpersonation(
  clerkAdminId: string | null
): Promise<void> {
  if (clerkAdminId) {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("impersonation_log")
      .update({ ended_at: new Date().toISOString() })
      .eq("admin_user_id", clerkAdminId)
      .is("ended_at", null);
  }
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

// ── Identity shim ──

/**
 * Returns the DB `users.id` that downstream code should treat as the
 * current actor. If impersonation is active, gated, and the caller
 * is a verified admin, returns the impersonated user. Otherwise
 * resolves the real Clerk id via the users table.
 *
 * Returns null if the caller isn't signed in or isn't in the users
 * table yet (e.g. mid-onboarding).
 */
export async function getEffectiveUserId(
  realClerkId: string | null | undefined
): Promise<string | null> {
  if (!realClerkId) return null;

  if (passesTripleGate(realClerkId)) {
    const impersonated = await getImpersonatedUserId();
    if (impersonated) return impersonated;
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", realClerkId)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Returns `{ realUserId, effectiveUserId, isImpersonating }` — useful
 * for components that want to show impersonation state and still know
 * the true admin identity for audit-style badges.
 */
export async function getIdentityState(
  realClerkId: string | null | undefined
): Promise<{
  realUserId: string | null;
  effectiveUserId: string | null;
  isImpersonating: boolean;
}> {
  if (!realClerkId) {
    return { realUserId: null, effectiveUserId: null, isImpersonating: false };
  }
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", realClerkId)
    .maybeSingle();
  const realUserId = data?.id ?? null;

  if (!passesTripleGate(realClerkId)) {
    return { realUserId, effectiveUserId: realUserId, isImpersonating: false };
  }

  const impersonated = await getImpersonatedUserId();
  if (impersonated && impersonated !== realUserId) {
    return {
      realUserId,
      effectiveUserId: impersonated,
      isImpersonating: true,
    };
  }
  return { realUserId, effectiveUserId: realUserId, isImpersonating: false };
}
