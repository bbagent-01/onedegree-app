import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getEffectiveUserId } from "@/lib/impersonation/session";
import {
  DEFAULT_ACCESS_SETTINGS,
  normalizeAccessSettings,
  type AccessSettings,
} from "@/lib/trust/types";
import { countActiveProposalsByAuthor } from "@/lib/proposals-data";
import { NewProposalForm } from "@/components/proposals/new-proposal-form";

const HOST_OFFER_CAP = 5;

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function NewProposalPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in?redirect=/proposals/new");
  const viewerId = await getEffectiveUserId(clerkId);
  if (!viewerId) redirect("/sign-in?redirect=/proposals/new");

  const supabase = getSupabaseAdmin();
  const { data: listingRows } = await supabase
    .from("listings")
    .select("id, title, area_name, access_settings, visibility_mode")
    .eq("host_id", viewerId)
    .eq("is_active", true)
    .or("visibility_mode.neq.hidden,visibility_mode.is.null")
    .order("created_at", { ascending: false });

  const myListings = ((listingRows ?? []) as {
    id: string;
    title: string;
    area_name: string;
    access_settings: AccessSettings | null;
    visibility_mode: string | null;
  }[]).map((l) => ({
    id: l.id,
    title: l.title,
    area_name: l.area_name,
    see_preview_rule:
      normalizeAccessSettings(l.access_settings).see_preview,
  }));

  // Pre-resolve active-count caps so the form can gate the kind toggle
  // at render-time instead of letting the user fill everything out and
  // then rejecting with a 409. Host Offers cap at 5, Trip Wishes are
  // uncapped.
  const counts = await countActiveProposalsByAuthor(viewerId);
  const hostOfferCapReached = counts.host_offer >= HOST_OFFER_CAP;

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6 md:px-6 md:py-10">
      <h1 className="font-serif text-2xl font-semibold md:text-3xl">Create a proposal</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Trip Wishes tell hosts where you want to go. Host Offers surface
        availability for people in your preview network.
      </p>
      <NewProposalForm
        myListings={myListings}
        profileDefaultRule={DEFAULT_ACCESS_SETTINGS.see_preview}
        hostOfferCapReached={hostOfferCapReached}
        hostOfferActiveCount={counts.host_offer}
        hostOfferCap={HOST_OFFER_CAP}
      />
    </div>
  );
}
