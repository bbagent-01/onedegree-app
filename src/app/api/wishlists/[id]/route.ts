export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

async function resolveOwnership(clerkId: string, wishlistId: string) {
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!user) return null;

  const { data: list } = await supabase
    .from("wishlists")
    .select("id, user_id, is_default, name")
    .eq("id", wishlistId)
    .maybeSingle();
  if (!list || list.user_id !== user.id) return null;

  return { userId: user.id as string, list };
}

/** PATCH /api/wishlists/[id] { name } — rename a wishlist. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as {
    name?: string;
  } | null;
  const name = (body?.name || "").trim();
  if (!name || name.length > 60) {
    return Response.json(
      { error: "Name must be 1–60 characters" },
      { status: 400 }
    );
  }

  const owned = await resolveOwnership(userId, id);
  if (!owned) return new Response("Not found", { status: 404 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("wishlists")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return Response.json({ error: "Failed to rename" }, { status: 500 });
  }
  return Response.json({ ok: true });
}

/** DELETE /api/wishlists/[id] — delete a wishlist (and its saved_listings rows). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const owned = await resolveOwnership(userId, id);
  if (!owned) return new Response("Not found", { status: 404 });

  // Don't let users delete their last remaining list — the heart
  // button needs somewhere to save to.
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("wishlists")
    .select("id", { count: "exact", head: true })
    .eq("user_id", owned.userId);
  if ((count ?? 0) <= 1) {
    return Response.json(
      { error: "Can't delete your last wishlist" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("wishlists").delete().eq("id", id);
  if (error) {
    return Response.json({ error: "Failed to delete" }, { status: 500 });
  }

  // If the deleted list was the default, promote another one.
  if (owned.list.is_default) {
    const { data: replacement } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", owned.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (replacement?.id) {
      await supabase
        .from("wishlists")
        .update({ is_default: true })
        .eq("id", replacement.id);
    }
  }

  return Response.json({ ok: true });
}
