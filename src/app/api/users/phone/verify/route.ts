export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/users/phone/verify — finalize the phone change after the
 * user enters the OTP. Attempts verification on Clerk, makes the
 * phone primary, removes any stale phones, and updates our DB.
 */
export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    phoneId?: string;
    code?: string;
    phone?: string;
  };
  const phoneId = typeof body.phoneId === "string" ? body.phoneId : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!phoneId || !code || !phone) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return Response.json({ error: "invalid_phone" }, { status: 400 });
  }

  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    return Response.json({ error: "server_misconfigured" }, { status: 500 });
  }

  // Attempt the OTP verification.
  const attemptRes = await fetch(
    `https://api.clerk.com/v1/phone_numbers/${phoneId}/verify`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    }
  );
  const attemptBody = (await attemptRes.json().catch(() => ({}))) as {
    verification?: { status?: string };
    errors?: Array<{ message?: string }>;
  };
  if (!attemptRes.ok || attemptBody.verification?.status !== "verified") {
    return Response.json(
      {
        error: "verify_failed",
        message:
          attemptBody.errors?.[0]?.message ||
          "Wrong code. Check the SMS and try again.",
      },
      { status: 400 }
    );
  }

  // Set the new phone as primary + destroy any stale phones on the
  // Clerk user so the primary is unambiguous going forward.
  const userRes = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const userBody = (await userRes.json().catch(() => ({}))) as {
    phone_numbers?: Array<{ id: string }>;
  };

  await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ primary_phone_number_id: phoneId }),
  });

  for (const p of userBody.phone_numbers ?? []) {
    if (p.id === phoneId) continue;
    await fetch(`https://api.clerk.com/v1/phone_numbers/${p.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${secret}` },
    }).catch(() => {});
  }

  // Mirror into our DB. The Clerk webhook would eventually do this
  // on its own, but that's a round-trip the user shouldn't wait for.
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("users")
    .update({ phone_number: phone })
    .eq("clerk_id", clerkId);
  if (error && (error as { code?: string }).code === "23505") {
    return Response.json(
      {
        error: "phone_already_registered",
        message:
          "This phone number is already registered. Sign in or use a different number.",
      },
      { status: 409 }
    );
  }

  return Response.json({ ok: true, phone });
}
