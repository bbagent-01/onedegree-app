export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

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
  const { reportedUserId, stayConfirmationId, severity, handling, description } = body;

  if (!reportedUserId || !severity || !handling) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (currentUser.id === reportedUserId) {
    return Response.json({ error: "Cannot report yourself" }, { status: 400 });
  }

  const validSeverity = ["minor", "moderate", "serious"];
  const validHandling = ["excellent", "responsive", "poor", "terrible"];

  if (!validSeverity.includes(severity)) {
    return Response.json({ error: "Invalid severity" }, { status: 400 });
  }
  if (!validHandling.includes(handling)) {
    return Response.json({ error: "Invalid handling" }, { status: 400 });
  }

  const { data: incident, error } = await supabase
    .from("incidents")
    .insert({
      reporter_id: currentUser.id,
      reported_user_id: reportedUserId,
      stay_confirmation_id: stayConfirmationId || null,
      severity,
      handling,
      description: description || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Incident insert error:", error);
    return new Response("Failed to create incident", { status: 500 });
  }

  return Response.json({ id: incident.id });
}
