export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { blockIfDemoMix } from "@/lib/demo-guard";

// GET: fetch existing vouch between current user and target
export async function GET(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const targetId = url.searchParams.get("targetId");
  if (!targetId) {
    return Response.json(null);
  }

  const supabase = getSupabaseAdmin();

  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!currentUser) {
    return new Response("User not found", { status: 404 });
  }

  // Demo-origin rows (B8) are not editable through the user-facing
  // vouch dialog — they only exist as recipient-incoming. Excluding
  // here means the dialog can't accidentally surface a demo-origin
  // row as the viewer's own existing vouch.
  const { data } = await supabase
    .from("vouches")
    .select("vouch_type, years_known_bucket, vouch_score, is_post_stay, is_staked")
    .eq("voucher_id", currentUser.id)
    .eq("vouchee_id", targetId)
    .eq("is_demo_origin", false)
    .maybeSingle();

  return Response.json({ vouch: data, currentUserId: currentUser.id });
}

// POST: create or update a vouch
export async function POST(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const {
    targetUserId,
    vouchType,
    yearsKnownBucket,
    isPostStay,
    sourceBookingId,
  } = body;

  if (!targetUserId || !vouchType || !yearsKnownBucket) {
    return new Response("Missing fields", { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!currentUser) {
    return new Response("User not found", { status: 404 });
  }

  if (currentUser.id === targetUserId) {
    return Response.json(
      { error: "You can't vouch for yourself." },
      { status: 400 }
    );
  }

  const demoBlock = await blockIfDemoMix(currentUser.id, targetUserId);
  if (demoBlock) return demoBlock;

  // Post-stay vouches are always "Met through Trustead" — the
  // platform_met bucket (0.4×), added in migration 035a.
  if (isPostStay && yearsKnownBucket !== "platform_met") {
    return Response.json(
      { error: "Post-stay vouches must use the platform_met bucket." },
      { status: 400 }
    );
  }

  // Capture prior vouch state (used for close-the-loop detection below).
  // If there's no outgoing vouch yet AND the target has already vouched
  // the current user, this upsert is a "vouch-back" and we should write
  // a notification row for the original voucher. Real-only.
  const { data: priorOutgoing } = await supabase
    .from("vouches")
    .select("id")
    .eq("voucher_id", currentUser.id)
    .eq("vouchee_id", targetUserId)
    .eq("is_demo_origin", false)
    .maybeSingle();

  const { data: vouch, error: upsertError } = await supabase
    .from("vouches")
    .upsert(
      {
        voucher_id: currentUser.id,
        vouchee_id: targetUserId,
        vouch_type: vouchType,
        years_known_bucket: yearsKnownBucket,
        is_post_stay: !!isPostStay,
        is_staked: false, // Hidden for alpha — always false
        ...(sourceBookingId ? { source_booking_id: sourceBookingId } : {}),
      },
      { onConflict: "voucher_id,vouchee_id" }
    )
    .select("vouch_score")
    .single();

  if (upsertError) {
    console.error("Vouch upsert error:", upsertError);
    return new Response("Failed to save vouch", { status: 500 });
  }

  // Close-the-loop detection. Only fire on *new* outgoing vouches, not
  // edits. The target is only notified once per reciprocal pair.
  if (!priorOutgoing) {
    const { data: reciprocal } = await supabase
      .from("vouches")
      .select("id")
      .eq("voucher_id", targetUserId)
      .eq("vouchee_id", currentUser.id)
      .eq("is_demo_origin", false)
      .maybeSingle();

    if (reciprocal) {
      await supabase.from("vouch_back_notifications").insert({
        user_id: targetUserId,
        vouched_back_by_id: currentUser.id,
      });
      // Tear down any stale "not yet" dismissal the current user had
      // against this voucher — the loop is closed.
      await supabase
        .from("vouch_back_dismissals")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("voucher_id", targetUserId);
    }
  }

  // Read voucher's current vouch_power so the confirmation screen can
  // explain how much this vouch is boosted/reduced. Non-fatal if the
  // column is missing — default to 1.0 (neutral).
  const { data: voucher } = await supabase
    .from("users")
    .select("vouch_power")
    .eq("id", currentUser.id)
    .maybeSingle();
  const vouchPower = Number(voucher?.vouch_power ?? 1) || 1;

  return Response.json({
    ok: true,
    vouchScore: vouch?.vouch_score ?? null,
    vouchPower,
  });
}

// DELETE: remove a vouch
export async function DELETE(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { targetUserId } = body;
  if (!targetUserId) {
    return new Response("Missing targetUserId", { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!currentUser) {
    return new Response("User not found", { status: 404 });
  }

  // Delete the vouch. Scoped to is_demo_origin=false so a UI-driven
  // delete can never accidentally clear an auto-vouch row (those
  // are removed only by the post-alpha cleanup statement in
  // migration 054).
  const { error } = await supabase
    .from("vouches")
    .delete()
    .eq("voucher_id", currentUser.id)
    .eq("vouchee_id", targetUserId)
    .eq("is_demo_origin", false);

  if (error) {
    console.error("Vouch delete error:", error);
    return new Response("Failed to remove vouch", { status: 500 });
  }

  // Recount vouches for both users — must mirror the trigger's
  // real-only counter (see migration 054) so the stored counts
  // stay consistent after a UI delete.
  const { count: givenCount } = await supabase
    .from("vouches")
    .select("*", { count: "exact", head: true })
    .eq("voucher_id", currentUser.id)
    .eq("is_demo_origin", false);

  const { count: receivedCount } = await supabase
    .from("vouches")
    .select("*", { count: "exact", head: true })
    .eq("vouchee_id", targetUserId)
    .eq("is_demo_origin", false);

  await supabase
    .from("users")
    .update({ vouch_count_given: givenCount ?? 0 })
    .eq("id", currentUser.id);

  await supabase
    .from("users")
    .update({ vouch_count_received: receivedCount ?? 0 })
    .eq("id", targetUserId);

  return Response.json({ ok: true });
}
