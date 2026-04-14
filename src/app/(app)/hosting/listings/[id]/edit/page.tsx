import { redirect, notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { EditListingForm } from "@/components/hosting/edit-listing-form";
import { parseListingMeta } from "@/lib/listing-meta";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/");

  const supabase = getSupabaseAdmin();
  const { data: currentUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();
  if (!currentUser) redirect("/");

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();
  if (!listing) notFound();
  if (listing.host_id !== currentUser.id) redirect("/hosting");

  const { data: photos } = await supabase
    .from("listing_photos")
    .select("id, public_url, storage_path, is_preview, sort_order")
    .eq("listing_id", id)
    .order("sort_order", { ascending: true });

  const { meta, body } = parseListingMeta(listing.description);

  return (
    <div className="mx-auto w-full max-w-[1024px] px-6 py-8 lg:px-10">
      <Link
        href="/hosting"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to hosting
      </Link>
      <h1 className="mt-3 text-3xl font-bold text-foreground">
        Edit {listing.title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Changes save immediately for each tab.
      </p>

      <div className="mt-8">
        <EditListingForm
          listingId={id}
          initial={{
            title: listing.title,
            description: body,
            property_type: listing.property_type,
            area_name: listing.area_name,
            price_min: listing.price_min,
            price_max: listing.price_max,
            amenities: listing.amenities || [],
            house_rules: listing.house_rules || "",
            min_nights: listing.min_nights ?? 1,
            checkin_time: listing.checkin_time || "15:00",
            checkout_time: listing.checkout_time || "11:00",
            meta,
            photos: photos || [],
          }}
        />
      </div>
    </div>
  );
}
