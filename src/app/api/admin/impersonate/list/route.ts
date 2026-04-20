// REMOVE BEFORE BETA — see CC-Dev1 recap. All files in
// src/lib/impersonation/, src/components/admin/Impersonation*.tsx, and
// src/app/api/admin/impersonate/ delete together. Env vars IMPERSONATION_*
// and the impersonation_log table + is_test_user column must also be removed.

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { compute1DegreeScores } from "@/lib/trust";
import {
  isImpersonationEnabled,
  isAdmin,
} from "@/lib/impersonation/session";

// Edge runtime required by Cloudflare Pages. compute1DegreeScores
// uses supabase-js which is edge-compatible.
export const runtime = "edge";

const gateFailed = () => new Response("Not Found", { status: 404 });

interface TestUserRow {
  id: string;
  name: string;
  avatar_url: string | null;
  phone_number: string | null;
  host_rating: number | null;
  guest_rating: number | null;
  is_test_user: boolean;
}

/**
 * Build the "role tags" used for filtering in the switcher modal.
 * Derived from the ratings + whether they own any listings rather
 * than stored — this is a dev tool, no need to materialize.
 */
function roleTags(
  u: TestUserRow,
  hostIds: Set<string>
): string[] {
  const tags: string[] = [];
  if (hostIds.has(u.id)) tags.push("host");
  if (u.guest_rating !== null) tags.push("guest");
  if (tags.length === 0) tags.push("connector");
  return tags;
}

export async function GET() {
  if (!isImpersonationEnabled()) return gateFailed();
  const { userId: clerkAdminId } = await auth();
  if (!clerkAdminId || !isAdmin(clerkAdminId)) return gateFailed();

  const supabase = getSupabaseAdmin();

  // Resolve admin's DB id once — used as the viewer for 1° scores.
  const { data: adminRow } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkAdminId)
    .maybeSingle();
  const adminUserId = adminRow?.id ?? null;

  const { data: testUsers, error } = await supabase
    .from("users")
    .select(
      "id, name, avatar_url, phone_number, host_rating, guest_rating, is_test_user"
    )
    .eq("is_test_user", true)
    .order("name", { ascending: true });

  if (error) {
    return Response.json(
      { error: "Failed to load test users" },
      { status: 500 }
    );
  }

  // Identify which test users are hosts so we can role-tag.
  const ids = (testUsers ?? []).map((u) => u.id);
  let hostIds = new Set<string>();
  if (ids.length > 0) {
    const { data: hostRows } = await supabase
      .from("listings")
      .select("host_id")
      .in("host_id", ids);
    hostIds = new Set((hostRows ?? []).map((r) => r.host_id));
  }

  // 1° scores from admin → each test user. If admin row not found
  // (shouldn't happen), score stays 0 for everyone.
  let scores = new Map<string, number>();
  if (adminUserId && ids.length > 0) {
    const scoreMap = await compute1DegreeScores(adminUserId, ids);
    scores = new Map(
      Array.from(scoreMap.entries()).map(([id, r]) => [id, r.score])
    );
  }

  const rows = (testUsers ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    avatar_url: u.avatar_url,
    phone_last4: u.phone_number ? u.phone_number.slice(-4) : null,
    one_degree_score: scores.get(u.id) ?? 0,
    tags: roleTags(u as TestUserRow, hostIds),
  }));

  return Response.json({ users: rows });
}
