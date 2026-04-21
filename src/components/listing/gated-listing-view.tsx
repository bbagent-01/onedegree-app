import Link from "next/link";
import { EyeOff, Info, MapPin, Shield, Star } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { TrustTag } from "@/components/trust/trust-tag";
import { ConnectionPopover } from "@/components/trust/connection-breakdown";
import { AmenitiesSection } from "./amenities-section";
import { LocationMapClient } from "./location-map-client";
import { PhotoGallery } from "./photo-gallery";
import {
  GatedListingCTA,
  type PendingIntroSummary,
} from "./gated-listing-cta";
import type { ListingDetail } from "@/lib/listing-detail-data";
import type { TrustResult } from "@/lib/trust-data";
import type { ListingAccessResult } from "@/lib/trust/types";

interface Props {
  listing: ListingDetail;
  trust: TrustResult | null;
  access?: ListingAccessResult;
  isSignedIn: boolean;
  /** Open intro request for this viewer on this listing, if any.
   *  Flips the CTA into an in-progress state. */
  pendingIntro?: PendingIntroSummary | null;
}

/**
 * Preview mode listing detail. Shown when the viewer can see the
 * preview but not the full listing. Provides a premium, intentional
 * experience — not a loading state or broken page.
 */
export function GatedListingView({
  listing,
  trust,
  access,
  isSignedIn,
  pendingIntro,
}: Props) {
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
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-24 pt-6 md:px-6 md:pb-12">
      {/* Header row — just the back link now. The preview marker
          moved next to the title below so the two pieces of
          information are grouped. */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/browse"
          className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          &larr; Back to stays
        </Link>
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
          {/* Title area — no floating TrustTag here anymore; the
              trust badge lives below the host name for a consistent
              read across 1°/2°/3°/4°. */}
          <div>
            <div className="flex items-start gap-3">
              <h1 className="text-2xl font-semibold leading-tight md:text-3xl">
                {showTitle && listing.title
                  ? listing.title
                  : `${propertyLabel}${
                      showNeighborhood ? ` in ${listing.area_name}` : ""
                    }`}
              </h1>
              <span
                className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-4 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground md:text-base"
                title="Preview — unlock to see the full listing"
              >
                <EyeOff className="h-4 w-4 md:h-5 md:w-5" /> Preview
              </span>
            </div>
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

          <Separator className="my-8" />

          {/* Host section — the entire block (avatar + name +
              trust badge + helper copy) is a single click target
              for the trust-detail popover. */}
          {trust && listing.host?.id ? (
            <ConnectionPopover
              targetUserId={listing.host.id}
              direction="incoming"
              disabled={trust.degree === 1 || trust.hasDirectVouch}
            >
              <div className="flex w-full cursor-pointer items-center gap-4 rounded-xl p-2 -m-2 text-left hover:bg-muted/40">
                <HostAvatar
                  showProfilePhoto={showProfilePhoto}
                  avatarUrl={listing.host?.avatar_url ?? null}
                  hostName={
                    showHostFirstName && listing.host?.name
                      ? listing.host.name
                      : "Host"
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold">
                    {showHostFirstName && listing.host?.name
                      ? `Hosted by ${listing.host.name.split(" ")[0]}`
                      : "Hosted by a verified member"}
                  </div>
                  <TrustTag
                    size="medium"
                    score={score}
                    degree={trust.degree}
                    direct={trust.hasDirectVouch}
                    connectorPaths={trust.connectorPaths}
                    className="mt-1"
                  />
                  <div className="mt-1 text-sm text-muted-foreground">
                    {showHostFirstName
                      ? "Full profile revealed once you meet the trust threshold"
                      : "Host identity is revealed once you meet the trust threshold"}
                  </div>
                </div>
              </div>
            </ConnectionPopover>
          ) : (
            <div className="flex items-center gap-4">
              <HostAvatar
                showProfilePhoto={showProfilePhoto}
                avatarUrl={listing.host?.avatar_url ?? null}
                hostName={
                  showHostFirstName && listing.host?.name
                    ? listing.host.name
                    : "Host"
                }
              />
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold">
                  {showHostFirstName && listing.host?.name
                    ? `Hosted by ${listing.host.name.split(" ")[0]}`
                    : "Hosted by a verified member"}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {showHostFirstName
                    ? "Full profile revealed once you meet the trust threshold"
                    : "Host identity is revealed once you meet the trust threshold"}
                </div>
              </div>
            </div>
          )}

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

            {/* Access requirement — the single source of truth for
                what it takes to unlock. Copy adapts to the gate type
                (min_score vs specific_people). */}
            {accessMessage && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="text-xs">
                    <div className="font-semibold text-foreground">
                      {accessMessage.title}
                    </div>
                    <p className="mt-0.5 text-muted-foreground">
                      {accessMessage.body}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <GatedListingCTA
              listingId={listing.id}
              listingTitle={listing.title}
              hostName={listing.host?.name || "the host"}
              isSignedIn={isSignedIn}
              canMessage={access?.can_message ?? false}
              canRequestIntro={access?.can_request_intro ?? false}
              mutualConnections={mutuals}
              pendingIntro={pendingIntro ?? null}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}


function HostAvatar({
  showProfilePhoto,
  avatarUrl,
  hostName,
}: {
  showProfilePhoto: boolean;
  avatarUrl: string | null;
  hostName: string;
}) {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
      {showProfilePhoto && avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={hostName}
          className="h-full w-full object-cover"
        />
      ) : (
        <Shield className="h-6 w-6 text-muted-foreground" />
      )}
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
    case "min_score": {
      const required = rule.threshold ?? 0;
      return {
        title: `Trust score of ${required} required`,
        body: `You're at ${userScore}. Grow your network — a mutual vouch closes the gap.`,
      };
    }
    case "specific_people":
      return {
        title: "Private — invite only",
        body: "The host shares this listing directly with people they trust. Ask them for access.",
      };
    default:
      return null;
  }
}
