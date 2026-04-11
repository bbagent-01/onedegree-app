import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getListingForViewer } from "@/lib/listing-data";
import { ListingDetailClient } from "./listing-detail-client";

export const runtime = "edge";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/");

  const supabase = getSupabaseAdmin();
  const { data: viewer } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!viewer) redirect("/");

  const listing = await getListingForViewer(id, viewer.id);

  if (!listing || !listing.access.canSeePreview) {
    redirect("/listings?error=not_found");
  }

  // Get trust score vs this host for locked state messaging
  let viewerScore = 0;
  if (listing.host_id !== viewer.id) {
    const { data: scores } = await supabase.rpc(
      "calculate_one_degree_scores",
      { p_viewer_id: viewer.id, p_target_ids: [listing.host_id] }
    );
    viewerScore = scores?.[0]?.score ?? 0;
  }

  return (
    <ListingDetailClient
      listing={listing}
      viewerId={viewer.id}
      viewerScore={viewerScore}
      requiredScore={listing.min_trust_score}
    />
  );
}
