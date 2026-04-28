export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";
import { photoRequestMessage } from "@/lib/structured-messages";

/**
 * POST /api/photo-requests
 *
 * Creates a photo_requests row + posts the structured-message
 * card. Either thread participant can create; the OTHER
 * participant is the responder.
 *
 * Body: { threadId, prompt }
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
    prompt?: string;
  };
  const { threadId, prompt } = body;

  if (!threadId) {
    return Response.json({ error: "Missing threadId" }, { status: 400 });
  }
  if (!prompt || prompt.trim().length < 3) {
    return Response.json(
      { error: "Please add a short description of what to photograph." },
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
      { error: "Thread has no reservation to request a photo against" },
      { status: 400 }
    );
  }

  const responderId =
    thread.guest_id === me.id ? thread.host_id : thread.guest_id;

  const { data: row, error } = await supabase
    .from("photo_requests")
    .insert({
      contact_request_id: thread.contact_request_id,
      thread_id: thread.id,
      requester_id: me.id,
      responder_id: responderId,
      prompt: prompt.trim(),
    })
    .select("id")
    .single();
  if (error || !row) {
    return Response.json(
      { error: "Failed to create request", detail: error?.message },
      { status: 500 }
    );
  }

  await supabase.from("messages").insert({
    thread_id: thread.id,
    sender_id: null,
    content: photoRequestMessage(row.id),
    is_system: true,
  });

  return Response.json({ id: row.id });
}
