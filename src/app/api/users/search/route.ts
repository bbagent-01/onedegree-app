export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/users/search?q=...
 * Search members by name or email. Returns up to 20 results.
 * Excludes the requesting user from results.
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return Response.json([]);
  }

  const supabase = getSupabaseAdmin();

  // Get current user's DB id
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  // Search users by name OR email
  const pattern = `%${q}%`;
  const { data: users, error } = await supabase
    .from("users")
    .select("id, clerk_id, name, email, avatar_url")
    .or(`name.ilike.${pattern},email.ilike.${pattern}`)
    .neq("clerk_id", userId)
    .limit(20);

  if (error) {
    return new Response("Search failed", { status: 500 });
  }

  // Check which results the current user has already vouched for
  if (currentUser && users && users.length > 0) {
    const userIds = users.map((u) => u.id);
    const { data: existingVouches } = await supabase
      .from("vouches")
      .select("vouchee_id")
      .eq("voucher_id", currentUser.id)
      .in("vouchee_id", userIds);

    const vouchedIds = new Set(existingVouches?.map((v) => v.vouchee_id) || []);
    const results = users.map((u) => ({
      ...u,
      already_vouched: vouchedIds.has(u.id),
    }));
    return Response.json(results);
  }

  return Response.json(users?.map((u) => ({ ...u, already_vouched: false })) || []);
}
