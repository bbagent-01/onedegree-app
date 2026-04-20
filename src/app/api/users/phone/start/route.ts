export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendOtpSMS } from "@/lib/sms/send-otp";
import {
  buildChallengeCookie,
  generateCode,
  COOKIE_NAME,
  TTL_SECONDS,
} from "@/lib/sms/otp-challenge";

/**
 * POST /api/users/phone/start — issue a 6-digit OTP via Twilio for
 * phone-change verification. The OTP hash is stored in an HTTP-only
 * signed cookie so we don't need a DB table or Clerk's session-bound
 * verification flow (which triggers a reverification wall for
 * accounts whose only factor is the phone they're trying to change).
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

  const code = generateCode();
  const cookieValue = await buildChallengeCookie(phone, clerkId, code);

  const sms = await sendOtpSMS({ toPhone: phone, code });
  if (!sms.success) {
    return Response.json(
      {
        error: "sms_failed",
        message: sms.error ?? "Couldn't send verification code",
      },
      { status: 502 }
    );
  }

  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL_SECONDS}`
  );
  return new Response(JSON.stringify({ ok: true }), { headers });
}
