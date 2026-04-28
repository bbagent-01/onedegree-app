export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

export async function POST() {
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();

  // Mark the user as deactivated. Also flip all of their listings to
  // is_active=false so they disappear from browse. This is a soft delete —
  // no rows are removed.
  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("clerk_id", userId)
    .select("id")
    .maybeSingle();

  if (userErr || !userRow) {
    return Response.json({ error: "Failed to deactivate" }, { status: 500 });
  }

  await supabase
    .from("listings")
    .update({ is_active: false })
    .eq("host_id", userRow.id as string);

  return Response.json({ ok: true });
}
