export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const ALLOWED_KEYS = [
  "booking_request",
  "booking_confirmed",
  "booking_declined",
  "new_message",
  "checkin_reminder",
  "review_reminder",
] as const;

type EmailPrefKey = (typeof ALLOWED_KEYS)[number];

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("email_prefs")
    .eq("clerk_id", userId)
    .single();
  return Response.json({ prefs: data?.email_prefs || {} });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: currentUser } = await supabase
    .from("users")
    .select("id, email_prefs")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as {
    prefs?: Partial<Record<EmailPrefKey, boolean>>;
  } | null;
  if (!body?.prefs) {
    return Response.json({ error: "Missing prefs" }, { status: 400 });
  }

  const merged: Record<string, boolean> = {
    ...((currentUser.email_prefs as Record<string, boolean>) || {}),
  };
  for (const key of ALLOWED_KEYS) {
    if (typeof body.prefs[key] === "boolean") {
      merged[key] = body.prefs[key]!;
    }
  }

  const { error } = await supabase
    .from("users")
    .update({ email_prefs: merged })
    .eq("id", currentUser.id);
  if (error) {
    console.error("email_prefs update error:", error);
    return Response.json({ error: "Failed to save" }, { status: 500 });
  }
  return Response.json({ prefs: merged });
}
