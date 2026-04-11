import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getListingForViewer } from "@/lib/listing-data";
import { ListingDetailClient } from "./listing-detail-client";

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

  return <ListingDetailClient listing={listing} />;
}
