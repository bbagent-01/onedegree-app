export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET: list current user's invites (for My Invites page)
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
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

  // Fetch invites with claimed user info
  const { data: invites, error } = await supabase
    .from("invites")
    .select(
      "id, invitee_email, invitee_phone, token, vouch_type, years_known_bucket, claimed_by, claimed_at, expires_at, created_at, claimed_user:users!invites_claimed_by_fkey(id, name, avatar_url)"
    )
    .eq("inviter_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Invites fetch error:", error);
    return new Response("Failed to fetch invites", { status: 500 });
  }

  return Response.json({ invites: invites ?? [] });
}

// POST: create an invite with pre-vouch data
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { contactType, contactValue, vouchType, yearsKnownBucket } = body;

  if (!contactType || !contactValue || !vouchType || !yearsKnownBucket) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["email", "phone"].includes(contactType)) {
    return Response.json({ error: "Invalid contact type" }, { status: 400 });
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

  const inviteRow: Record<string, unknown> = {
    inviter_id: currentUser.id,
    vouch_type: vouchType,
    years_known_bucket: yearsKnownBucket,
    reputation_stake_confirmed: true,
  };

  if (contactType === "email") {
    inviteRow.invitee_email = contactValue;
  } else {
    inviteRow.invitee_phone = contactValue;
  }

  const { data: invite, error } = await supabase
    .from("invites")
    .insert(inviteRow)
    .select("token")
    .single();

  if (error) {
    console.error("Invite insert error:", error);
    return Response.json({ error: "Failed to create invite" }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.onedegreebnb.com";
  const inviteUrl = `${baseUrl}/join/${invite.token}`;

  return Response.json({ token: invite.token, inviteUrl });
}
