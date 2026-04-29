export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("onboarding_seen_at")
    .eq("clerk_id", userId)
    .maybeSingle();

  return Response.json({
    seen: Boolean(data?.onboarding_seen_at),
    seen_at: data?.onboarding_seen_at ?? null,
  });
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("users")
    .update({ onboarding_seen_at: now })
    .eq("clerk_id", userId);

  if (error) {
    console.error("onboarding_seen_at update error:", error);
    return Response.json({ error: "Failed to save" }, { status: 500 });
  }
  return Response.json({ seen: true, seen_at: now });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("users")
    .update({ onboarding_seen_at: null })
    .eq("clerk_id", userId);

  if (error) {
    console.error("onboarding_seen_at reset error:", error);
    return Response.json({ error: "Failed to reset" }, { status: 500 });
  }
  return Response.json({ seen: false, seen_at: null });
}
