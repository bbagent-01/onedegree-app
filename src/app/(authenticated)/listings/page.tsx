import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getListingsForViewer } from "@/lib/listing-data";
import { ListingsIndexClient } from "./listings-index-client";

export default async function ListingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const supabase = getSupabaseAdmin();
  const { data: viewer } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!viewer) redirect("/");

  // Get viewer's vouch count to determine empty state
  const { count: vouchCount } = await supabase
    .from("vouches")
    .select("*", { count: "exact", head: true })
    .eq("vouchee_id", viewer.id);

  const listings = await getListingsForViewer(viewer.id);

  // Get trust scores for sorting
  const hostIds = [...new Set(listings.map((l) => l.host_id))];
  const scoreMap: Record<string, number> = {};
  if (hostIds.length > 0) {
    const { data: scores } = await supabase.rpc(
      "calculate_one_degree_scores",
      { p_viewer_id: viewer.id, p_target_ids: hostIds }
    );
    for (const s of scores || []) {
      scoreMap[s.target_id] = s.score;
    }
  }

  return (
    <ListingsIndexClient
      listings={listings}
      viewerVouchCount={vouchCount ?? 0}
      trustScores={scoreMap}
    />
  );
}
