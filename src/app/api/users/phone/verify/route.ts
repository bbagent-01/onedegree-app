export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  verifyChallengeCookie,
  COOKIE_NAME,
} from "@/lib/sms/otp-challenge";

/**
 * POST /api/users/phone/verify — finalize the phone change after the
 * user submits the OTP. Reads the signed challenge cookie, verifies
 * the code, then:
 *   1. creates the phone on the Clerk user as pre-verified (Backend
 *      API supports `verified: true` for this migration case; we've
 *      already proved ownership via our own SMS)
 *   2. sets it as primary + destroys any stale phones on the Clerk
 *      user
 *   3. writes it to our DB (mirrored by Clerk webhook on delay)
 */
function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

function clearCookieHeader(): [string, string] {
  return [
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
  ];
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    code?: string;
    phone?: string;
  };
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!code || !phone) {
    return Response.json(
      { error: "missing_fields", message: "Missing code or phone." },
      { status: 400 }
    );
  }
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return Response.json(
      { error: "invalid_phone", message: "Invalid phone format." },
      { status: 400 }
    );
  }

  const cookie = readCookie(req, COOKIE_NAME);
  if (!cookie) {
    return Response.json(
      {
        error: "no_challenge",
        message: "Verification expired. Send a new code.",
      },
      { status: 400 }
    );
  }

  const result = await verifyChallengeCookie(cookie, code, clerkId, phone);
  if (!result.ok) {
    const status = result.reason === "expired" ? 410 : 400;
    const message =
      result.reason === "wrong_code"
        ? "Wrong code. Check the SMS and try again."
        : result.reason === "expired"
          ? "Code expired. Send a new one."
          : "Verification failed.";
    return Response.json(
      { error: result.reason, message },
      { status }
    );
  }

  // Code checks out. Now update Clerk + our DB.
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    return Response.json({ error: "server_misconfigured" }, { status: 500 });
  }

  // Check existing phone numbers on the user to avoid creating a
  // duplicate if one is already there (e.g. from a prior session).
  const userRes = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const userBody = (await userRes.json().catch(() => ({}))) as {
    phone_numbers?: Array<{ id: string; phone_number: string }>;
  };

  let phoneId = userBody.phone_numbers?.find(
    (p) => p.phone_number === phone
  )?.id;

  if (!phoneId) {
    // Pre-verified: we already proved ownership via our own SMS OTP.
    const createRes = await fetch("https://api.clerk.com/v1/phone_numbers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: clerkId,
        phone_number: phone,
        verified: true,
      }),
    });
    const createBody = (await createRes.json().catch(() => ({}))) as {
      id?: string;
      errors?: Array<{ code?: string; message?: string }>;
    };
    if (!createRes.ok || !createBody.id) {
      const first = createBody.errors?.[0];
      if (
        first?.code === "form_identifier_exists" ||
        createRes.status === 422
      ) {
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
          message: first?.message || "Couldn't save phone on Clerk",
        },
        { status: 500 }
      );
    }
    phoneId = createBody.id;
  }

  // Mark primary + destroy stale.
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

  // Mirror into our DB.
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

  const headers = new Headers({ "Content-Type": "application/json" });
  const [k, v] = clearCookieHeader();
  headers.append(k, v);
  return new Response(JSON.stringify({ ok: true, phone }), { headers });
}
