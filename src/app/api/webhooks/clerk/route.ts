export const runtime = "edge";

import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { computeAge } from "@/lib/age";

/**
 * Delete a Clerk user via the Backend API. Used as a belt-and-suspenders
 * age gate: if the signup UI was bypassed and a user without a valid
 * 18+ DOB landed in Clerk, we wipe the account here so it never gets
 * mirrored into our DB.
 */
async function deleteClerkUser(userId: string): Promise<void> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    console.error("[clerk-webhook] missing CLERK_SECRET_KEY; cannot delete user", userId);
    return;
  }
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!res.ok) {
      console.error(
        `[clerk-webhook] failed to delete user ${userId}: ${res.status} ${await res.text()}`
      );
    }
  } catch (e) {
    console.error(`[clerk-webhook] exception deleting user ${userId}:`, e);
  }
}

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

    // Legal pack §04.7 belt-and-suspenders age gate. The signup UI
    // enforces the same check client-side, but if someone got a raw
    // Clerk account created (e.g. Clerk dashboard, API call) with an
    // under-18 DOB we refuse to mirror them and delete the Clerk row
    // outright. Legacy users without DOB metadata (pre-S9b) pass
    // through — we don't retroactively deny them.
    if (evt.type === "user.created") {
      const unsafeMetadata = (evt.data as { unsafe_metadata?: Record<string, unknown> })
        .unsafe_metadata;
      const dobYear =
        typeof unsafeMetadata?.dob_year === "number" ? unsafeMetadata.dob_year : null;
      const dobMonth =
        typeof unsafeMetadata?.dob_month === "number" ? unsafeMetadata.dob_month : null;
      if (dobYear !== null && dobMonth !== null) {
        const age = computeAge(dobYear, dobMonth);
        if (age < 13) {
          console.warn(
            `[clerk-webhook] COPPA block: deleting user ${id} with age ${age} (DOB ${dobYear}-${dobMonth})`
          );
          await deleteClerkUser(id);
          return new Response("Under 13 — user deleted (COPPA)", { status: 200 });
        }
        if (age < 18) {
          console.warn(
            `[clerk-webhook] age gate: deleting user ${id} with age ${age} (DOB ${dobYear}-${dobMonth})`
          );
          await deleteClerkUser(id);
          return new Response("Under 18 — user deleted", { status: 200 });
        }
      }
    }

    const email = email_addresses?.[0]?.email_address;
    const name = [first_name, last_name].filter(Boolean).join(" ") || "User";
    // Only mirror phones that are actually verified. An unverified
    // phone number on the Clerk user means someone started a flow
    // but hasn't proven ownership yet — writing that to our DB
    // would block legitimate signups of the same number. The verified
    // phone, if present, is picked over any unverified one.
    const verifiedPhone = phone_numbers?.find(
      (p) => p.verification?.status === "verified"
    );
    const phone = verifiedPhone?.phone_number ?? null;

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
      // B1: parallel pending_vouches claim. The two flows live in
      // separate tables (see migration 047) — invites is the legacy
      // Twilio-sent flow with email fallback, pending_vouches is the
      // sender-shares-via-their-own-Messages flow. Both can match on
      // phone, both can produce vouch rows. Order doesn't matter
      // because vouches.upsert is keyed on (voucher_id, vouchee_id).
      await claimPendingVouches(supabase, user.id, phone);
      // B8: alpha-only social-proof training wheels. Pick 3-4 random
      // demo presidents and have them auto-vouch FOR the new user
      // so the cold-start /profile is populated before they invite
      // anyone real. Always non-fatal — never blocks signup.
      await autoVouchFromDemoPresidents(supabase, user.id);
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

/**
 * B1: Auto-claim pending_vouches on user creation. Mirrors the
 * invites flow above but against the new pending_vouches table.
 *
 * Differences from claimPendingInvites:
 *   - Phone-only match (the table has no email column — share links
 *     are SMS-shaped from day one).
 *   - Multi-claim: the same phone can claim multiple pending rows,
 *     one per sender. We loop through all matches, each becoming a
 *     real vouch.
 *   - Mismatch logging happens in /join/[token]/complete (it has the
 *     URL token, the webhook does not). This function only fires the
 *     happy-path phone match.
 */
