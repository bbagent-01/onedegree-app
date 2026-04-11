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

  // Get current user's DB id
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
    .select("vouch_type, years_known_bucket, reputation_stake_confirmed")
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
  const { targetUserId, vouchType, yearsKnownBucket, stayConfirmationId } = body;

  if (!targetUserId || !vouchType || !yearsKnownBucket) {
    return new Response("Missing fields", { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Get current user's DB id
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!currentUser) {
    return new Response("User not found", { status: 404 });
  }

  if (currentUser.id === targetUserId) {
    return Response.json({ error: "You can't vouch for yourself." }, { status: 400 });
  }

  // Post-stay vouches must use lt1yr bucket
  if (stayConfirmationId && yearsKnownBucket !== "lt1yr") {
    return Response.json(
      { error: "Post-stay vouches must use the <1 year bucket." },
      { status: 400 }
    );
  }

  const { error: upsertError } = await supabase.from("vouches").upsert(
    {
      voucher_id: currentUser.id,
      vouchee_id: targetUserId,
      vouch_type: vouchType,
      years_known_bucket: yearsKnownBucket,
      reputation_stake_confirmed: true,
      ...(stayConfirmationId ? { stay_confirmation_id: stayConfirmationId } : {}),
    },
    { onConflict: "voucher_id,vouchee_id" }
  );

  if (upsertError) {
    console.error("Vouch upsert error:", upsertError);
    return new Response("Failed to save vouch", { status: 500 });
  }

  // Refresh vouch_power
  await supabase.rpc("calculate_vouch_power", {
    p_user_id: currentUser.id,
  });

  return Response.json({ ok: true });
}
