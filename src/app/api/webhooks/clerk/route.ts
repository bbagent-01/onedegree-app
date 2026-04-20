export const runtime = "edge";

import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error("Missing CLERK_WEBHOOK_SECRET");
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url, phone_numbers } = evt.data;
    const email = email_addresses?.[0]?.email_address;
    const name = [first_name, last_name].filter(Boolean).join(" ") || "User";
    const phone = phone_numbers?.[0]?.phone_number ?? null;

    const supabase = getSupabaseAdmin();

    // Guard: if Clerk fires with a phone that another DB row already
    // owns, refuse the upsert and return a structured error. The
    // signup UI catches this and surfaces "phone already registered."
    if (phone) {
      const { data: conflicting } = await supabase
        .from("users")
        .select("id, clerk_id")
        .eq("phone_number", phone)
        .neq("clerk_id", id)
        .maybeSingle();
      if (conflicting) {
        console.warn(
          `[clerk-webhook] phone collision: ${phone} already on user ${conflicting.id} (clerk=${conflicting.clerk_id}); refusing upsert for ${id}`
        );
        return Response.json(
          {
            error: "phone_already_registered",
            message:
              "This phone number is already registered. Sign in or use a different number.",
          },
          { status: 409 }
        );
      }
    }

    const { data: user, error } = await supabase
      .from("users")
      .upsert(
        {
          clerk_id: id,
          name,
          email,
          avatar_url: image_url,
          phone_number: phone,
        },
        { onConflict: "clerk_id" }
      )
      .select("id")
      .single();

    if (error) {
      // Unique-violation on phone is the canonical way Postgres tells us
      // about a race we didn't catch in the pre-check above (e.g. two
      // concurrent signups). Surface as 409 so Clerk retries don't
      // silently squash a legitimate collision.
      if ((error as { code?: string }).code === "23505") {
        console.warn(
          `[clerk-webhook] unique violation on upsert for ${id}: ${error.message}`
        );
        return Response.json(
          {
            error: "phone_already_registered",
            message:
              "This phone number is already registered. Sign in or use a different number.",
          },
          { status: 409 }
        );
      }
      console.error("Supabase upsert error:", error);
      return new Response("Database error", { status: 500 });
    }

    // On new user creation, claim any pending invites
    if (evt.type === "user.created" && user) {
      await claimPendingInvites(supabase, user.id, email ?? null, phone);
    }
  }

  return new Response("OK", { status: 200 });
}

/**
 * When a new user signs up, check for pending invites matching their
 * phone number or email. For each match, auto-create the vouch record
 * from the pre_vouch_data and mark the invite as claimed.
 */
async function claimPendingInvites(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  newUserId: string,
  email: string | null,
  phone: string | null
) {
  if (!email && !phone) return;

  // Build OR filter for matching invites
  const conditions: string[] = [];
  if (phone) conditions.push(`invitee_phone.eq.${phone}`);
  if (email) conditions.push(`invitee_email.eq.${email}`);

  const { data: invites } = await supabase
    .from("invites")
    .select("id, inviter_id, pre_vouch_data, vouch_type, years_known_bucket")
    .or(conditions.join(","))
    .is("claimed_by", null);

  if (!invites || invites.length === 0) return;

  for (const invite of invites) {
    try {
      // Use pre_vouch_data if available, otherwise fall back to direct fields
      const pvd = invite.pre_vouch_data as {
        vouch_type?: string;
        years_known_bucket?: string;
      } | null;

      const vouchType = pvd?.vouch_type || invite.vouch_type || "standard";
      const yearsKnown = pvd?.years_known_bucket || invite.years_known_bucket || "lt1";

      // Create the vouch (the DB trigger computes vouch_score)
      await supabase.from("vouches").upsert(
        {
          voucher_id: invite.inviter_id,
          vouchee_id: newUserId,
          vouch_type: vouchType,
          years_known_bucket: yearsKnown,
          is_post_stay: false,
          is_staked: false,
        },
        { onConflict: "voucher_id,vouchee_id" }
      );

      // Mark invite as claimed
      await supabase
        .from("invites")
        .update({
          status: "joined",
          claimed_by: newUserId,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", invite.id);
    } catch (e) {
      // Log but don't fail the webhook for invite claim errors
      console.error(`Failed to claim invite ${invite.id}:`, e);
    }
  }
}
