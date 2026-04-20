export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("id, name, email, avatar_url, phone_number")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (!data) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(data);
}
