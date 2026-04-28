export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { issueReportMessage } from "@/lib/structured-messages";

const VALID_CATEGORY = new Set([
  "damage",
  "access",
  "amenity",
  "safety",
  "noise",
  "other",
]);
const VALID_SEVERITY = new Set(["low", "medium", "high"]);

/**
 * POST /api/issue-reports
 *
 * Creates an issue_reports row + posts a structured-message card
 * into the referenced thread. Reporter must be a participant on
 * the thread; stage-gating (during-stay / post-stay) is enforced
 * client-side — the API just checks participant membership so an
 * edge case (guest reports on the last hour before check-in, etc.)
 * isn't hard-blocked here.
 *
 * Body:
 *   { threadId, category, severity, description }
 */
export async function POST(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: me } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!me) return new Response("User not found", { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    threadId?: string;
    category?: string;
    severity?: string;
    description?: string;
  };
  const { threadId, category, severity, description } = body;

  if (!threadId) {
    return Response.json({ error: "Missing threadId" }, { status: 400 });
  }
  if (!category || !VALID_CATEGORY.has(category)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!severity || !VALID_SEVERITY.has(severity)) {
    return Response.json({ error: "Invalid severity" }, { status: 400 });
  }
  if (!description || description.trim().length < 20) {
    return Response.json(
      { error: "Please add at least 20 characters of detail." },
      { status: 400 }
    );
  }

  const { data: thread } = await supabase
    .from("message_threads")
    .select("id, guest_id, host_id, contact_request_id")
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }
  if (thread.guest_id !== me.id && thread.host_id !== me.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }
  if (!thread.contact_request_id) {
    return Response.json(
      { error: "Thread has no reservation to report against" },
      { status: 400 }
    );
  }

  const { data: report, error } = await supabase
    .from("issue_reports")
    .insert({
      contact_request_id: thread.contact_request_id,
      thread_id: thread.id,
      reporter_id: me.id,
      category,
      severity,
      description: description.trim(),
    })
    .select("id")
    .single();
  if (error || !report) {
    return Response.json(
      { error: "Failed to create report", detail: error?.message },
      { status: 500 }
    );
  }

  await supabase.from("messages").insert({
    thread_id: thread.id,
    sender_id: null,
    content: issueReportMessage(report.id),
    is_system: true,
  });

  return Response.json({ id: report.id });
}
