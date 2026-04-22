export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * POST /api/issue-reports/[id]/resolve
 *
 * Either party marks the issue resolved with an optional note.
 * Once resolved the card collapses to a small confirmation row —
 * no reopening in alpha (Loren handles escalations manually).
 *
 * Body: { note?: string }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: me } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!me) return new Response("User not found", { status: 404 });

  const { data: report } = await supabase
    .from("issue_reports")
    .select("id, thread_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!report) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { data: thread } = await supabase
    .from("message_threads")
    .select("guest_id, host_id")
    .eq("id", report.thread_id)
    .maybeSingle();
  if (
    !thread ||
    (thread.guest_id !== me.id && thread.host_id !== me.id)
  ) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  if (report.status === "resolved") {
    return Response.json({ ok: true, status: "resolved" });
  }

  const body = (await req.json().catch(() => ({}))) as { note?: string };
  const note = body.note?.trim() || null;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("issue_reports")
    .update({
      status: "resolved",
      resolved_at: now,
      resolved_by: me.id,
      resolution_note: note,
    })
    .eq("id", id)
    .neq("status", "resolved");
  if (error) {
    return Response.json(
      { error: "Failed to resolve", detail: error.message },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, status: "resolved" });
}
