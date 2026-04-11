import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ProfileClient } from "./profile-client";

export const runtime = "edge";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function ProfilePage({ params }: Props) {
  const { userId: profileUserId } = await params;
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/");

  const supabase = getSupabaseAdmin();

  // Get current viewer
  const { data: viewer } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .single();

  if (!viewer) redirect("/");

  // Get profile user
  const { data: profileUser } = await supabase
    .from("users")
    .select(
      "id, name, email, avatar_url, bio, guest_rating, guest_review_count, host_rating, host_review_count, vouch_power"
    )
    .eq("id", profileUserId)
    .single();

  if (!profileUser) redirect("/listings");

  const isOwnProfile = viewer.id === profileUser.id;

  // Vouches received (who vouched for this user)
  const { data: vouchesReceived } = await supabase
    .from("vouches")
    .select("voucher_id, vouch_type, created_at")
    .eq("vouchee_id", profileUser.id);

  // Vouches given (who this user vouched for)
  const { data: vouchesGiven } = await supabase
    .from("vouches")
    .select("vouchee_id, vouch_type, created_at")
    .eq("voucher_id", profileUser.id);

  // Resolve user names for vouchers/vouchees
  const allUserIds = [
    ...(vouchesReceived || []).map((v) => v.voucher_id),
    ...(vouchesGiven || []).map((v) => v.vouchee_id),
  ];
  const uniqueIds = [...new Set(allUserIds)];

  const userNames: Record<string, { name: string; avatar_url: string | null }> =
    {};
  if (uniqueIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, name, avatar_url")
      .in("id", uniqueIds);
    for (const u of users || []) {
      userNames[u.id] = { name: u.name, avatar_url: u.avatar_url };
    }
  }

  // 1° score (viewer vs profile user)
  let scoreData = { score: 0, connection_count: 0 };
  let sharedConnectors: { id: string; name: string; avatar_url: string | null }[] = [];
  if (!isOwnProfile) {
    const { data: scores } = await supabase.rpc(
      "calculate_one_degree_scores",
      { p_viewer_id: viewer.id, p_target_ids: [profileUser.id] }
    );
    if (scores?.[0]) {
      scoreData = {
        score: scores[0].score,
        connection_count: scores[0].connection_count,
      };
    }

    // Find shared connectors: people viewer vouched for who also vouched for profileUser
    // Path: viewer → connector → profileUser
    const { data: viewerVouchees } = await supabase
      .from("vouches")
      .select("vouchee_id")
      .eq("voucher_id", viewer.id);

    if (viewerVouchees && viewerVouchees.length > 0) {
      const voucheeIds = viewerVouchees.map((v) => v.vouchee_id);
      const { data: connectorVouches } = await supabase
        .from("vouches")
        .select("voucher_id")
        .eq("vouchee_id", profileUser.id)
        .in("voucher_id", voucheeIds);

      if (connectorVouches && connectorVouches.length > 0) {
        const connectorIds = connectorVouches.map((v) => v.voucher_id);
        const { data: connectorUsers } = await supabase
          .from("users")
          .select("id, name, avatar_url")
          .in("id", connectorIds);
        sharedConnectors = connectorUsers || [];
      }
    }
  }

  // Check if viewer already vouched for this user
  let existingVouch = null;
  if (!isOwnProfile) {
    const { data: vouch } = await supabase
      .from("vouches")
      .select("vouch_type")
      .eq("voucher_id", viewer.id)
      .eq("vouchee_id", profileUser.id)
      .maybeSingle();
    existingVouch = vouch;
  }

  // Get all user IDs the viewer has vouched for (to show connection status in lists)
  let viewerVouchedForIds: string[] = [];
  if (!isOwnProfile) {
    const { data: viewerVouches } = await supabase
      .from("vouches")
      .select("vouchee_id")
      .eq("voucher_id", viewer.id);
    viewerVouchedForIds = (viewerVouches || []).map((v) => v.vouchee_id);
  }

  // User's listings (if they host)
  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, area_name, price_min, price_max, property_type")
    .eq("host_id", profileUser.id)
    .eq("is_active", true);

  return (
    <ProfileClient
      profileUser={profileUser}
      isOwnProfile={isOwnProfile}
      vouchesReceived={(vouchesReceived || []).map((v) => ({
        userId: v.voucher_id,
        name: userNames[v.voucher_id]?.name ?? "Unknown",
        avatar_url: userNames[v.voucher_id]?.avatar_url ?? null,
        vouch_type: v.vouch_type as "standard" | "inner_circle",
      }))}
      vouchesGiven={(vouchesGiven || []).map((v) => ({
        userId: v.vouchee_id,
        name: userNames[v.vouchee_id]?.name ?? "Unknown",
        avatar_url: userNames[v.vouchee_id]?.avatar_url ?? null,
        vouch_type: v.vouch_type as "standard" | "inner_circle",
      }))}
      scoreVsViewer={scoreData}
      sharedConnectors={sharedConnectors}
      existingVouch={existingVouch}
      viewerVouchedForIds={viewerVouchedForIds}
      listings={listings || []}
    />
  );
}
