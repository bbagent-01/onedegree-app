export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { compute1DegreeScore } from "@/lib/trust/compute-score";

/**
 * GET /api/trust/connection?targetId=...
 *
 * Returns the full connection breakdown between the current user and a target.
 * Used by the ConnectionPopover to show how two users are connected.
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const targetId = url.searchParams.get("targetId");
  if (!targetId) {
    return Response.json({ error: "targetId required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Get current user's internal ID
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!currentUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // Self — no popover needed
  if (currentUser.id === targetId) {
    return Response.json({ type: "self" });
  }

  // Check for direct vouches (both directions)
  const { data: directVouch } = await supabase
    .from("vouches")
    .select("voucher_id, vouchee_id, vouch_type, years_known_bucket, vouch_score")
    .or(
      `and(voucher_id.eq.${currentUser.id},vouchee_id.eq.${targetId}),and(voucher_id.eq.${targetId},vouchee_id.eq.${currentUser.id})`
    );

  const forwardVouch = directVouch?.find(
    (v) => v.voucher_id === currentUser.id && v.vouchee_id === targetId
  );
  const reverseVouch = directVouch?.find(
    (v) => v.voucher_id === targetId && v.vouchee_id === currentUser.id
  );

  // Get target user info
  const { data: targetUser } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .eq("id", targetId)
    .single();

  const targetName = targetUser?.name ?? "this user";

  // Case A: You vouched for them (direct forward)
  if (forwardVouch) {
    return Response.json({
      type: "direct_forward",
      targetName,
      vouch: {
        vouch_type: forwardVouch.vouch_type,
        years_known_bucket: forwardVouch.years_known_bucket,
        vouch_score: forwardVouch.vouch_score,
      },
      // Also include reverse if mutual
      reverseVouch: reverseVouch
        ? {
            vouch_type: reverseVouch.vouch_type,
            years_known_bucket: reverseVouch.years_known_bucket,
            vouch_score: reverseVouch.vouch_score,
          }
        : null,
    });
  }

  // Case B: They vouched for you (reverse only)
  if (reverseVouch) {
    return Response.json({
      type: "direct_reverse",
      targetName,
      vouch: {
        vouch_type: reverseVouch.vouch_type,
        years_known_bucket: reverseVouch.years_known_bucket,
        vouch_score: reverseVouch.vouch_score,
      },
    });
  }

  // Case C: Connected via paths — use the full 1° score computation
  const result = await compute1DegreeScore(currentUser.id, targetId);

  if (result.paths.length > 0) {
    return Response.json({
      type: "connected",
      targetName,
      score: result.score,
      paths: result.paths.map((p) => ({
        connector: p.connector ?? { id: p.connector_id, name: "Connection", avatar_url: null },
        link_a: Math.round(p.link_a * 100) / 100,
        link_b: Math.round(p.link_b * 100) / 100,
        path_strength: Math.round(p.path_strength * 100) / 100,
        rank: p.rank,
        weight: Math.round(p.weight * 1000) / 1000,
        weighted_score: Math.round(p.weighted_score * 100) / 100,
        viewer_vouch_score: p.viewer_vouch_score,
        connector_vouch_score: p.connector_vouch_score,
        connector_vouch_power: p.connector_vouch_power,
      })),
      connection_count: result.connection_count,
    });
  }

  // Case D: Not connected
  return Response.json({
    type: "not_connected",
    targetName,
  });
}
