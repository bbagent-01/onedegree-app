"use client";

import Link from "next/link";
import { Plus, MapPin, DollarSign, Lock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ListingWithAccess } from "@/lib/listing-data";

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartment",
  house: "House",
  room: "Room",
  other: "Other",
};

function ListingCard({ listing }: { listing: ListingWithAccess }) {
  const { access } = listing;
  const previewPhoto = listing.photos.find((p) => p.is_preview) ?? listing.photos[0];

  const priceLabel =
    listing.price_min && listing.price_max
      ? `$${listing.price_min}–$${listing.price_max}`
      : listing.price_min
        ? `From $${listing.price_min}`
        : listing.price_max
          ? `Up to $${listing.price_max}`
          : null;

  return (
    <Link
      href={`/listings/${listing.id}`}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-white/60 backdrop-blur-lg transition-all duration-200",
        "hover:border-primary-border hover:shadow-lg hover:shadow-purple-500/5"
      )}
    >
      {/* Hero Image */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-background-mid">
        {previewPhoto ? (
          <img
            src={previewPhoto.public_url}
            alt={listing.area_name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-foreground-tertiary">
            No photo
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Price overlay */}
        {priceLabel && (
          <div className="absolute bottom-3 left-3">
            <span className="font-display text-2xl font-bold text-white">
              {priceLabel}
            </span>
            <span className="text-xs text-white/70 ml-1">/night</span>
          </div>
        )}

        {/* Access badge */}
        <div className="absolute top-3 right-3">
          {access.canSeeFull ? (
            <span className="flex items-center gap-1 rounded-full bg-green-light/90 backdrop-blur-sm border border-green-border px-2 py-0.5 text-[10px] font-medium text-green">
              <Eye className="size-3" />
              Full Access
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-primary-light/90 backdrop-blur-sm border border-primary-border px-2 py-0.5 text-[10px] font-medium text-primary">
              <Lock className="size-3" />
              Preview
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="rounded-full border border-border bg-background-mid px-2 py-0.5 text-[10px] font-medium text-foreground-secondary">
            {PROPERTY_TYPE_LABELS[listing.property_type] || listing.property_type}
          </span>
        </div>
        <h3 className="font-display text-xl text-foreground leading-tight">
          {listing.title}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-foreground-secondary">
          <MapPin className="size-3" />
          {listing.area_name}
        </p>

        {/* Host name (if full access) */}
        {access.canSeeFull && listing.host && (
          <p className="mt-2 text-xs text-foreground-tertiary">
            Hosted by {listing.host.name}
          </p>
        )}
      </div>
    </Link>
  );
}

export function ListingsIndexClient({
  listings,
}: {
  listings: ListingWithAccess[];
}) {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Listings
            </h1>
            <p className="text-foreground-secondary text-sm">
              Browse trusted spaces from your network.
            </p>
          </div>
          <Link href="/listings/create">
            <Button size="sm">
              <Plus className="size-3.5 mr-1" />
              New Listing
            </Button>
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-foreground-tertiary">
              No listings yet. Be the first to list your space.
            </p>
            <Link href="/listings/create">
              <Button size="sm" className="mt-4">
                <Plus className="size-3.5 mr-1" />
                Create a Listing
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
