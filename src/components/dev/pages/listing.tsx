// REMOVE BEFORE BETA — Dev2 (design system page).
"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { PhotoGallery } from "@/components/listing/photo-gallery";
import { DescriptionSection } from "@/components/listing/description-section";
import { AmenitiesSection } from "@/components/listing/amenities-section";
import { ReviewsSection } from "@/components/listing/reviews-section";
import { BookingSidebar } from "@/components/listing/booking-sidebar";
import { GatedListingView } from "@/components/listing/gated-listing-view";
import { TrustTagPopover } from "@/components/trust/trust-tag-popover";
import { CancellationPolicyCard } from "@/components/booking/CancellationPolicyCard";
import { PAYMENT_METHOD_META } from "@/lib/payment-methods";
import {
  sampleListingDetail,
  sampleListingDetailGated,
  sampleTrustResultFull,
  sampleTrustResultGatedPreview,
  sampleListingAccessGated,
} from "@/lib/dev-theme/fixtures";
import { PageChrome } from "./Chrome";

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "H"
  );
}

export function ListingPageV1Full() {
  const listing = sampleListingDetail;
  const trust = sampleTrustResultFull;
  const price = listing.price_min ?? 0;
  const yearsHosting = listing.host
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(listing.host.created_at).getTime()) /
            (365 * 24 * 60 * 60 * 1000)
        )
      )
    : 0;

  return (
    <PageChrome>
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-40 md:px-6 md:pb-12">
        {/* Desktop title */}
        <div className="mt-4 hidden md:block">
          <h1 className="text-2xl font-semibold leading-tight md:text-3xl">
            {listing.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            {listing.avg_rating && listing.review_count > 0 && (
              <>
                <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
                <span className="font-semibold">
                  {listing.avg_rating.toFixed(2)}
                </span>
                <span className="text-muted-foreground">·</span>
                <a href="#reviews" className="font-semibold underline">
                  {listing.review_count}{" "}
                  {listing.review_count === 1 ? "review" : "reviews"}
                </a>
                <span className="text-muted-foreground">·</span>
              </>
            )}
            <span className="font-semibold underline">{listing.area_name}</span>
          </div>
        </div>

        {/* Photos */}
        <div id="photos" className="mt-4 -mx-4 md:mt-6 md:mx-0">
          <PhotoGallery photos={listing.photos} title={listing.title} />
        </div>

        {/* Mobile title */}
        <div className="mt-4 md:hidden">
          <h1 className="text-2xl font-semibold leading-tight">
            {listing.title}
          </h1>
        </div>

        {/* Two-column layout */}
        <div className="mt-6 grid grid-cols-1 gap-10 md:mt-8 md:grid-cols-3 md:gap-16">
          <div className="md:col-span-2">
            <div>
              <h2 className="text-xl font-semibold md:text-2xl">
                Entire {listing.property_label ?? "place"} in {listing.area_name}
              </h2>
              <p className="mt-1 text-muted-foreground">
                {listing.max_guests} guest
                {listing.max_guests !== 1 ? "s" : ""} · {listing.bedrooms}{" "}
                bedroom
                {listing.bedrooms !== 1 ? "s" : ""} · {listing.beds} bed
                {listing.beds !== 1 ? "s" : ""} · {listing.bathrooms} bath
                {listing.bathrooms !== 1 ? "s" : ""}
              </p>
            </div>

            <Separator className="my-8" />

            {/* Host card */}
            {listing.host && (
              <>
                <div className="flex items-center gap-4">
                  <Link
                    href={`/profile/${listing.host.id}`}
                    className="shrink-0 rounded-full transition-all hover:shadow-lg hover:ring-2 hover:ring-white"
                    aria-label={`Open ${listing.host.name}'s profile`}
                  >
                    <div className="relative h-14 w-14 overflow-hidden rounded-full bg-muted">
                      {listing.host.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={listing.host.avatar_url}
                          alt={listing.host.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-base font-semibold">
                          {initials(listing.host.name)}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div>
                    <Link
                      href={`/profile/${listing.host.id}`}
                      className="text-lg font-semibold hover:underline"
                    >
                      Hosted by {listing.host.name}
                    </Link>
                    <div className="mt-0.5">
                      <TrustTagPopover
                        targetUserId={listing.host.id}
                        direction="incoming"
                        size="medium"
                        score={trust.score}
                        degree={trust.degree}
                        direct={trust.hasDirectVouch}
                        connectorPaths={trust.connectorPaths}
                        hostRating={listing.host.host_rating}
                        hostReviewCount={listing.host.host_review_count}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {yearsHosting > 0
                        ? `${yearsHosting} year${
                            yearsHosting !== 1 ? "s" : ""
                          } hosting`
                        : "New host"}
                    </div>
                  </div>
                </div>
                <Separator className="my-8" />
              </>
            )}

            <section>
              <h2 className="mb-4 text-xl font-semibold">About this place</h2>
              <DescriptionSection text={listing.description} />
            </section>

            <Separator className="my-8" />

            <section id="amenities" className="scroll-mt-24">
              <h2 className="mb-6 text-xl font-semibold">
                What this place offers
              </h2>
              <AmenitiesSection amenities={listing.amenities} />
            </section>
          </div>

          <div className="md:col-span-1">
            <BookingSidebar
              listingId={listing.id}
              pricePerNight={price}
              cleaningFee={listing.cleaning_fee}
              minNights={listing.min_nights}
              maxNights={listing.max_nights}
              avgRating={listing.avg_rating}
              reviewCount={listing.review_count}
              blockedRanges={listing.blockedRanges}
              hostFirstName={
                listing.host?.name?.split(" ")[0] ?? "your host"
              }
              cancellationPolicy={listing.cancellation_policy}
              trust={
                trust
                  ? {
                      score: trust.score,
                      degree: trust.degree,
                      hasDirectVouch: trust.hasDirectVouch,
                      connectorPaths: trust.connectorPaths,
                    }
                  : null
              }
            />
          </div>
        </div>

        <Separator className="my-10" />

        <section id="reviews" className="scroll-mt-24">
          <ReviewsSection
            avgRating={listing.avg_rating}
            reviewCount={listing.review_count}
            reviews={listing.reviews}
          />
        </section>

        <Separator className="my-10" />

        <section>
          <h2 className="mb-6 text-xl font-semibold">Things to know</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="md:col-span-2">
              <h3 className="mb-3 font-semibold">
                Cancellation &amp; payment policy
              </h3>
              <CancellationPolicyCard
                policy={listing.cancellation_policy}
                scope="listing"
              />
            </div>
            <div>
              <h3 className="mb-3 font-semibold">House rules</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>
                  Check-in: {listing.checkin_time?.slice(0, 5) ?? "3:00 PM"}
                </li>
                <li>
                  Checkout:{" "}
                  {listing.checkout_time?.slice(0, 5) ?? "11:00 AM"}
                </li>
                <li>
                  Minimum stay: {listing.min_nights} night
                  {listing.min_nights !== 1 ? "s" : ""}
                </li>
                {listing.house_rules && (
                  <li className="whitespace-pre-wrap pt-2 text-foreground">
                    {listing.house_rules}
                  </li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="mb-3 font-semibold">Safety &amp; property</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>Smoke alarm</li>
                <li>Carbon monoxide alarm</li>
                <li>Security camera not on property</li>
              </ul>
            </div>
            {listing.host_payment_method_types.length > 0 && (
              <div className="md:col-span-2">
                <h3 className="mb-3 font-semibold">
                  How this host collects payment
                </h3>
                <div className="rounded-xl border border-border p-4">
                  <p className="mb-3 text-sm text-muted-foreground">
                    Once your stay is approved, you&apos;ll see the host&apos;s
                    handle to pay directly. Trustead doesn&apos;t process
                    payments.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {listing.host_payment_method_types.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-800"
                      >
                        {PAYMENT_METHOD_META.find((m) => m.key === t)?.label ??
                          t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </PageChrome>
  );
}

export function ListingPageV1Gated() {
  return (
    <PageChrome>
      <GatedListingView
        listing={sampleListingDetailGated}
        trust={sampleTrustResultGatedPreview}
        access={sampleListingAccessGated}
        isSignedIn
        pendingIntro={null}
      />
    </PageChrome>
  );
}
