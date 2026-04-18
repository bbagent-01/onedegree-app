export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  compute1DegreeScore,
  compute1DegreeScoreIncoming,
} from "@/lib/trust/compute-score";
import {
  computeTrustPath,
  computeIncomingTrustPath,
} from "@/lib/trust-data";

/**
 * GET /api/trust/connection?targetId=...&direction=outgoing|incoming
 *
 * Returns the connection breakdown between the current user and a
 * target. `direction=outgoing` (default) is the current user's trust
 * of the target (my vouch graph reaching them). `direction=incoming`
 * is the target's trust of the current user (their vouch graph
 * reaching me) — used on host/listing surfaces where the displayed
 * score represents the host's vetting of the guest.
 *
 * Identities are labeled correctly for each direction so the popover
 * can render "You vouched for Maya" vs. "Sam vouched for Maya"
 * without additional context from the client.
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const targetId = url.searchParams.get("targetId");
  const direction =
    url.searchParams.get("direction") === "incoming"
      ? "incoming"
      : "outgoing";
  if (!targetId) {
    return Response.json({ error: "targetId required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Get current user's internal ID.
  const { data: currentUser } = await supabase
    .from("users")
    .select("id, name")
    .eq("clerk_id", userId)
    .single();

  if (!currentUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  if (currentUser.id === targetId) {
    return Response.json({ type: "self" });
  }

  // Direct vouches in either direction — same query regardless of
  // which way we're showing, we just interpret the result differently.
  const { data: directVouch } = await supabase
    .from("vouches")
    .select(
      "voucher_id, vouchee_id, vouch_type, years_known_bucket, vouch_score"
    )
    .or(
      `and(voucher_id.eq.${currentUser.id},vouchee_id.eq.${targetId}),and(voucher_id.eq.${targetId},vouchee_id.eq.${currentUser.id})`
    );

  const viewerToTarget = directVouch?.find(
    (v) => v.voucher_id === currentUser.id && v.vouchee_id === targetId
  );
  const targetToViewer = directVouch?.find(
    (v) => v.voucher_id === targetId && v.vouchee_id === currentUser.id
  );

  const { data: targetUser } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .eq("id", targetId)
    .single();

  const targetName = targetUser?.name ?? "this user";

  // In outgoing mode, "forward" = viewer→target; in incoming mode,
  // "forward" = target→viewer. This keeps the popover's direct-vouch
  // branches correct regardless of direction.
  const forward = direction === "incoming" ? targetToViewer : viewerToTarget;
  const reverse = direction === "incoming" ? viewerToTarget : targetToViewer;

  if (forward) {
    return Response.json({
      type: "direct_forward",
      direction,
      targetName,
      vouch: {
        vouch_type: forward.vouch_type,
        years_known_bucket: forward.years_known_bucket,
        vouch_score: forward.vouch_score,
      },
      reverseVouch: reverse
        ? {
            vouch_type: reverse.vouch_type,
            years_known_bucket: reverse.years_known_bucket,
            vouch_score: reverse.vouch_score,
          }
        : null,
    });
  }

  if (reverse) {
    return Response.json({
      type: "direct_reverse",
      direction,
      targetName,
      vouch: {
        vouch_type: reverse.vouch_type,
        years_known_bucket: reverse.years_known_bucket,
        vouch_score: reverse.vouch_score,
      },
    });
  }

  // Connected via paths.
  const result =
    direction === "incoming"
      ? await compute1DegreeScoreIncoming(targetId, currentUser.id)
      : await compute1DegreeScore(currentUser.id, targetId);

  if (result.paths.length > 0) {
    return Response.json({
      type: "connected",
      direction,
      targetName,
      score: result.score,
      paths: result.paths.map((p) => ({
        connector: p.connector ?? {
          id: p.connector_id,
          name: "Connection",
          avatar_url: null,
        },
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

  // Multi-hop check (3° / 4°). The 1°/2° engine above returned no
  // paths, but a longer chain may still exist. computeTrustPath /
  // computeIncomingTrustPath run the BFS-based upgrade pass and
  // return a hydrated chain of intermediaries when they find one.
  const multiHop =
    direction === "incoming"
      ? await computeIncomingTrustPath(targetId, currentUser.id)
      : await computeTrustPath(currentUser.id, targetId);

  if (
    (multiHop.degree === 3 || multiHop.degree === 4) &&
    multiHop.path.length >= 2
  ) {
    return Response.json({
      type: "multi_hop",
      direction,
      targetName,
      degree: multiHop.degree,
      // Path is already oriented per direction: incoming starts at
      // target and ends at viewer; outgoing starts at viewer and
      // ends at target. The detail view flips it into a readable
      // you-first sequence.
      path: multiHop.path.map((u) => ({
        id: u.id,
        name: u.name,
        avatar_url: u.avatar_url,
      })),
    });
  }

  return Response.json({
    type: "not_connected",
    direction,
    targetName,
  });
}
