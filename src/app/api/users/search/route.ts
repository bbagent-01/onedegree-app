export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q) {
    return Response.json([]);
  }

  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .select("id, clerk_id, name, email, avatar_url")
    .ilike("name", `%${q}%`)
    .limit(10);

  if (error) {
    return new Response("Search failed", { status: 500 });
  }

  return Response.json(data);
}
