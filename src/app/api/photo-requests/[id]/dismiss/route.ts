export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * POST /api/photo-requests/[id]/dismiss
 *
 * Requester cancels a pending photo request. Once the responder
 * has submitted a photo, dismissal is blocked — the card stays on
 * the submitted state so the photo remains visible in the thread.
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

  const { data: row } = await supabase
    .from("photo_requests")
    .select("id, requester_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (row.requester_id !== me.id) {
    return Response.json(
      { error: "Only the requester can cancel" },
      { status: 403 }
    );
  }
  if (row.status === "submitted") {
    return Response.json(
      { error: "Already submitted" },
      { status: 409 }
    );
  }
  if (row.status === "dismissed") {
    return Response.json({ ok: true, status: "dismissed" });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("photo_requests")
    .update({
      status: "dismissed",
      dismissed_at: now,
    })
    .eq("id", id)
    .eq("status", "pending");
  if (error) {
    return Response.json(
      { error: "Failed to dismiss", detail: error.message },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, status: "dismissed" });
}
