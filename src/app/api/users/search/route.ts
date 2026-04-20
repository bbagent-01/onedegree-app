export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * GET /api/users/search?q=...
 * Search members by name or email. Returns up to 20 results.
 * Excludes the requesting user from results.
 */
export async function GET(req: Request) {
  const { userId } = await effectiveAuth();
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

  // Strip non-digit chars to get pure digits for phone matching
  const digitsOnly = q.replace(/\D/g, "");
  const isPhoneQuery = /^\+/.test(q) || digitsOnly.length >= 4;

  // Search users by name, email, OR phone_number
  const pattern = `%${q}%`;
  // For phone matching, search for the digits as a substring in the stored E.164 value
  const phonePattern = digitsOnly ? `%${digitsOnly}%` : null;

  let query = supabase
    .from("users")
    .select("id, clerk_id, name, email, avatar_url, phone_number")
    .neq("clerk_id", userId)
    .limit(20);

  if (isPhoneQuery && phonePattern) {
    // Phone-first: match digits against stored phone_number
    query = query.or(
      `phone_number.ilike.${phonePattern},name.ilike.${pattern},email.ilike.${pattern}`
    );
  } else {
    // Name/email primary, also match phone if digits present
    const filters = [`name.ilike.${pattern}`, `email.ilike.${pattern}`];
    if (phonePattern) filters.push(`phone_number.ilike.${phonePattern}`);
    query = query.or(filters.join(","));
  }

  const { data: users, error } = await query;

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
    const results = users.map((u: Record<string, unknown>) => ({
      ...u,
      already_vouched: vouchedIds.has(u.id as string),
    }));
    return Response.json(results);
  }

  return Response.json(users?.map((u: Record<string, unknown>) => ({ ...u, already_vouched: false })) || []);
}
