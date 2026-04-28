export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * POST /api/contact-requests/[id]/cancel
 * Guest cancels a pending or confirmed booking. Posts a system message
 * into the thread and flips status to "cancelled".
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: currentUser } = await supabase
    .from("users")
    .select("id, name")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const { data: request } = await supabase
    .from("contact_requests")
    .select("id, host_id, guest_id, listing_id, status, check_in, check_out")
    .eq("id", id)
    .single();
  if (!request) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }

  // Only the guest who created the request can cancel from this endpoint
  if (request.guest_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  if (request.status === "cancelled") {
    return Response.json({ error: "Already cancelled" }, { status: 400 });
  }
  if (request.status === "declined") {
    return Response.json({ error: "Can't cancel a declined request" }, { status: 400 });
  }

  // Don't allow cancelling a stay that already happened
  if (request.check_out) {
    const today = new Date().toISOString().split("T")[0];
    if (request.check_out < today) {
      return Response.json(
        { error: "This stay has already happened" },
        { status: 400 }
      );
    }
  }

  const { error: updateError } = await supabase
    .from("contact_requests")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: currentUser.id,
    })
    .eq("id", id);
  if (updateError) {
    console.error("Cancel error:", updateError);
    return Response.json({ error: "Failed to cancel" }, { status: 500 });
  }

  // System message into the thread
  const { data: thread } = await supabase
    .from("message_threads")
    .select("id")
    .eq("listing_id", request.listing_id)
    .eq("guest_id", request.guest_id)
    .maybeSingle();
  if (thread) {
    const guestLabel = currentUser.name?.split(" ")[0] || "Guest";
    await supabase.from("messages").insert({
      thread_id: thread.id,
      sender_id: null,
      content: `${guestLabel} cancelled this reservation.`,
      is_system: true,
    });
  }

  return Response.json({ ok: true });
}
