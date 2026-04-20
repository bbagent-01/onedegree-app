export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * PUT /api/users/phone — update the caller's DB phone_number after
 * Clerk has already verified the new number client-side. The Clerk
 * webhook also writes this on user.updated, but we do it here too so
 * the UI doesn't have to wait for the webhook round-trip before
 * reflecting the change.
 */
export async function PUT(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { phone?: string };
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) {
    return Response.json(
      { error: "invalid_phone", message: "Invalid phone format." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("users")
    .update({ phone_number: phone })
    .eq("clerk_id", clerkId);

  if (error) {
    if ((error as { code?: string }).code === "23505") {
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
      { error: "db_error", message: error.message },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, phone });
}
