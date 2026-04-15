import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ChevronLeft, Star } from "lucide-react";
import { getListingDetail } from "@/lib/listing-detail-data";
import { ReserveForm } from "@/components/booking/reserve-form";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    from?: string;
    to?: string;
    guests?: string;
  }>;
}

function nightsBetween(from: string, to: string) {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ReservePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const { userId } = await auth();

  if (!userId) {
    redirect(`/sign-in?redirect_url=/listings/${id}/reserve`);
  }

  const listing = await getListingDetail(id);
  if (!listing) notFound();

  const checkIn = sp.from || "";
  const checkOut = sp.to || "";
  const guests = Math.max(1, parseInt(sp.guests || "1", 10) || 1);

  if (!checkIn || !checkOut) {
    redirect(`/listings/${id}`);
  }

  const price = listing.price_min ?? listing.price_max ?? 0;
  const nights = nightsBetween(checkIn, checkOut);
  const subtotal = price * nights;
  const cleaning = Math.round(subtotal * 0.08);
  const service = Math.round(subtotal * 0.12);
  const total = subtotal + cleaning + service;

  const cover = listing.photos[0]?.public_url || null;

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-6 md:px-6 md:py-10">
      <div className="mb-6 flex items-center gap-2">
        <Link
          href={`/listings/${id}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Back to listing"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold md:text-3xl">
          Request to book
        </h1>
      </div>

      <div className="grid gap-10 md:grid-cols-[1fr_400px]">
        {/* Left: details + form */}
        <div className="order-2 md:order-1">
          <section>
            <h2 className="text-xl font-semibold">Your trip</h2>
            <div className="mt-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold">Dates</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(checkIn)} – {formatDate(checkOut)}
                    <span className="text-muted-foreground">
                      {" · "}
                      {nights} night{nights === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold">Guests</div>
                  <div className="text-sm text-muted-foreground">
                    {guests} guest{guests === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="my-8 h-px bg-border" />

          <section>
            <h2 className="text-xl font-semibold">Message your host</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Share a quick intro about your trip. Hosts use this to decide
              whether to accept your request.
            </p>
            <ReserveForm
              listingId={id}
              checkIn={checkIn}
              checkOut={checkOut}
              guests={guests}
              total={total}
            />
          </section>

          <div className="my-8 h-px bg-border" />

          <section>
            <h2 className="text-xl font-semibold">House rules</h2>
            <div className="mt-3 rounded-xl border border-border bg-white p-4 text-sm">
              {listing.house_rules ? (
                <p className="whitespace-pre-line text-foreground">
                  {listing.house_rules}
                </p>
              ) : (
                <ul className="space-y-2 text-muted-foreground">
                  <li>
                    Check-in after {listing.checkin_time || "3:00 PM"}
                  </li>
                  <li>
                    Checkout before {listing.checkout_time || "11:00 AM"}
                  </li>
                  <li>No parties or events</li>
                  <li>No smoking</li>
                </ul>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                By selecting Confirm and reserve, you agree to follow the
                host&apos;s house rules and the One Degree BNB rebooking and
                refund policy.
              </p>
            </div>
          </section>
        </div>

        {/* Right: listing summary card */}
        <aside className="order-1 md:order-2">
          <div className="sticky top-24 rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="flex gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={listing.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">
                  {listing.property_type === "room"
                    ? "Private room"
                    : listing.property_type === "apartment"
                      ? "Entire apartment"
                      : "Entire home"}
                </div>
                <div className="line-clamp-2 text-sm font-semibold">
                  {listing.title}
                </div>
                {listing.avg_rating && listing.review_count > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    <Star className="h-3 w-3 fill-foreground text-foreground" />
                    <span className="font-semibold">
                      {listing.avg_rating.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">
                      · {listing.review_count} review
                      {listing.review_count === 1 ? "" : "s"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="my-6 h-px bg-border" />

            <h3 className="text-lg font-semibold">Price details</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="underline">
                  ${price} × {nights} night{nights === 1 ? "" : "s"}
                </span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="underline">Cleaning fee</span>
                <span>${cleaning.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="underline">Service fee</span>
                <span>${service.toLocaleString()}</span>
              </div>
              <div className="my-3 h-px bg-border" />
              <div className="flex justify-between text-base font-semibold">
                <span>Total before taxes</span>
                <span>${total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
