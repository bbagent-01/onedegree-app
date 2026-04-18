import Link from "next/link";
import { Lock, Info, MapPin, Shield, Star } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { TrustTag } from "@/components/trust/trust-tag";
import { TrustGate } from "@/components/trust/trust-gate";
import { ConnectionPath } from "@/components/trust/connection-path";
import {
  ConnectorAvatars,
  type AvatarConnector,
} from "@/components/trust/connector-avatars";
import { AmenitiesSection } from "./amenities-section";
import { LocationMapClient } from "./location-map-client";
import { PhotoGallery } from "./photo-gallery";
import { GatedListingCTA } from "./gated-listing-cta";
import type { ListingDetail } from "@/lib/listing-detail-data";
import type { TrustResult } from "@/lib/trust-data";
import type { ListingAccessResult } from "@/lib/trust/types";

interface Props {
  listing: ListingDetail;
  trust: TrustResult | null;
  access?: ListingAccessResult;
  isSignedIn: boolean;
}

/**
 * Preview mode listing detail. Shown when the viewer can see the
 * preview but not the full listing. Provides a premium, intentional
 * experience — not a loading state or broken page.
 */
export function GatedListingView({ listing, trust, access, isSignedIn }: Props) {
  const propertyLabel =
    listing.property_type === "room"
      ? "Private room"
      : listing.property_type === "apartment"
        ? "Entire apartment"
        : listing.property_type === "house"
          ? "Entire home"
          : "Entire place";

  const score = trust?.score ?? 0;
  const mutuals = trust?.mutualConnections ?? [];
  const path = trust?.path ?? [];

  // Preview photo set — cover + any additional `is_preview` photos.
  // When all four seed photos are flagged `is_preview` (the default
  // since migration 018), this is just the listing's photo stream
  // clipped to the first four. PhotoGallery handles the responsive
  // grid; we feed it the preview subset so exact-address detail
  // doesn't leak through the full gallery.
  const previewPhotos = listing.photos
    .filter((p) => p.is_cover || p.is_preview)
    .slice(0, 5);

  // Preview description: host-written, or truncated from full description
  const previewDesc =
    listing.preview_description ||
    (listing.description
      ? listing.description.replace(/<!--meta:.*?-->/, "").trim().slice(0, 100) +
        (listing.description.length > 100 ? "..." : "")
      : null);

  // Preview content toggles — default ALL to true, hosts opt things
  // out rather than opting them in. Previews should lean generous so
  // guests have enough context to want to unlock the listing.
  const pc = listing.access_settings?.preview_content;
  const showTitle = pc?.show_title ?? true;
  const showPriceRange = pc?.show_price_range ?? true;
  const showDescription = pc?.show_description ?? true;
  const showHostFirstName = pc?.show_host_first_name ?? true;
  const showProfilePhoto = pc?.show_profile_photo ?? true;
  const showNeighborhood = pc?.show_neighborhood ?? true;
  const showMapArea = pc?.show_map_area ?? true;
  const showRating = pc?.show_rating ?? true;
  const showAmenities = pc?.show_amenities ?? true;
  const showBedCounts = pc?.show_bed_counts ?? true;
  const showHouseRules = pc?.show_house_rules ?? true;

  // Price range display
  const hasPriceRange =
    listing.price_min && listing.price_max && listing.price_min !== listing.price_max;
  const priceDisplay = hasPriceRange
    ? `$${listing.price_min}–$${listing.price_max} / night`
    : listing.price_min
      ? `$${listing.price_min} / night`
      : null;

  // Access requirement messaging
  const accessMessage = getAccessMessage(listing, score, trust?.degree);

  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 pb-24 pt-6 md:px-6">
      {/* Header row — back link + lock pill */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/browse"
          className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          &larr; Back to stays
        </Link>
        <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> Preview
        </div>
      </div>

      {/* Preview photos — reuses PhotoGallery so the 1/2/3/4+ grid
          and the lightbox match the full listing experience. */}
      {previewPhotos.length > 0 && (
        <PhotoGallery photos={previewPhotos} title={listing.title} />
      )}

      {/* Two-column layout */}
      <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-3">
        {/* Left column: preview content */}
        <div className="md:col-span-2">
          {/* Title area */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold leading-tight md:text-3xl">
                  {showTitle && listing.title
                    ? listing.title
                    : `${propertyLabel}${
                        showNeighborhood ? ` in ${listing.area_name}` : ""
                      }`}
                </h1>
                {showRating && listing.avg_rating !== null && listing.review_count > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
                    <span className="font-semibold">
                      {listing.avg_rating.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">&middot;</span>
                    <span className="text-muted-foreground">
                      {listing.review_count}{" "}
                      {listing.review_count === 1 ? "review" : "reviews"}
                    </span>
                  </div>
                )}
                {showBedCounts && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {listing.bedrooms} bedroom{listing.bedrooms !== 1 ? "s" : ""}{" "}
                    &middot; {listing.beds} bed{listing.beds !== 1 ? "s" : ""}{" "}
                    &middot; {listing.bathrooms} bath{listing.bathrooms !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
              <TrustTag
                size="medium"
                score={score}
                degree={trust?.degree ?? null}
                direct={trust?.hasDirectVouch ?? false}
                connectorPaths={trust?.connectorPaths ?? []}
              />
            </div>
          </div>

          <Separator className="my-8" />

          {/* Host section */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-muted">
              {showProfilePhoto && listing.host?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.host.avatar_url}
                  alt={
                    showHostFirstName && listing.host?.name
                      ? listing.host.name
                      : "Host"
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                <Shield className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="text-lg font-semibold">
                {showHostFirstName && listing.host?.name
                  ? `Hosted by ${listing.host.name.split(" ")[0]}`
                  : "Hosted by a verified member"}
              </div>
              <div className="text-sm text-muted-foreground">
                {showHostFirstName
                  ? "Full profile revealed once you meet the trust threshold"
                  : "Host identity is revealed once you meet the trust threshold"}
              </div>
            </div>
          </div>

          <Separator className="my-8" />

          {/* Preview description */}
          {showDescription && previewDesc && (
            <>
              <section>
                <h2 className="mb-4 text-xl font-semibold">About this place</h2>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {previewDesc}
                </p>
              </section>
              <Separator className="my-8" />
            </>
          )}

          {/* Amenities — reuses the full listing's icon component so
              the gated view and full view read as the same product. */}
          {showAmenities && listing.amenities && listing.amenities.length > 0 && (
            <>
              <section>
                <h2 className="mb-4 text-xl font-semibold">
                  What this place offers
                </h2>
                <AmenitiesSection amenities={listing.amenities} />
              </section>
              <Separator className="my-8" />
            </>
          )}

          {/* House rules */}
          {showHouseRules && listing.house_rules && (
            <>
              <section>
                <h2 className="mb-4 text-xl font-semibold">House rules</h2>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {listing.house_rules}
                </p>
              </section>
              <Separator className="my-8" />
            </>
          )}

          {/* Location — real map with an approximate-area circle
              around the host's coordinates. LocationMapClient is the
              same component the full listing uses. */}
          {showMapArea && typeof listing.latitude === "number" &&
            typeof listing.longitude === "number" && (
            <>
              <section>
                <h2 className="mb-2 text-xl font-semibold">Location</h2>
                {showNeighborhood && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{listing.area_name}</span>
                  </div>
                )}
                <p className="mt-2 text-sm text-muted-foreground">
                  Exact address shared after you unlock the full listing.
                </p>
                <div className="mt-4">
                  <LocationMapClient
                    lat={listing.latitude}
                    lng={listing.longitude}
                    areaName={listing.area_name}
                  />
                </div>
              </section>
              <Separator className="my-8" />
            </>
          )}

          {/* Trust path */}
          <section>
            <h2 className="text-xl font-semibold md:text-2xl">
              Your connection to this host
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One Degree B&amp;B listings become visible through personal
              networks. Grow yours, and more stays open up automatically.
            </p>

            {path.length >= 2 && (
              <div className="mt-6 rounded-2xl border border-border bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Your strongest path
                </div>
                <div className="mt-3 overflow-x-auto">
                  <ConnectionPath path={path} />
                </div>
              </div>
            )}

            <div className="mt-6">
              <TrustGate
                userScore={score}
                requiredScore={listing.min_trust_gate}
                mutualConnections={mutuals}
              />
            </div>
          </section>

          <Separator className="my-8" />

          {/* Access requirement message */}
          {accessMessage && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {accessMessage.title}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {accessMessage.body}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* What you can see right now */}
          <div className="mt-6 text-sm text-muted-foreground">
            <h3 className="mb-2 text-base font-semibold text-foreground">
              What you can see right now
            </h3>
            <ul className="list-disc space-y-1 pl-5">
              {showNeighborhood && <li>City: {listing.area_name}</li>}
              <li>Property type: {propertyLabel}</li>
              {showPriceRange && priceDisplay && <li>Price range: {priceDisplay}</li>}
              {showRating && listing.avg_rating !== null && (
                <li>Rating: {listing.avg_rating.toFixed(2)} ({listing.review_count} reviews)</li>
              )}
            </ul>
            <p className="mt-4">
              The full listing &mdash; exact address, calendar, and everything
              the host has hidden &mdash; is unlocked once you meet the trust
              threshold.
            </p>
          </div>
        </div>

        {/* Right column — sidebar with CTA */}
        <aside className="md:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-border bg-white p-5 shadow-sm">
            {showPriceRange && priceDisplay && (
              <div className="mb-4 text-center">
                <span className="text-2xl font-semibold">
                  {hasPriceRange
                    ? `$${listing.price_min}\u2013$${listing.price_max}`
                    : `$${listing.price_min}`}
                </span>
                <span className="text-muted-foreground"> / night</span>
              </div>
            )}
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Unlock this listing
            </div>

            {/* Trust distance row — always rendered, even when not
                connected. Sits directly above the CTA so the viewer
                sees exactly how close they are and who bridges the
                gap. */}
            <TrustDistanceRow trust={trust} hostFirstName={listing.host?.name?.split(" ")[0] ?? "the host"} />

            <GatedListingCTA
              listingId={listing.id}
              listingTitle={listing.title}
              hostName={listing.host?.name || "the host"}
              isSignedIn={isSignedIn}
              canMessage={access?.can_message ?? false}
              canRequestIntro={access?.can_request_intro ?? false}
              mutualConnections={mutuals}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * Always-on row that spells out the viewer's trust distance to the
 * host, plus the connector avatars who could bridge it. Rendered even
 * when score is 0 — being gated is the single most teachable moment
 * to explain what 1DB's network gating actually means.
 */
function TrustDistanceRow({
  trust,
  hostFirstName,
}: {
  trust: TrustResult | null;
  hostFirstName: string;
}) {
  const connectors = trust?.connectorPaths ?? [];
  const connectionCount = trust?.connectionCount ?? connectors.length;
  const direct = trust?.hasDirectVouch ?? false;
  const score = trust?.score ?? 0;

  let line: string;
  if (direct) {
    line = `You vouched for ${hostFirstName} directly.`;
  } else if (score > 0 && connectionCount > 0) {
    line = `${connectionCount} mutual connection${connectionCount === 1 ? "" : "s"} · request an intro`;
  } else if (connectionCount > 0) {
    line = `${connectionCount} mutual connection${connectionCount === 1 ? "" : "s"} · request an intro`;
  } else {
    line = `0 connections · ask someone you know to vouch for ${hostFirstName}`;
  }

  return (
    <div className="mt-3 space-y-2">
      {connectors.length > 0 && (
        <ConnectorAvatars
          connectors={connectors as AvatarConnector[]}
          size="h-7 w-7"
        />
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">{line}</p>
    </div>
  );
}

/**
 * Generate access requirement messaging based on the listing's
 * full_listing_contact gate (new collapsed model). Falls back to the
 * legacy see_full rule for rows written under the older schema.
 */
function getAccessMessage(
  listing: ListingDetail,
  userScore: number,
  _degree?: 1 | 2 | 3 | 4 | null
): { title: string; body: string } | null {
  const settings = listing.access_settings;
  const rule = settings?.full_listing_contact;
  if (!rule) return null;

  switch (rule.type) {
    case "min_score":
      return {
        title: `This listing requires a 1\u00B0 score of ${rule.threshold ?? 0}`,
        body: `Your current score: ${userScore}. Connect with more people to increase your score.`,
      };
    case "specific_people":
      return {
        title: "This is a private listing",
        body: "Ask the host for access. They share the listing directly with people they trust.",
      };
    default:
      return null;
  }
}
