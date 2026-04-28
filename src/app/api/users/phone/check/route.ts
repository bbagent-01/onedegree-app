export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/users/phone/check — pre-flight check before we ask Clerk
 * to send an OTP. Returns 409 when the phone belongs to a different
 * user so the settings UI can refuse to start a verification flow
 * that would ultimately fail.
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

  return Response.json({ ok: true });
}
