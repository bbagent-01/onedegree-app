import { redirect, notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { EditListingForm } from "@/components/hosting/edit-listing-form";
import { parseListingMeta } from "@/lib/listing-meta";
import Link from "next/link";
import { ChevronLeft, ExternalLink } from "lucide-react";

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
  const coverPhoto =
    (photos || []).find((p) => p.is_preview) || (photos || [])[0];

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto w-full max-w-[1100px] px-6 py-8 lg:px-10">
        <Link
          href="/hosting"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to hosting
        </Link>

        {/* Hero card */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:p-8">
            <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl bg-muted md:h-32 md:w-48">
              {coverPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverPhoto.public_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No photo
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={
                    listing.is_active
                      ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                      : "inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700"
                  }
                >
                  <span
                    className={
                      listing.is_active
                        ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
                        : "h-1.5 w-1.5 rounded-full bg-zinc-500"
                    }
                  />
                  {listing.is_active ? "Listed" : "Paused"}
                </span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {listing.area_name}
                </span>
              </div>
              <h1 className="mt-2 truncate text-2xl font-bold text-foreground md:text-3xl">
                {listing.title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Edit details, photos, pricing, and availability. Each section
                saves on its own.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                href={`/listings/${listing.id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40"
              >
                <ExternalLink className="h-4 w-4" />
                View public page
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6">
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
              advance_notice_days: listing.advance_notice_days ?? 1,
              prep_days: listing.prep_days ?? 0,
              checkin_time: listing.checkin_time || "15:00",
              checkout_time: listing.checkout_time || "11:00",
              meta,
              photos: photos || [],
            }}
          />
        </div>
      </div>
    </div>
  );
}
