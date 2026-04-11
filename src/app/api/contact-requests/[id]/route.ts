export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// PATCH: host responds to a contact request (accept/decline)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) return new Response("User not found", { status: 404 });

  // Verify this request belongs to the current user as host
  const { data: request } = await supabase
    .from("contact_requests")
    .select("id, host_id, status")
    .eq("id", id)
    .single();

  if (!request) {
    return Response.json({ error: "Request not found" }, { status: 404 });
  }

  if (request.host_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  if (request.status !== "pending") {
    return Response.json({ error: "Request already responded to" }, { status: 400 });
  }

  const body = await req.json();
  const { status, hostResponseMessage } = body;

  if (!status || !["accepted", "declined"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const { error } = await supabase
    .from("contact_requests")
    .update({
      status,
      host_response_message: hostResponseMessage || null,
      responded_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Contact request update error:", error);
    return new Response("Failed to update", { status: 500 });
  }

  return Response.json({ ok: true });
}
