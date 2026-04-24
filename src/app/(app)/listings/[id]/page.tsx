import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Star } from "lucide-react";
import { getListingDetail } from "@/lib/listing-detail-data";
import { computeIncomingTrustPath } from "@/lib/trust-data";
import { getEffectiveUserId } from "@/lib/impersonation/session";
import {
  checkListingAccess,
  hasActiveListingAccessGrant,
} from "@/lib/trust/check-access";
import type { AccessSettings } from "@/lib/trust/types";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { PendingIntroSummary } from "@/components/listing/gated-listing-cta";
import { Separator } from "@/components/ui/separator";
import { PhotoGallery } from "@/components/listing/photo-gallery";
import { DescriptionSection } from "@/components/listing/description-section";
import { AmenitiesSection } from "@/components/listing/amenities-section";
import { ReviewsSection } from "@/components/listing/reviews-section";
import { BookingSidebar } from "@/components/listing/booking-sidebar";
import { AvailabilityCalendarWrapper } from "@/components/listing/availability-calendar-wrapper";
import { LocationMapClient } from "@/components/listing/location-map-client";
import { StickyAnchorBar } from "@/components/listing/sticky-anchor-bar";
import { GatedListingView } from "@/components/listing/gated-listing-view";
import { TrustTagPopover } from "@/components/trust/trust-tag-popover";
import { CancellationPolicyCard } from "@/components/booking/CancellationPolicyCard";
import { PAYMENT_METHOD_META } from "@/lib/payment-methods";

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
  // Anonymous viewers are allowed in as far as the preview gate lets
  // them; if even that denies them, we bounce to sign-in.
  const { userId: clerkId } = await auth();
  // ALPHA ONLY: impersonation-aware viewer resolution.
  const viewerId = await getEffectiveUserId(clerkId);
  const isHost = viewerId && viewerId === listing.host_id;
  const trust =
    viewerId && !isHost
      ? await computeIncomingTrustPath(listing.host_id, viewerId)
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

  // Pair-scoped intro-accept grant: if the viewer holds an active
  // grant from this listing's host, full-listing access is unlocked
  // regardless of trust score or specific_people rules.
  const hasGrant = viewerId
    ? await hasActiveListingAccessGrant(listing.host_id, viewerId)
    : false;

  const access = checkListingAccess(
    viewerId ?? null,
    listingForAccess,
    trust?.score ?? 0,
    trust?.degree ?? null,
    hasGrant
  );

  // If even the preview is denied — and the viewer isn't signed in —
  // bounce to sign-in so they can authenticate and retry. Signed-in
  // viewers who are still denied get the gated 404-ish experience.
  if (!isHost && !access.can_see_preview) {
    if (!clerkId) {
      redirect(
        `/sign-in?redirect_url=${encodeURIComponent(`/listings/${id}`)}`
      );
    }
    notFound();
  }

  const canSeeFull = isHost || access.can_see_full;

  // Detect an intro request on this listing so the preview CTA can
  // flip between states without re-prompting. The sender's pill
  // state reads directly off intro_status + whether the recipient
  // has replied in the thread. We fetch once here and hand it down.
  let pendingIntro: PendingIntroSummary | null = null;
  if (viewerId && !canSeeFull) {
    const supabase = getSupabaseAdmin();
    const { data: pending } = await supabase
      .from("message_threads")
      .select(
        "id, intro_status, intro_decided_at, last_message_at, intro_recipient_id"
      )
      .eq("listing_id", id)
      .eq("intro_sender_id", viewerId)
      .in("intro_status", ["pending", "accepted", "declined", "ignored"])
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pending) {
      // Recipient reply detection — lets the sender's pill flip from
      // "Waiting" to "Conversation started" while intro_status stays
      // pending. One cheap count query.
      let recipientReplied = false;
      const { data: replyRows } = await supabase
        .from("messages")
        .select("id")
        .eq("thread_id", pending.id)
        .eq("sender_id", pending.intro_recipient_id)
        .eq("is_system", false)
        .limit(1);
      recipientReplied = (replyRows || []).length > 0;
      pendingIntro = {
        threadId: pending.id as string,
        status: pending.intro_status as
          | "pending"
          | "accepted"
          | "declined"
          | "ignored",
        decidedAt:
          (pending as { intro_decided_at?: string | null })
            .intro_decided_at ?? null,
        recipientReplied,
      };
    }
  }

  if (!canSeeFull) {
    return (
      <GatedListingView
        listing={listing}
        trust={trust}
        access={access}
        isSignedIn={Boolean(viewerId)}
        pendingIntro={pendingIntro}
      />
    );
  }

  const price = listing.price_min ?? listing.price_max ?? 0;
  const yearsHosting = yearsSince(listing.host?.created_at);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-40 md:px-6 md:pb-12">
      <StickyAnchorBar
        pricePerNight={price}
        avgRating={listing.avg_rating}
        reviewCount={listing.review_count}
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

          {/* Host card — S5 click model.
              - Avatar: Link to /profile/[host.id], soft drop-shadow
                on hover.
              - Name ("Hosted by …"): Link to /profile/[host.id],
                underline on hover.
              - TrustTag pill: ConnectionPopover opens the trust
                detail in a white rounded card below it (base-ui
                Popover primitive). */}
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
                  {trust && (
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
                  )}
                  <div className="text-sm text-muted-foreground">
                    {yearsHosting > 0
                      ? `${yearsHosting} year${yearsHosting !== 1 ? "s" : ""} hosting`
                      : "New host"}
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

          {/* Availability Calendar — desktop only. Always shown on
              the full listing page under the collapsed model. */}
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
        </div>

        {/* Right column: booking sidebar. Under the collapsed model
            anyone who can see the full listing can also request to
            book (one gate), so we always render the full sidebar here
            — if the viewer was gated we'd have rendered GatedListingView
            at the top of the route instead. */}
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
          {/* Cancellation policy promoted above house rules so
              guests see the money commitment before the rules of
              the place. */}
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
          {listing.host_payment_method_types.length > 0 && (
            <div className="md:col-span-2">
              <h3 className="mb-3 font-semibold">
                How this host collects payment
              </h3>
              <div className="rounded-xl border border-border p-4">
                <p className="mb-3 text-sm text-muted-foreground">
                  Once your stay is approved, you&apos;ll see the host&apos;s
                  handle to pay directly. 1° B&amp;B doesn&apos;t process
                  payments.
                </p>
                <div className="flex flex-wrap gap-2">
                  {listing.host_payment_method_types.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-800"
                    >
                      {PAYMENT_METHOD_META.find((m) => m.key === t)?.label ?? t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
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
                  <Link
                    href={`/profile/${listing.host.id}`}
                    className="rounded-full transition-all hover:shadow-lg hover:ring-2 hover:ring-white"
                    aria-label={`Open ${listing.host.name}'s profile`}
                  >
                    <div className="relative h-24 w-24 overflow-hidden rounded-full bg-muted">
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
                  </Link>
                  <Link
                    href={`/profile/${listing.host.id}`}
                    className="mt-3 text-xl font-semibold hover:underline"
                  >
                    {listing.host.name}
                  </Link>
                  {trust && (
                    <div className="mt-1">
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
                    `${listing.host.name} is a host on Trustead.`}
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
