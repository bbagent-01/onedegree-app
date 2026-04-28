export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * POST /api/incidents
 *
 * Two shapes, one table:
 *
 *   Post-stay incident (legacy)
 *     { reportedUserId, severity, handling, stayConfirmationId?, description? }
 *
 *   User-initiated abuse report (Alpha-C S2)
 *     { reportedUserId, reason, description, sourceContext? }
 *
 *   Where reason ∈ harassment · safety_concern · misrepresentation · scam · other
 *   And sourceContext is a JSON object — e.g.
 *     { source: "profile" }
 *     { source: "thread", thread_id, message_id }
 */

const VALID_SEVERITY = ["minor", "moderate", "serious"];
const VALID_HANDLING = ["excellent", "responsive", "poor", "terrible"];
const VALID_REASONS = [
  "harassment",
  "safety_concern",
  "misrepresentation",
  "scam",
  "other",
];

export async function POST(req: Request) {
  const { userId } = await effectiveAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) return new Response("User not found", { status: 404 });

  const body = await req.json();
  const {
    reportedUserId,
    stayConfirmationId,
    severity,
    handling,
    description,
    reason,
    sourceContext,
  } = body as {
    reportedUserId?: string;
    stayConfirmationId?: string;
    severity?: string;
    handling?: string;
    description?: string;
    reason?: string;
    sourceContext?: Record<string, unknown>;
  };

  if (!reportedUserId) {
    return Response.json({ error: "Missing reportedUserId" }, { status: 400 });
  }
  if (currentUser.id === reportedUserId) {
    return Response.json({ error: "Cannot report yourself" }, { status: 400 });
  }

  const isAbuseReport = !!reason;
  const isPostStay = !!severity || !!handling;

  if (!isAbuseReport && !isPostStay) {
    return Response.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (isAbuseReport) {
    if (!VALID_REASONS.includes(reason!)) {
      return Response.json({ error: "Invalid reason" }, { status: 400 });
    }
    if (!description || description.trim().length < 50) {
      return Response.json(
        { error: "Please add at least 50 characters of detail." },
        { status: 400 }
      );
    }
  } else {
    if (!severity || !handling) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (!VALID_SEVERITY.includes(severity)) {
      return Response.json({ error: "Invalid severity" }, { status: 400 });
    }
    if (!VALID_HANDLING.includes(handling)) {
      return Response.json({ error: "Invalid handling" }, { status: 400 });
    }
  }

  const { data: incident, error } = await supabase
    .from("incidents")
    .insert({
      reporter_id: currentUser.id,
      reported_user_id: reportedUserId,
      stay_confirmation_id: stayConfirmationId || null,
      severity: severity || null,
      handling: handling || null,
      description: description || null,
      reason: reason || null,
      source_context: sourceContext || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Incident insert error:", error);
    return new Response("Failed to create incident", { status: 500 });
  }

  return Response.json({ id: incident.id });
}
