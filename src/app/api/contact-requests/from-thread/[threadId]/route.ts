export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * POST /api/contact-requests/from-thread/[threadId]
 *
 * Host-initiated terms (S7, Task 2). After an intro is accepted, the
 * host can spin up a contact_request directly from the thread instead
 * of waiting for the guest to re-submit through the listing page.
 *
 * We insert a pending row tied to the thread's listing/guest/host and
 * pre-populate dates + guest count from the intro metadata when
 * available. The existing HostReviewTermsInline auto-renders for
 * pending rows, so the host lands straight in the compose step.
 *
 * Guards:
 *   - Viewer must be the thread's host_id (listing owner).
 *   - Thread must have a listing_id (intro threads already do).
 *   - No existing contact_request on this thread.
 *   - Intro status (if any) must be accepted.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ threadId: string }> }
) {
  const { userId } = await effectiveAuth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { threadId } = await ctx.params;
  if (!threadId) {
    return Response.json({ error: "threadId required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: viewer } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!viewer) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const { data: thread } = await supabase
    .from("message_threads")
    .select(
      "id, listing_id, guest_id, host_id, contact_request_id, is_intro_request, intro_status, intro_start_date, intro_end_date"
    )
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }
  if (thread.host_id !== viewer.id) {
    return Response.json(
      { error: "Only the host can send stay terms." },
      { status: 403 }
    );
  }
  if (!thread.listing_id) {
    return Response.json(
      { error: "Thread has no listing attached." },
      { status: 400 }
    );
  }
  if (thread.contact_request_id) {
    return Response.json(
      { error: "A reservation already exists on this thread." },
      { status: 400 }
    );
  }
  // If this is (or was) an intro thread, require that it was accepted
  // before terms can be sent. A declined intro shouldn't open a
  // booking path; pending intros mean the guest hasn't cleared the
  // gate yet.
  if (
    thread.intro_status &&
    thread.intro_status !== "accepted"
  ) {
    return Response.json(
      { error: "Intro must be accepted before sending stay terms." },
      { status: 400 }
    );
  }

  // Minimum placeholder message so the row satisfies any downstream
  // code that expects a non-null request message. Not surfaced in
  // the UI — the host immediately overwrites via the compose card.
  const { data: created, error } = await supabase
    .from("contact_requests")
    .insert({
      listing_id: thread.listing_id,
      guest_id: thread.guest_id,
      host_id: thread.host_id,
      status: "pending",
      message: "Host-initiated stay terms",
      check_in: thread.intro_start_date ?? null,
      check_out: thread.intro_end_date ?? null,
      guest_count: 1,
    })
    .select("id")
    .single();
  if (error || !created) {
    console.error("[from-thread] contact_request insert failed:", error);
    return Response.json(
      { error: "Couldn't start stay terms." },
      { status: 500 }
    );
  }

  // Link the thread back to the new row so getThreadDetail can
  // hydrate booking data and HostReviewTermsInline auto-renders.
  const { error: linkErr } = await supabase
    .from("message_threads")
    .update({ contact_request_id: created.id })
    .eq("id", threadId);
  if (linkErr) {
    console.error("[from-thread] thread link failed:", linkErr);
    return Response.json(
      { error: "Couldn't attach stay terms to thread." },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, contactRequestId: created.id });
}
