export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { emailInvitation } from "@/lib/email";
import { sendInviteSMS } from "@/lib/sms/send-invite";
import { effectiveAuth } from "@/lib/impersonation/session";

// GET: list current user's invites
export async function GET() {
  const { userId } = await effectiveAuth();
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
  const { userId } = await effectiveAuth();
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
    .select("id, name, phone_number, email")
    .eq("clerk_id", userId)
    .single();

  if (!currentUser) {
    return new Response("User not found", { status: 404 });
  }

  // ── Existing-member guard ─────────────────────────────────────
  // If the phone or email already matches a registered user, block
  // the invite and point the caller at the vouch flow. Returns 409
  // with { existing: true, self?, user? } so the UI can redirect
  // to /profile/<id> (or the in-place "invited yourself" warning)
  // instead of creating a no-op invite. Also normalizes phone so
  // "555-0100" and "+15555550100" collide as expected.
  {
    const orParts: string[] = [];
    if (inviteePhone) orParts.push(`phone_number.eq.${inviteePhone}`);
    if (inviteeEmail) {
      orParts.push(`email.eq.${String(inviteeEmail).toLowerCase()}`);
    }
    if (orParts.length > 0) {
      const { data: match } = await supabase
        .from("users")
        .select("id, name, avatar_url")
        .or(orParts.join(","))
        .maybeSingle();
      if (match) {
        const isSelf = match.id === currentUser.id;
        return Response.json(
          {
            error: isSelf
              ? "That's your own phone or email. You can't invite yourself."
              : `${match.name} is already on Trustead. Vouch for them directly instead.`,
            existing: true,
            self: isSelf,
            user: isSelf
              ? null
              : {
                  id: match.id,
                  name: match.name,
                  avatar_url: match.avatar_url ?? null,
                },
          },
          { status: 409 }
        );
      }
    }
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://trustead.app";
  const inviteUrl = `${baseUrl}/join/${invite.token}`;

  // Delivery orchestration: SMS primary, email fallback
  let deliveryMethod: "sms" | "email" | "both" | "failed" = "failed";
  let smsSuccess = false;
  let emailSuccess = false;

  // Step 1: Try SMS if phone provided
  if (inviteePhone) {
    try {
      const smsResult = await sendInviteSMS({
        toPhone: inviteePhone,
        inviterName: currentUser.name,
        inviteeName,
        inviteUrl,
      });
      smsSuccess = smsResult.success;
    } catch (e) {
      // OptedOutError surfaces here when the invitee has previously
      // replied STOP. Treat as a soft failure so email fallback fires.
      if (e instanceof Error && (e as { code?: string }).code === "opted_out") {
        smsSuccess = false;
      } else {
        throw e;
      }
    }
  }

  // Step 2: Send email if provided AND (SMS failed OR no phone OR both)
  if (inviteeEmail && (!smsSuccess || inviteePhone)) {
    try {
      await emailInvitation({
        inviterName: currentUser.name,
        inviteeName,
        inviteeEmail,
        inviteUrl,
      });
      emailSuccess = true;
    } catch (e) {
      console.error("Email delivery failed:", e);
    }
  }

  // Determine delivery method
  if (smsSuccess && emailSuccess) deliveryMethod = "both";
  else if (smsSuccess) deliveryMethod = "sms";
  else if (emailSuccess) deliveryMethod = "email";
  else deliveryMethod = "failed";

  // Update invite with delivery status
  await supabase
    .from("invites")
    .update({
      delivery_method: deliveryMethod,
      delivery_status: deliveryMethod === "failed" ? "failed" : "delivered",
    })
    .eq("id", invite.id);

  return Response.json({
    id: invite.id,
    token: invite.token,
    inviteUrl,
    deliveryMethod,
  });
}
