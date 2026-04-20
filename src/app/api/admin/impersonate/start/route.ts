// REMOVE BEFORE BETA — see CC-Dev1 recap. All files in
// src/lib/impersonation/, src/components/admin/Impersonation*.tsx, and
// src/app/api/admin/impersonate/ delete together. Env vars IMPERSONATION_*
// and the impersonation_log table + is_test_user column must also be removed.

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  isImpersonationEnabled,
  isAdmin,
  setImpersonation,
} from "@/lib/impersonation/session";

// Node runtime — Web Crypto is available, and we need `cookies()` +
// `headers()` write access which is cleanest outside edge.
export const runtime = "nodejs";

const gateFailed = () => new Response("Not Found", { status: 404 });

export async function POST(req: Request) {
  // Gate 1 + 2: env. Return 404 so the route is indistinguishable
  // from a non-existent one in production.
  if (!isImpersonationEnabled()) return gateFailed();

  // Gate 3: admin allowlist (re-validated on every request — never
  // trust the cookie).
  const { userId: clerkAdminId } = await auth();
  if (!clerkAdminId || !isAdmin(clerkAdminId)) return gateFailed();

  let body: { targetUserId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const targetUserId = body?.targetUserId;
  if (!targetUserId || typeof targetUserId !== "string") {
    return Response.json({ error: "targetUserId required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: target, error } = await supabase
    .from("users")
    .select("id, name, avatar_url, is_test_user, clerk_id")
    .eq("id", targetUserId)
    .maybeSingle();

  if (error || !target) {
    return Response.json({ error: "Target not found" }, { status: 404 });
  }
  if (!target.is_test_user) {
    // Real users are never impersonable. This is the hard line.
    return Response.json(
      { error: "Only test users can be impersonated" },
      { status: 403 }
    );
  }
  // Double-check: don't let an admin impersonate themselves (no-op
  // that would still write an audit row and confuse the UI).
  if (target.clerk_id && target.clerk_id === clerkAdminId) {
    return Response.json(
      { error: "Cannot impersonate yourself" },
      { status: 400 }
    );
  }

  await setImpersonation(clerkAdminId, targetUserId);

  return Response.json({
    ok: true,
    user: {
      id: target.id,
      name: target.name,
      avatar_url: target.avatar_url,
    },
  });
}
