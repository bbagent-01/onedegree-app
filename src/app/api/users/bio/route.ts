export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { bio } = await req.json();
  if (typeof bio !== "string") {
    return Response.json({ error: "Invalid bio" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("users")
    .update({ bio: bio.trim() || null })
    .eq("clerk_id", userId);

  if (error) {
    return Response.json({ error: "Failed to update bio" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
