export const runtime = "edge";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { effectiveAuth } from "@/lib/impersonation/session";

/**
 * POST /api/stay-confirmations/[id]/host-review
 *
 * Track B simplified host-side review — host rates the guest after
 * checkout. Updates the running guest_rating average on users. The
 * DB trigger on users.guest_rating fans out to recompute vouch_power
 * for everyone who has vouched for this guest (migration 014b).
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
    .select("id")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const { data: stay } = await supabase
    .from("stay_confirmations")
    .select("*")
    .eq("id", id)
    .single();
  if (!stay) return Response.json({ error: "Stay not found" }, { status: 404 });
  if (stay.host_id !== currentUser.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  if (stay.check_out) {
    const today = new Date().toISOString().split("T")[0];
    if (stay.check_out > today) {
      return Response.json(
        { error: "You can review after checkout" },
        { status: 400 }
      );
    }
  }
  if (stay.guest_rating !== null) {
    return Response.json(
      { error: "You already reviewed this stay" },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    guestRating?: number;
    guestReviewText?: string | null;
  } | null;

  const guestRating = body?.guestRating;
  if (!guestRating || guestRating < 1 || guestRating > 5) {
    return Response.json(
      { error: "Guest rating (1-5) required" },
      { status: 400 }
    );
  }

  const { error: stayError } = await supabase
    .from("stay_confirmations")
    .update({
      guest_rating: guestRating,
      guest_review_text: body?.guestReviewText || null,
      host_confirmed: true,
    })
    .eq("id", id);
  if (stayError) {
    console.error("Host review error:", stayError);
    return Response.json({ error: "Failed to save review" }, { status: 500 });
  }

  // Recalculate guest's running average on users.guest_rating. The
  // trigger on users.guest_rating will propagate to vouch_power for
  // every voucher of this guest.
  const { data: guest } = await supabase
    .from("users")
    .select("guest_rating, guest_review_count")
    .eq("id", stay.guest_id)
    .single();
  if (guest) {
    const oldRating = Number(guest.guest_rating) || 0;
    const oldCount = guest.guest_review_count || 0;
    const newAvg = (oldRating * oldCount + guestRating) / (oldCount + 1);
    await supabase
      .from("users")
      .update({
        guest_rating: Math.round(newAvg * 100) / 100,
        guest_review_count: oldCount + 1,
      })
      .eq("id", stay.guest_id);
  }

  return Response.json({ ok: true });
}
