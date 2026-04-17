import Link from "next/link";
import { Lock, Star, Info, MapPin, Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { TrustBadge } from "@/components/trust-badge";
import { TrustGate } from "@/components/trust/trust-gate";
import { ConnectionPath } from "@/components/trust/connection-path";
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
  // Preview photo set — cover always included, blurred if not also
  // marked is_preview. Other is_preview photos shown unblurred.
  const coverPhoto = listing.photos.find((p) => p.is_cover) || listing.photos[0];
  const displayPhotos: { photo: typeof listing.photos[number]; blur: boolean }[] = [];
  if (coverPhoto) {
    displayPhotos.push({ photo: coverPhoto, blur: !coverPhoto.is_preview });
  }
  for (const p of listing.photos) {
    if (p === coverPhoto) continue;
    if (p.is_preview) displayPhotos.push({ photo: p, blur: false });
  }
  const limitedDisplay = displayPhotos.slice(0, 3);
  const hasPreviewPhotos = limitedDisplay.some((p) => !p.blur);

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

  // Preview description: host-written, or truncated from full description
  const previewDesc =
    listing.preview_description ||
    (listing.description
      ? listing.description.replace(/<!--meta:.*?-->/, "").trim().slice(0, 100) +
        (listing.description.length > 100 ? "..." : "")
      : null);

  // Preview content toggles (default true for most, false for host name)
  const pc = listing.access_settings?.preview_content;
  const showPriceRange = pc?.show_price_range ?? true;
  const showDescription = pc?.show_description ?? true;
  const showHostFirstName = pc?.show_host_first_name ?? false;
  const showNeighborhood = pc?.show_neighborhood ?? true;
  const showMapArea = pc?.show_map_area ?? true;
  const showRating = pc?.show_rating ?? true;
  const showAmenities = pc?.show_amenities ?? false;
  const showBedCounts = pc?.show_bed_counts ?? true;
  const showHouseRules = pc?.show_house_rules ?? false;

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

      {/* Preview photos — constrained gallery, per-photo blur */}
      <div className="relative overflow-hidden rounded-2xl">
        {limitedDisplay.length === 1 ? (
          <div className="relative aspect-[16/10] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={limitedDisplay[0].photo.public_url}
              alt={`Preview of listing in ${listing.area_name}`}
              className={
                limitedDisplay[0].blur
                  ? "h-full w-full scale-110 object-cover blur-2xl"
                  : "h-full w-full object-cover saturate-[0.92]"
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {limitedDisplay.map(({ photo, blur }, i) => (
              <div
                key={photo.id}
                className={
                  i === 0 && limitedDisplay.length > 1
                    ? "col-span-2 aspect-[2/1]"
                    : "aspect-square"
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.public_url}
                  alt={`Preview photo ${i + 1}`}
                  className={
                    blur
                      ? "h-full w-full scale-110 object-cover blur-2xl"
                      : "h-full w-full object-cover saturate-[0.92]"
                  }
                />
              </div>
            ))}
          </div>
        )}
        {!hasPreviewPhotos && limitedDisplay.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/40 via-black/10 to-transparent">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground shadow-sm backdrop-blur">
              <Lock className="h-3.5 w-3.5" /> Photos unlocked with access
            </div>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-3">
        {/* Left column: preview content */}
        <div className="md:col-span-2">
          {/* Title area */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold leading-tight md:text-3xl">
                  {propertyLabel}
                  {showNeighborhood ? ` in ${listing.area_name}` : ""}
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
              {(score > 0 || trust?.hasDirectVouch) && (
                <TrustBadge
                  score={score}
                  size="md"
                  connectionCount={trust?.connectionCount}
                  direct={trust?.hasDirectVouch ?? false}
                />
              )}
            </div>
          </div>

          <Separator className="my-8" />

          {/* Host section */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Shield className="h-6 w-6 text-muted-foreground" />
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

          {/* Amenities */}
          {showAmenities && listing.amenities && listing.amenities.length > 0 && (
            <>
              <section>
                <h2 className="mb-4 text-xl font-semibold">What this place offers</h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {listing.amenities.slice(0, 10).map((a) => (
                    <div key={a} className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      {a}
                    </div>
                  ))}
                </div>
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

          {/* Location — approximate area */}
          {showMapArea && (
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
                <div className="mt-4 flex h-48 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                  Approximate area{showNeighborhood ? ` · ${listing.area_name}` : ""}
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
 * Generate access requirement messaging based on the listing's
 * full_listing_contact gate (new collapsed model). Falls back to the
 * legacy see_full rule for rows written under the older schema.
 */
function getAccessMessage(
  listing: ListingDetail,
  userScore: number,
  _degree?: 1 | 2 | null
): { title: string; body: string } | null {
  const settings = listing.access_settings;
  const rule = settings?.full_listing_contact ?? settings?.see_full;
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
