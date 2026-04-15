import Link from "next/link";
import { Lock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TrustBadge } from "@/components/trust-badge";
import { TrustGate } from "@/components/trust/trust-gate";
import { ConnectionPath } from "@/components/trust/connection-path";
import type { ListingDetail } from "@/lib/listing-detail-data";
import type { TrustResult } from "@/lib/trust-data";

interface Props {
  listing: ListingDetail;
  trust: TrustResult | null;
  isSignedIn: boolean;
}

/**
 * Replaces the full listing page when the viewer can't meet the host's
 * trust gate. Shows the city and property type in the clear, blurs the
 * photos, and guides the viewer toward an introduction.
 */
export function GatedListingView({ listing, trust, isSignedIn }: Props) {
  const cover =
    listing.photos[0]?.public_url ??
    "https://placehold.co/1200x800/e2e8f0/475569?text=Private+listing";
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

  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 pb-24 pt-6 md:px-6">
      {/* Header row — back link + lock pill */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/browse"
          className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          ← Back to stays
        </Link>
        <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> Private listing
        </div>
      </div>

      {/* Blurred cover */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="relative aspect-[16/10] w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt="Private listing"
            className="h-full w-full scale-110 object-cover blur-xl"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-black/10" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/40 backdrop-blur">
              <Lock className="h-6 w-6" />
            </div>
            <div className="text-sm font-medium uppercase tracking-widest text-white/90">
              {propertyLabel}
            </div>
            <h1 className="text-3xl font-semibold drop-shadow md:text-4xl">
              Stay in {listing.area_name}
            </h1>
            <p className="max-w-lg text-sm text-white/90 drop-shadow md:text-base">
              The host keeps this listing private until guests meet their
              trust threshold. Here&apos;s how close you are.
            </p>
            {score > 0 && (
              <div className="mt-1">
                <TrustBadge score={score} size="md" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two-column explainer */}
      <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3">
        <div className="md:col-span-2">
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

          <Separator className="my-8" />

          <div className="text-sm text-muted-foreground">
            <h3 className="mb-2 text-base font-semibold text-foreground">
              What you can see right now
            </h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>City: {listing.area_name}</li>
              <li>Property type: {propertyLabel}</li>
              <li>
                Host&apos;s required trust score:{" "}
                <span className="font-mono tabular-nums">
                  {listing.min_trust_gate}
                </span>
              </li>
              <li>
                Your current score:{" "}
                <span className="font-mono tabular-nums">{score}</span>
              </li>
            </ul>
            <p className="mt-4">
              Title, photos, exact location, amenities, pricing, and the host
              name are hidden until you meet the trust threshold — the host
              sets this themselves.
            </p>
          </div>
        </div>

        {/* Sidebar with CTA */}
        <aside className="md:col-span-1">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Unlock this listing
            </div>
            {isSignedIn ? (
              mutuals.length > 0 ? (
                <>
                  <p className="mt-2 text-sm text-foreground">
                    Ask a mutual connection to vouch for you or introduce you
                    to the host. One stronger vouch usually does it.
                  </p>
                  <Button
                    disabled
                    className="mt-4 flex h-10 w-full gap-2"
                    aria-label="Request an introduction"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Request introduction
                  </Button>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Introductions coming in CC-B7b
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm text-foreground">
                    You don&apos;t share any connections with this host yet.
                    Grow your network — once someone you know vouches for
                    someone in this host&apos;s circle, the listing unlocks
                    automatically.
                  </p>
                  <Link
                    href="/profile"
                    className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                  >
                    Grow your network
                  </Link>
                </>
              )
            ) : (
              <>
                <p className="mt-2 text-sm text-foreground">
                  Sign in to see your connection to this host. If you share
                  friends, the listing unlocks automatically.
                </p>
                <Link
                  href="/sign-in"
                  className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
