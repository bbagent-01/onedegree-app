export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

interface ProfileUpdate {
  name?: string;
  bio?: string | null;
  location?: string | null;
  occupation?: string | null;
  languages?: string[] | null;
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  let body: ProfileUpdate;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length === 0 || name.length > 80) {
      return Response.json({ error: "Name must be 1–80 chars" }, { status: 400 });
    }
    update.name = name;
  }

  if (body.bio !== undefined) {
    if (body.bio === null) {
      update.bio = null;
    } else if (typeof body.bio === "string") {
      if (body.bio.length > 300) {
        return Response.json({ error: "Bio max 300 chars" }, { status: 400 });
      }
      update.bio = body.bio.trim() || null;
    }
  }

  if (body.location !== undefined) {
    update.location =
      typeof body.location === "string" && body.location.trim()
        ? body.location.trim().slice(0, 120)
        : null;
  }

  if (body.occupation !== undefined) {
    update.occupation =
      typeof body.occupation === "string" && body.occupation.trim()
        ? body.occupation.trim().slice(0, 120)
        : null;
  }

  if (body.languages !== undefined) {
    if (body.languages === null) {
      update.languages = null;
    } else if (Array.isArray(body.languages)) {
      const langs = body.languages
        .filter((l): l is string => typeof l === "string")
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && l.length <= 40)
        .slice(0, 10);
      update.languages = langs.length > 0 ? langs : null;
    }
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("users")
    .update(update)
    .eq("clerk_id", userId);

  if (error) {
    return Response.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
