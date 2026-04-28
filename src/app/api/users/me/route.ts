export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getEffectiveUserId } from "@/lib/impersonation/session";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // ALPHA ONLY: when an admin is impersonating, /me returns the
  // target user's identity so the navbar and other identity-shaped
  // UI reflects the impersonated session. `getEffectiveUserId`
  // falls back to the real user's id when impersonation is off.
  const effectiveId = await getEffectiveUserId(userId);
  if (!effectiveId) return Response.json({ error: "Not found" }, { status: 404 });

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("id, name, email, avatar_url, phone_number")
    .eq("id", effectiveId)
    .maybeSingle();

  if (!data) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(data);
}
