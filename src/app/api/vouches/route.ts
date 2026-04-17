export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET: fetch existing vouch between current user and target
export async function GET(req: Request) {
  const { userId } = await auth();
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

  const { data } = await supabase
    .from("vouches")
    .select("vouch_type, years_known_bucket, vouch_score, is_post_stay, is_staked")
    .eq("voucher_id", currentUser.id)
    .eq("vouchee_id", targetId)
    .maybeSingle();

  return Response.json({ vouch: data, currentUserId: currentUser.id });
}

// POST: create or update a vouch
export async function POST(req: Request) {
  const { userId } = await auth();
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

  // Post-stay vouches must use lt1 bucket
  if (isPostStay && yearsKnownBucket !== "lt1") {
    return Response.json(
      { error: "Post-stay vouches must use the <1 year bucket." },
      { status: 400 }
    );
  }

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
  const { userId } = await auth();
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

  // Delete the vouch
  const { error } = await supabase
    .from("vouches")
    .delete()
    .eq("voucher_id", currentUser.id)
    .eq("vouchee_id", targetUserId);

  if (error) {
    console.error("Vouch delete error:", error);
    return new Response("Failed to remove vouch", { status: 500 });
  }

  // Recount vouches for both users
  const { count: givenCount } = await supabase
    .from("vouches")
    .select("*", { count: "exact", head: true })
    .eq("voucher_id", currentUser.id);

  const { count: receivedCount } = await supabase
    .from("vouches")
    .select("*", { count: "exact", head: true })
    .eq("vouchee_id", targetUserId);

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
