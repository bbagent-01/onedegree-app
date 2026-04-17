import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Star, Medal } from "lucide-react";
import { getListingDetail } from "@/lib/listing-detail-data";
import {
  computeTrustPath,
  getInternalUserIdFromClerk,
} from "@/lib/trust-data";
import { checkListingAccess } from "@/lib/trust/check-access";
import type { AccessSettings } from "@/lib/trust/types";
import { Separator } from "@/components/ui/separator";
import { PhotoGallery } from "@/components/listing/photo-gallery";
import { DescriptionSection } from "@/components/listing/description-section";
import { AmenitiesSection } from "@/components/listing/amenities-section";
import { ReviewsSection } from "@/components/listing/reviews-section";
import { BookingSidebar } from "@/components/listing/booking-sidebar";
import { AvailabilityCalendarWrapper } from "@/components/listing/availability-calendar-wrapper";
import { ConnectionPopover } from "@/components/trust/connection-breakdown";
import { ConnectionPath } from "@/components/trust/connection-path";
import { LocationMapClient } from "@/components/listing/location-map-client";
import { StickyAnchorBar } from "@/components/listing/sticky-anchor-bar";
import { GatedListingView } from "@/components/listing/gated-listing-view";
import { ListingTrustStatus } from "@/components/listing/listing-trust-status";
import { HostInlineMeta } from "@/components/trust/host-inline-meta";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function initials(name: string | undefined) {
  if (!name) return "H";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function yearsSince(iso: string | undefined | null) {
  if (!iso) return 0;
  const years =
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24 * 365);
  return Math.max(0, Math.floor(years));
}

