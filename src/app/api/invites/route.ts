export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { emailInvitation } from "@/lib/email";

// GET: list current user's invites
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

  const { data: invites, error } = await supabase
    .from("invites")
    .select(
      "id, invitee_email, invitee_phone, invitee_name, pre_vouch_data, status, token, created_at, claimed_by, claimed_user:users!invites_claimed_by_fkey(id, name, avatar_url)"
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
  const { inviteeName, inviteePhone, inviteeEmail, vouchType, yearsKnownBucket } = body;

  if (!inviteeName || !vouchType || !yearsKnownBucket) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!inviteePhone && !inviteeEmail) {
    return Response.json(
      { error: "Phone or email required" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: currentUser } = await supabase
    .from("users")
    .select("id, name")
    .eq("clerk_id", userId)
    .single();

  if (!currentUser) {
    return new Response("User not found", { status: 404 });
  }

  // Store the pre-vouch data as JSON for claim-time processing
  const preVouchData = {
    vouch_type: vouchType,
    years_known_bucket: yearsKnownBucket,
    is_staked: false,
  };

  const inviteRow: Record<string, unknown> = {
    inviter_id: currentUser.id,
    invitee_name: inviteeName,
    pre_vouch_data: preVouchData,
    vouch_type: vouchType,
    years_known_bucket: yearsKnownBucket,
    status: "sent",
  };

  if (inviteeEmail) inviteRow.invitee_email = inviteeEmail;
  if (inviteePhone) inviteRow.invitee_phone = inviteePhone;

  const { data: invite, error } = await supabase
    .from("invites")
    .insert(inviteRow)
    .select("id, token")
    .single();

  if (error) {
    console.error("Invite insert error:", error);
    return Response.json({ error: "Failed to create invite" }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://alpha-c.onedegreebnb.com";
  const inviteUrl = `${baseUrl}/join/${invite.token}`;

  // Send invitation email if email provided
  if (inviteeEmail) {
    await emailInvitation({
      inviterName: currentUser.name,
      inviteeName,
      inviteeEmail,
      inviteUrl,
    });
  }

  return Response.json({ id: invite.id, token: invite.token, inviteUrl });
}
