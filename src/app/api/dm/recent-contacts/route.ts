export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * GET /api/dm/recent-contacts
 *
 * Returns the people the current user has messaged before, deduped
 * across multiple threads (e.g. listing-scoped + listingless DM with
 * the same person count once), sorted by most-recent activity.
 *
 * Powers the share-with-a-friend recipient picker — the empty-search
 * default list. Reuses message_threads as the source of truth so we
 * don't need a new "contacts" table.
 */
export async function GET() {
  const { userId } = await effectiveAuth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data: viewer } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!viewer) {
    return Response.json([]);
  }

  const { data: threads } = await supabase
    .from("message_threads")
    .select("guest_id, host_id, last_message_at")
    .or(`guest_id.eq.${viewer.id},host_id.eq.${viewer.id}`)
    .order("last_message_at", { ascending: false })
    .limit(50);

  if (!threads || threads.length === 0) return Response.json([]);

  const seen = new Map<string, string>();
  for (const t of threads) {
    const otherId = t.guest_id === viewer.id ? t.host_id : t.guest_id;
    if (!otherId) continue;
    if (!seen.has(otherId)) seen.set(otherId, t.last_message_at);
  }

  const ids = Array.from(seen.keys());
  if (ids.length === 0) return Response.json([]);

  const { data: users } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .in("id", ids);

  const userMap = new Map((users || []).map((u) => [u.id, u]));
  const result = ids
    .map((id) => {
      const u = userMap.get(id);
      if (!u) return null;
      return {
        id: u.id,
        name: u.name || "User",
        avatar_url: u.avatar_url || null,
        last_messaged_at: seen.get(id) || null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return Response.json(result);
}
