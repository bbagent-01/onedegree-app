import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getListingForViewer } from "@/lib/listing-data";
import { ListingDetailClient } from "./listing-detail-client";

export const runtime = "edge";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/");

  const supabase = getSupabaseAdmin();
  const { data: viewer } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!viewer) redirect("/");

  const listing = await getListingForViewer(id, viewer.id);

  if (!listing || !listing.access.canSeePreview) {
    redirect("/listings?error=not_found");
  }

  // Get trust score vs this host for locked state messaging
  let viewerScore = 0;
  if (listing.host_id !== viewer.id) {
    const { data: scores } = await supabase.rpc(
      "calculate_one_degree_scores",
      { p_viewer_id: viewer.id, p_target_ids: [listing.host_id] }
    );
    viewerScore = scores?.[0]?.score ?? 0;
  }

  // Fetch booked stays for this listing (confirmed stays) with guest info
  const { data: stayRows } = await supabase
    .from("stay_confirmations")
    .select("id, check_in, check_out, guest_id")
    .eq("listing_id", id)
    .or("host_confirmed.eq.true,guest_confirmed.eq.true");

  const guestIds = [...new Set((stayRows || []).map((s) => s.guest_id).filter(Boolean))];
  const { data: guestUsers } = guestIds.length
    ? await supabase.from("users").select("id, name, avatar_url").in("id", guestIds)
    : { data: [] };
  const guestMap = new Map((guestUsers || []).map((u) => [u.id, u]));

  const bookedStays = (stayRows || [])
    .filter((s) => s.check_in && s.check_out)
    .map((s) => {
      const guest = guestMap.get(s.guest_id);
      return {
        id: s.id,
        check_in: s.check_in as string,
        check_out: s.check_out as string,
        guest_name: guest?.name ?? undefined,
        guest_avatar_url: guest?.avatar_url ?? null,
      };
    });

  // Calendar settings from listing
  const calendarSettings = {
    min_nights: listing.min_nights ?? 1,
    max_nights: listing.max_nights ?? 365,
    prep_days: listing.prep_days ?? 0,
    advance_notice_days: listing.advance_notice_days ?? 1,
    availability_window_months: listing.availability_window_months ?? 12,
    checkin_time: listing.checkin_time ?? "15:00",
    checkout_time: listing.checkout_time ?? "11:00",
    blocked_checkin_days: listing.blocked_checkin_days ?? [],
    blocked_checkout_days: listing.blocked_checkout_days ?? [],
    default_availability_status: (listing.default_availability_status as "available" | "possibly_available" | "blocked") ?? null,
  };

  return (
    <ListingDetailClient
      listing={listing}
      viewerId={viewer.id}
      viewerScore={viewerScore}
      requiredScore={listing.min_trust_score}
      bookedStays={bookedStays}
      calendarSettings={calendarSettings}
    />
  );
}