function subtitle(propertyType: string, areaName: string) {
  const type =
    propertyType === "room"
      ? "Private room"
      : propertyType === "apartment"
        ? "Entire apartment"
        : propertyType === "house"
          ? "Entire home"
          : "Entire place";
  return `${type} in ${areaName}`;
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListingDetail(id);
  if (!listing) notFound();

  // Trust gating — compute viewer → host path, decide whether to show
  // the full listing or a gated preview. Host always sees their own.
  const { userId: clerkId } = await auth();
  const viewerId = await getInternalUserIdFromClerk(clerkId);
  const isHost = viewerId && viewerId === listing.host_id;
  const trust =
    viewerId && !isHost
      ? await computeTrustPath(viewerId, listing.host_id)
      : null;

  // For direct-link access to hidden listings, we evaluate access but
  // don't return NO_ACCESS. Hidden listings are always accessible via URL.
  const listingForAccess = {
    host_id: listing.host_id,
    // Treat hidden as preview_gated for direct link access (hidden only blocks browse)
    visibility_mode:
      (listing as unknown as { visibility_mode?: string }).visibility_mode === "hidden"
        ? "preview_gated"
        : (listing as unknown as { visibility_mode?: string }).visibility_mode,
    access_settings: (listing as unknown as { access_settings?: AccessSettings | null }).access_settings,
  };

  const access = checkListingAccess(
    viewerId ?? null,
    listingForAccess,
    trust?.score ?? 0,
    trust?.degree === 1 ? 1 : trust?.degree === 2 ? 2 : undefined
  );

  const canSeeFull = isHost || access.can_see_full;

  if (!canSeeFull) {
    return (
      <GatedListingView
        listing={listing}
        trust={trust}
        access={access}
        isSignedIn={Boolean(viewerId)}
      />
    );
  }

  const price = listing.price_min ?? listing.price_max ?? 0;
  const isSuperhost =
    (listing.host?.host_rating ?? 0) >= 4.8 &&
    (listing.host?.host_review_count ?? 0) >= 3;
  const yearsHosting = yearsSince(listing.host?.created_at);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-40 md:px-6 md:pb-12">
      <StickyAnchorBar
        pricePerNight={price}
        avgRating={listing.avg_rating}
        reviewCount={listing.review_count}
        canBook={isHost || access.can_request_book}
      />
      {/* Title (mobile: below photos, desktop: above). Trust info
          lives with the host, not the listing — see host card below. */}
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
          {isSuperhost && (
            <>
              <Medal className="h-3.5 w-3.5 text-foreground" />
              <span className="font-semibold">Superhost</span>
              <span className="text-muted-foreground">·</span>
            </>
          )}
          <span className="font-semibold underline">{listing.area_name}</span>
        </div>
      </div>

      {/* Photos */}
      <div id="photos" className="mt-4 md:mt-6 -mx-4 md:mx-0 scroll-mt-24">
        <PhotoGallery photos={listing.photos} title={listing.title} />
      </div>
      {/* Sticky anchor bar triggers here — anchors appear as soon as user
          scrolls past the photo gallery. */}
      <div id="photos-sentinel" className="h-0" />

      {/* Mobile title (below photos) */}
      <div className="mt-4 md:hidden">
        <h1 className="text-2xl font-semibold leading-tight">
          {listing.title}
        </h1>
      </div>

      {/* Two-column layout */}
      <div className="mt-6 grid grid-cols-1 gap-10 md:mt-8 md:grid-cols-3 md:gap-16">
        {/* Left column: content sections */}
        <div className="md:col-span-2">
          {/* Header subtitle + stats */}
          <div>
            <h2 className="text-xl font-semibold md:text-2xl">
              {subtitle(listing.property_type, listing.area_name)}
            </h2>
            <p className="mt-1 text-muted-foreground">
              {Math.max(listing.beds, 1) * 2} guests · {listing.bedrooms}{" "}
              bedroom{listing.bedrooms !== 1 ? "s" : ""} · {listing.beds} bed
              {listing.beds !== 1 ? "s" : ""} · {listing.bathrooms} bath
              {listing.bathrooms !== 1 ? "s" : ""}
            </p>
          </div>

          <Separator className="my-8" />

          {/* Host card */}
          {listing.host && (
            <>
              <div className="flex items-center gap-4">
                <ConnectionPopover targetUserId={listing.host.id}>
                  <div className="relative h-14 w-14 overflow-hidden rounded-full bg-muted cursor-pointer">
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
                    {isSuperhost && (
                      <div className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white ring-2 ring-white">
                        <Medal className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </ConnectionPopover>
                <div>
                  <div className="text-lg font-semibold">
                    Hosted by {listing.host.name}
                  </div>
                  {trust && (
                    <HostInlineMeta
                      score={trust.score}
                      connectionCount={trust.connectionCount}
                      direct={trust.hasDirectVouch}
                      hostRating={listing.host.host_rating}
                      hostReviewCount={listing.host.host_review_count}
                      className="mt-0.5"
                    />
                  )}
                  <div className="text-sm text-muted-foreground">
                    {yearsHosting > 0
                      ? `${yearsHosting} year${yearsHosting !== 1 ? "s" : ""} hosting`
                      : "New host"}
                    {isSuperhost ? " · Superhost" : ""}
                  </div>
                </div>
              </div>
              <Separator className="my-8" />
            </>
          )}

          {/* Description */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">About this place</h2>
            <DescriptionSection text={listing.description} />
          </section>

          <Separator className="my-8" />

          {/* Amenities */}
          <section id="amenities" className="scroll-mt-24">
            <h2 className="mb-6 text-xl font-semibold">
              What this place offers
            </h2>
            <AmenitiesSection amenities={listing.amenities} />
          </section>

          <Separator className="my-8" />

          {/* Availability Calendar — desktop only, and only when the
              viewer can actually request to book. Hiding the calendar
              for gated viewers keeps the "booking isn't available yet"
              message from feeling contradicted by a clickable picker. */}
          {(isHost || access.can_request_book) && (
            <section className="hidden md:block">
              <h2 className="mb-2 text-xl font-semibold">
                Select check-in date
              </h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Add your travel dates for exact pricing
              </p>
              <AvailabilityCalendarWrapper
                blockedRanges={listing.blockedRanges}
              />
            </section>
          )}
        </div>

        {/* Right column: booking sidebar OR trust status when booking
            is gated. We replace the date picker entirely when the viewer
            hasn't met the request_book threshold so they can't try to
            book something they can't request. */}
        <div className="md:col-span-1">
          {isHost || access.can_request_book ? (
            <BookingSidebar
              listingId={listing.id}
              pricePerNight={price}
              minNights={listing.min_nights}
              maxNights={listing.max_nights}
              avgRating={listing.avg_rating}
              reviewCount={listing.review_count}
              blockedRanges={listing.blockedRanges}
            />
          ) : (
            trust &&
            listing.host && (
              <div className="hidden md:block">
                <ListingTrustStatus
                  listingId={listing.id}
                  listingTitle={listing.title}
                  hostName={listing.host.name}
                  score={trust.score}
                  requiredScore={listing.min_trust_gate ?? 0}
                  canRequestBook={access.can_request_book}
                  canMessage={access.can_message}
                  canRequestIntro={access.can_request_intro}
                  mutualConnections={trust.mutualConnections}
                  pricePerNight={price}
                />
                {trust.path.length >= 2 && (
                  <div className="mt-3 rounded-2xl border border-border bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Your connection
                    </div>
                    <div className="mt-3 overflow-x-auto">
                      <ConnectionPath path={trust.path} compact />
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Mobile: trust status replaces the booking bar when gated. */}
      {!isHost && !access.can_request_book && trust && listing.host && (
        <div className="mt-6 md:hidden">
          <ListingTrustStatus
            listingId={listing.id}
            listingTitle={listing.title}
            hostName={listing.host.name}
            score={trust.score}
            requiredScore={listing.min_trust_gate ?? 0}
            canRequestBook={access.can_request_book}
            canMessage={access.can_message}
            canRequestIntro={access.can_request_intro}
            mutualConnections={trust.mutualConnections}
            pricePerNight={price}
          />
        </div>
      )}

      {/*
        Sticky anchor bar sentinel — placed at the end of the main booking
        grid so it scrolls above the viewport only after the sidebar's
        column has fully passed. This matches Airbnb: the reserve card
        sticks in its column until the end of the listing info, then the
        anchor bar appears at top.
      */}
      <div id="booking-sentinel" className="h-0" />

      <Separator className="my-10" />

      {/* Reviews */}
      <section id="reviews" className="scroll-mt-24">
        <ReviewsSection
          avgRating={listing.avg_rating}
          reviewCount={listing.review_count}
          reviews={listing.reviews}
        />
      </section>

      <Separator className="my-10" />

      {/* Location */}
      <section id="location" className="scroll-mt-24">
        <h2 className="mb-2 text-xl font-semibold">Where you&apos;ll be</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {listing.area_name}
        </p>
        <LocationMapClient
          lat={listing.latitude}
          lng={listing.longitude}
          areaName={listing.area_name}
        />
      </section>

      <Separator className="my-10" />

      {/* House rules */}
      <section>
        <h2 className="mb-6 text-xl font-semibold">Things to know</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-3 font-semibold">House rules</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                Check-in: {listing.checkin_time?.slice(0, 5) ?? "3:00 PM"}
              </li>
              <li>
                Checkout: {listing.checkout_time?.slice(0, 5) ?? "11:00 AM"}
              </li>
              <li>Minimum stay: {listing.min_nights} night{listing.min_nights !== 1 ? "s" : ""}</li>
              {listing.house_rules && (
                <li className="whitespace-pre-wrap pt-2 text-foreground">
                  {listing.house_rules}
                </li>
              )}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 font-semibold">Safety & property</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>Smoke alarm</li>
              <li>Carbon monoxide alarm</li>
              <li>Security camera not on property</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 font-semibold">Cancellation policy</h3>
            <p className="text-sm text-muted-foreground">
              Free cancellation before 48 hours of check-in. Review the full
              policy at the time of booking.
            </p>
          </div>
        </div>
      </section>

      {/* Host profile section */}
      {listing.host && (
        <>
          <Separator className="my-10" />
          <section>
            <h2 className="mb-6 text-xl font-semibold">
              Meet your host
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="rounded-xl border border-border/60 p-6 md:col-span-1">
                <div className="flex flex-col items-center text-center">
                  <ConnectionPopover targetUserId={listing.host.id}>
                    <div className="relative h-24 w-24 overflow-hidden rounded-full bg-muted cursor-pointer">
                      {listing.host.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={listing.host.avatar_url}
                          alt={listing.host.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl font-semibold">
                          {initials(listing.host.name)}
                        </div>
                      )}
                    </div>
                  </ConnectionPopover>
                  <div className="mt-3 text-xl font-semibold">
                    {listing.host.name}
                  </div>
                  {trust && (
                    <HostInlineMeta
                      score={trust.score}
                      connectionCount={trust.connectionCount}
                      direct={trust.hasDirectVouch}
                      hostRating={listing.host.host_rating}
                      hostReviewCount={listing.host.host_review_count}
                      className="mt-1"
                    />
                  )}
                  {isSuperhost && (
                    <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      <Medal className="h-3 w-3" />
                      Superhost
                    </div>
                  )}
                </div>
                <div className="mt-6 space-y-3 border-t border-border/60 pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Reviews</span>
                    <span className="font-semibold">
                      {listing.host.host_review_count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Rating</span>
                    <span className="font-semibold">
                      {listing.host.host_rating
                        ? listing.host.host_rating.toFixed(2)
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Years hosting
                    </span>
                    <span className="font-semibold">
                      {yearsHosting || "< 1"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="whitespace-pre-wrap text-base leading-relaxed">
                  {listing.host.bio ||
                    `${listing.host.name} is a host on One Degree BNB.`}
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
