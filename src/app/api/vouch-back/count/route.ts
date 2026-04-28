export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { getVouchBackCandidates } from "@/lib/network-data";

/**
 * Count of unreciprocated incoming vouches that are at least 7 days
 * old and not currently dismissed. Drives the subtle badge next to the
 * "Network" item in SectionNav — fresh vouches don't nag; aged-but-
 * unanswered ones do.
 *
 * 7 days mirrors the "give them some time to remember you" grace
 * period we picked in S8. Dismissing or vouching back clears the
 * badge naturally via the same queries.
 */
export async function GET() {
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ count: 0 });

  const supabase = getSupabaseAdmin();
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!currentUser) return Response.json({ count: 0 });

  const candidates = await getVouchBackCandidates(currentUser.id, {
    minAgeDays: 7,
  });
  return Response.json({ count: candidates.length });
}
