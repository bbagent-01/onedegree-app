export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * POST /api/issue-reports/[id]/acknowledge
 *
 * Counterparty (non-reporter participant) marks the issue as
 * acknowledged so the reporter knows the other side has seen it.
 * Idempotent: acknowledging an already-acknowledged report is a
 * no-op; acknowledging a resolved report returns 409.
 */
export async function POST(
  _req: Request,
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
    .select("id, thread_id, reporter_id, status")
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
  // Only the counterparty can acknowledge. The reporter
  // acknowledging their own issue is a no-op that would be
  // confusing — block it.
  if (report.reporter_id === me.id) {
    return Response.json(
      { error: "Only the other party can acknowledge" },
      { status: 403 }
    );
  }

  if (report.status === "resolved") {
    return Response.json(
      { error: "Already resolved" },
      { status: 409 }
    );
  }
  if (report.status === "acknowledged") {
    return Response.json({ ok: true, status: "acknowledged" });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("issue_reports")
    .update({
      status: "acknowledged",
      acknowledged_at: now,
      acknowledged_by: me.id,
    })
    .eq("id", id)
    .eq("status", "open");
  if (error) {
    return Response.json(
      { error: "Failed to acknowledge", detail: error.message },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, status: "acknowledged" });
}