/**
 * B8: alpha-only social-proof training wheels.
 *
 * On every brand-new real-user signup, pick 3–4 random demo
 * presidents (B7 seed users where is_test_user = true) and create
 * a vouch FROM each picked president TO the new user, flagged
 * is_demo_origin = true. Visible only to the recipient on their
 * own profile (with a "Demo connection" pill); excluded from every
 * real-user-to-real-user trust read by the migration-054 RPC
 * filters and the .eq("is_demo_origin", false) filters in
 * src/lib/trust*.
 *
 * Skipped when:
 *   - the new user is themselves a test/demo user (impersonation
 *     spawn, seeded test account) — the test/real isolation rules
 *     already keep these populations apart and we don't want to
 *     mix test → test demo-origin rows into the demo subgraph
 *   - there are fewer than 3 demo presidents available (B7 hasn't
 *     shipped to this DB or was rolled back); a zero-vouch cold
 *     start is the safer default than a thin one
 *
 * Never throws. Failure to auto-vouch is logged but the signup
 * webhook still returns 200 — the worst-case is the new user
 * lands on an empty network (the existing pre-B8 behavior).
 */
async function autoVouchFromDemoPresidents(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  newUserId: string
): Promise<void> {
  try {
    // Confirm the new user isn't a test user themselves. Test-to-
    // test vouches must keep flowing through the normal seed scripts
    // (and the isolation trigger), not this auto-routine.
    const { data: newUser } = await supabase
      .from("users")
      .select("is_test_user")
      .eq("id", newUserId)
      .maybeSingle();
    if (!newUser || newUser.is_test_user === true) {
      return;
    }

    // Pull a slightly-larger pool than we need so a small skew or
    // a deleted president doesn't leave us under the floor. The
    // alpha demo population is 12–15 users so an in-memory shuffle
    // of the full set is cheap.
    const { data: demoUsers } = await supabase
      .from("users")
      .select("id")
      .eq("is_test_user", true);

    const pool = (demoUsers ?? []).map((u) => u.id as string);
    if (pool.length < 3) {
      console.warn(
        `[clerk-webhook] B8 auto-vouch skipped for ${newUserId}: only ${pool.length} demo users available (need 3+)`
      );
      return;
    }

    // Fisher–Yates pick of 3 or 4 distinct ids (50/50 either count
    // — the spec asks for "3-4 random", we randomize the count too
    // so two adjacent signups don't land on identical-shaped graphs).
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const pickCount = Math.random() < 0.5 ? 3 : 4;
    const picked = pool.slice(0, Math.min(pickCount, pool.length));

    // Build the rows. years_known_bucket=platform_met is the
    // "met through Trustead" bucket from migration 035a (0.4×
    // multiplier — the smallest possible weight) which honestly
    // represents the relationship: the demo president has not
    // actually known this user for any length of time. vouch_type
    // stays standard — inner_circle would imply close friendship.
    const rows = picked.map((presidentId) => ({
      voucher_id: presidentId,
      vouchee_id: newUserId,
      vouch_type: "standard" as const,
      years_known_bucket: "platform_met" as const,
      is_post_stay: false,
      is_staked: false,
      is_demo_origin: true,
    }));

    const { error } = await supabase
      .from("vouches")
      .upsert(rows, { onConflict: "voucher_id,vouchee_id" });

    if (error) {
      console.error(
        `[clerk-webhook] B8 auto-vouch failed for ${newUserId}:`,
        error
      );
    }
  } catch (e) {
    console.error(
      `[clerk-webhook] B8 auto-vouch threw for ${newUserId}:`,
      e
    );
  }
}

async function claimPendingVouches(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  newUserId: string,
  phone: string | null
) {
  if (!phone) return;

  const { data: rows } = await supabase
    .from("pending_vouches")
    .select("id, sender_id, vouch_type, years_known_bucket")
    .eq("status", "pending")
    .eq("recipient_phone", phone)
    .gt("expires_at", new Date().toISOString());

  if (!rows || rows.length === 0) return;

  for (const row of rows) {
    try {
      // Self-vouch guard. The create endpoint already blocks the
      // sender's own phone, but a sender who later changes their
      // own phone could end up matching their old pending row.
      if (row.sender_id === newUserId) {
        console.warn(
          `[clerk-webhook] skipping self-claim of pending_vouch ${row.id}`
        );
        continue;
      }

      await supabase.from("vouches").upsert(
        {
          voucher_id: row.sender_id,
          vouchee_id: newUserId,
          vouch_type: row.vouch_type,
          years_known_bucket: row.years_known_bucket,
          is_post_stay: false,
          is_staked: false,
        },
        { onConflict: "voucher_id,vouchee_id" }
      );

      // Mark this pending_vouch claimed. The phone stays on the row
      // (claimed != terminal-scrub) so we can reconcile later if the
      // user disputes.
      await supabase
        .from("pending_vouches")
        .update({
          status: "claimed",
          claimed_by: newUserId,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    } catch (e) {
      console.error(`Failed to claim pending_vouch ${row.id}:`, e);
    }
  }
}
