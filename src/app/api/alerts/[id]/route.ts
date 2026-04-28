export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

interface PatchBody {
  kind?: "trip_wish" | "host_offer" | "either";
  destinations?: string[];
  start_window?: string | null;
  end_window?: string | null;
  delivery?: "email" | "sms" | "both";
  status?: "active" | "paused";
}

async function authorizeOwner(id: string, clerkId: string) {
  const supabase = getSupabaseAdmin();
  const { data: viewer } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!viewer) return { error: "User not found" as const, status: 404 };
  const { data: existing } = await supabase
    .from("proposal_alerts")
    .select("id, subscriber_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "Not found" as const, status: 404 };
  if ((existing as { subscriber_id: string }).subscriber_id !== viewer.id) {
    return { error: "Forbidden" as const, status: 403 };
  }
  return { viewerId: viewer.id };
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const auth = await authorizeOwner(id, userId);
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as PatchBody | null;
  if (!body) return Response.json({ error: "Invalid body" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (body.kind !== undefined) update.kind = body.kind;
  if (body.destinations !== undefined) {
    update.destinations = body.destinations
      .map((d) => d.trim())
      .filter((d) => d.length > 0)
      .slice(0, 20);
  }
  if (body.start_window !== undefined)
    update.start_window = body.start_window || null;
  if (body.end_window !== undefined)
    update.end_window = body.end_window || null;
  if (body.delivery !== undefined) update.delivery = body.delivery;
  if (body.status !== undefined) update.status = body.status;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("proposal_alerts")
    .update(update)
    .eq("id", id);
  if (error) {
    console.error("[alerts] patch error", error);
    return Response.json({ error: "Update failed" }, { status: 500 });
  }
  return Response.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const auth = await authorizeOwner(id, userId);
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("proposal_alerts").delete().eq("id", id);
  if (error) {
    console.error("[alerts] delete error", error);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
