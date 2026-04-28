export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { fetchProposalById } from "@/lib/proposals-data";
import {
  normalizeAccessSettings,
  type AccessSettings,
} from "@/lib/trust/types";

interface PatchBody {
  title?: string;
  description?: string;
  destinations?: string[];
  start_date?: string | null;
  end_date?: string | null;
  flexible_month?: string | null;
  guest_count?: number | null;
  hook_type?: "discount" | "trade" | "none";
  hook_details?: string | null;
  visibility_mode?: "inherit" | "custom";
  access_settings?: AccessSettings | null;
  status?: "active" | "closed";
}

/**
 * GET /api/proposals/[id]
 * Respects the same visibility rules as the feed (author always sees
 * their own; anyone else must pass the resolved audience check).
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const { userId } = await effectiveAuth();

  const supabase = getSupabaseAdmin();
  let viewerId: string | null = null;
  if (userId) {
    const { data: viewer } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();
    viewerId = (viewer as { id: string } | null)?.id ?? null;
  }

  const proposal = await fetchProposalById(id, viewerId);
  if (!proposal) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json({ proposal });
}

/**
 * PATCH /api/proposals/[id]
 * Author-only edits. kind is immutable (switching kinds would require
 * different mandatory fields). listing_id is also immutable — the
 * audience inheritance chain is pinned at create time so revoke-and-
 * repost is the right pattern if the host wants to re-point an offer.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: viewer } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!viewer) return Response.json({ error: "User not found" }, { status: 404 });

  const { data: existing } = await supabase
    .from("proposals")
    .select("id, author_id, kind, hook_type")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  if ((existing as { author_id: string }).author_id !== viewer.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as PatchBody | null;
  if (!body) return Response.json({ error: "Invalid body" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const t = body.title.trim();
    if (t.length < 1 || t.length > 120)
      return Response.json(
        { error: "Title must be 1–120 characters" },
        { status: 400 }
      );
    update.title = t;
  }
  if (body.description !== undefined) {
    const d = body.description.trim();
    if (d.length < 20 || d.length > 1000)
      return Response.json(
        { error: "Description must be 20–1000 characters" },
        { status: 400 }
      );
    update.description = d;
  }
  if (body.destinations !== undefined) {
    update.destinations = body.destinations
      .map((d) => d.trim())
      .filter((d) => d.length > 0)
      .slice(0, 10);
  }
  if (body.start_date !== undefined) update.start_date = body.start_date || null;
  if (body.end_date !== undefined) update.end_date = body.end_date || null;
  if (body.flexible_month !== undefined)
    update.flexible_month = body.flexible_month || null;
  if (body.guest_count !== undefined)
    update.guest_count = body.guest_count ?? null;
  if (body.hook_type !== undefined) update.hook_type = body.hook_type;
  if (body.hook_details !== undefined)
    update.hook_details = body.hook_details || null;
  if (body.visibility_mode !== undefined)
    update.visibility_mode = body.visibility_mode;
  if (body.access_settings !== undefined) {
    update.access_settings = body.access_settings
      ? normalizeAccessSettings(body.access_settings)
      : null;
  }
  if (body.status !== undefined) {
    if (body.status !== "active" && body.status !== "closed") {
      return Response.json(
        { error: "status must be 'active' or 'closed'" },
        { status: 400 }
      );
    }
    update.status = body.status;
  }

  // Hook invariant: hook_details required when hook_type is not 'none'.
  const finalHookType =
    (update.hook_type as string | undefined) ??
    (existing as { hook_type: string }).hook_type;
  if (finalHookType && finalHookType !== "none") {
    const hd =
      (update.hook_details as string | null | undefined) ??
      (body.hook_details as string | undefined);
    if (!hd || hd.trim().length < 3) {
      return Response.json(
        { error: "Hook details required when hook_type is set" },
        { status: 400 }
      );
    }
  }

  const { error } = await supabase.from("proposals").update(update).eq("id", id);
  if (error) {
    console.error("[proposals] patch error", error);
    return Response.json({ error: "Update failed" }, { status: 500 });
  }
  return Response.json({ ok: true });
}

/**
 * DELETE /api/proposals/[id]
 * Author-only. Hard-delete (no soft-delete column) since there's no
 * audit trail requirement and cascades clean up the deliveries log.
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: viewer } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!viewer) return Response.json({ error: "User not found" }, { status: 404 });

  const { data: existing } = await supabase
    .from("proposals")
    .select("id, author_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return Response.json({ ok: true });
  if ((existing as { author_id: string }).author_id !== viewer.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) {
    console.error("[proposals] delete error", error);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
