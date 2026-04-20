export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/users/phone/start — add a new phone number to the caller's
 * Clerk user and kick off SMS verification. Server-side flow so we
 * can use the Clerk Backend API and skip client reverification
 * prompts (they would otherwise fire because phone changes are a
 * sensitive action, and in some account setups there's no valid
 * reverification factor available).
 *
 * Also refuses when another user already owns the phone.
 */
export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { phone?: string };
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) {
    return Response.json(
      { error: "invalid_phone", message: "Enter a valid phone number." },
      { status: 400 }
    );
  }

  // Uniqueness guard against our own DB. Clerk has its own unique
  // check across its user pool but can't see our DB.
  const supabase = getSupabaseAdmin();
  const { data: conflict } = await supabase
    .from("users")
    .select("id, clerk_id")
    .eq("phone_number", phone)
    .maybeSingle();
  if (conflict && conflict.clerk_id !== clerkId) {
    return Response.json(
      {
        error: "phone_already_registered",
        message:
          "This phone number is already registered. Sign in or use a different number.",
      },
      { status: 409 }
    );
  }

  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    return Response.json(
      { error: "server_misconfigured", message: "Clerk key missing" },
      { status: 500 }
    );
  }

  // Step 1: create the phone number on the Clerk user.
  const createRes = await fetch("https://api.clerk.com/v1/phone_numbers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: clerkId, phone_number: phone }),
  });
  const createBody = (await createRes.json().catch(() => ({}))) as Record<
    string,
    unknown
  > & { id?: string; errors?: Array<{ code?: string; message?: string }> };
  if (!createRes.ok) {
    const first = createBody.errors?.[0];
    // Clerk's "already exists" surfaces as a 422 — translate so the
    // UI shows the same copy as our own DB check.
    if (first?.code === "form_identifier_exists" || createRes.status === 422) {
      return Response.json(
        {
          error: "phone_already_registered",
          message:
            "This phone number is already registered. Sign in or use a different number.",
        },
        { status: 409 }
      );
    }
    return Response.json(
      {
        error: "clerk_create_failed",
        message: first?.message || "Couldn't add phone",
      },
      { status: 500 }
    );
  }

  const phoneId = createBody.id;
  if (!phoneId) {
    return Response.json(
      { error: "no_phone_id", message: "Clerk returned no id" },
      { status: 500 }
    );
  }

  // Step 2: kick off SMS verification on that phone.
  const prepRes = await fetch(
    `https://api.clerk.com/v1/phone_numbers/${phoneId}/verification`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ strategy: "phone_code" }),
    }
  );
  if (!prepRes.ok) {
    const prepBody = (await prepRes.json().catch(() => ({}))) as {
      errors?: Array<{ message?: string }>;
    };
    return Response.json(
      {
        error: "prep_failed",
        message:
          prepBody.errors?.[0]?.message || "Couldn't send verification code",
      },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, phoneId });
}
