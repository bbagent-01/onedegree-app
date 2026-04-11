"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  MapPin,
  Lock,
  Eye,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Star,
  Shield,
  Share2,
  CalendarDays,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrustScoreBadge } from "@/components/trust-score-badge";
import { cn } from "@/lib/utils";
import type { ListingWithAccess } from "@/lib/listing-data";

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartment",
  house: "House",
  room: "Room",
  other: "Other",
};

type SortOption = "newest" | "price_asc" | "price_desc" | "trust_desc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "trust_desc", label: "Trust: high to low" },
];

function ListingCard({
  listing,
  trustScore,
}: {
  listing: ListingWithAccess;
  trustScore: number;
}) {
  const { access } = listing;
  const previewPhotos = listing.photos.filter((p) => p.is_preview);
  const displayPhotos =
    previewPhotos.length > 0 ? previewPhotos.slice(0, 3) : listing.photos.slice(0, 1);
  const heroPhoto = displayPhotos[0];

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
        {heroPhoto ? (
          <img
            src={heroPhoto.public_url}
            alt={listing.area_name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-foreground-tertiary">
            No photo
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Photo count indicator */}
        {displayPhotos.length > 1 && (
          <div className="absolute bottom-3 right-3 flex gap-1">
            {displayPhotos.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "size-1.5 rounded-full",
                  i === 0 ? "bg-white" : "bg-white/50"
                )}
              />
            ))}
          </div>
        )}

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
        <p className="mt-1 flex items-center gap-1 text-xs text-foreground-tertiary">
          <CalendarDays className="size-3" />
          {listing.availability_flexible
            ? "Flexible dates"
            : listing.availability_start && listing.availability_end
              ? `${new Date(listing.availability_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(listing.availability_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              : listing.availability_start
                ? `From ${new Date(listing.availability_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : "Dates TBD"}
        </p>

        {/* Trust metrics row (no host name/photo in preview per spec) */}
        <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
          {trustScore > 0 && (
            <TrustScoreBadge score={trustScore} size="sm" />
          )}
          {listing.host && listing.host.host_rating && (
            <span className="flex items-center gap-1 text-xs text-foreground-secondary">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {listing.host.host_rating.toFixed(1)}
            </span>
          )}
          {listing.host && listing.host.host_review_count > 0 && (
            <span className="text-xs text-foreground-tertiary">
              {listing.host.host_review_count} stay
              {listing.host.host_review_count !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Empty States ──

function NoVouchesEmpty() {
  return (
    <div className="text-center py-16 max-w-md mx-auto">
      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary-light">
        <Shield className="size-8 text-primary" />
      </div>
      <h2 className="text-xl text-foreground mb-2">
        No listings visible yet
      </h2>
      <p className="text-sm text-foreground-secondary mb-6">
        Get vouched by someone on the platform to start seeing listings. Share
        your profile link with someone you know.
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          navigator.clipboard?.writeText(window.location.origin + "/profile/me");
        }}
      >
        <Share2 className="size-3.5 mr-1" />
        Copy Profile Link
      </Button>
    </div>
  );
}

function NoMatchEmpty() {
  return (
    <div className="text-center py-16">
      <p className="text-sm text-foreground-secondary">
        No listings match your filters. Try broadening your search.
      </p>
    </div>
  );
}

function PreviewOnlyEmpty() {
  return (
    <div className="mb-6 rounded-xl border border-primary-border bg-primary-light p-4">
      <div className="flex items-start gap-3">
        <Lock className="size-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Build your trust to unlock more listings
          </p>
          <p className="text-xs text-foreground-secondary mt-1">
            Some listings below are preview-only. Get vouched by someone
            connected to these hosts to see full details.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──

export function ListingsIndexClient({
  listings,
  viewerVouchCount,
  trustScores,
}: {
  listings: ListingWithAccess[];
  viewerVouchCount: number;
  trustScores: Record<string, number>;
}) {
  const [areaSearch, setAreaSearch] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);

  const hasLockedOnly =
    listings.length > 0 && listings.every((l) => !l.access.canSeeFull);

  const filtered = useMemo(() => {
    let result = [...listings];

    // Area filter
    if (areaSearch.trim()) {
      const q = areaSearch.toLowerCase();
      result = result.filter((l) =>
        l.area_name.toLowerCase().includes(q)
      );
    }

    // Price filter
    const pMin = priceMin ? parseInt(priceMin) : null;
    const pMax = priceMax ? parseInt(priceMax) : null;
    if (pMin !== null) {
      result = result.filter(
        (l) => (l.price_max ?? l.price_min ?? 0) >= pMin
      );
    }
    if (pMax !== null) {
      result = result.filter(
        (l) => (l.price_min ?? l.price_max ?? Infinity) <= pMax
      );
    }

    // Sort
    switch (sort) {
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
        break;
      case "price_asc":
        result.sort(
          (a, b) =>
            (a.price_min ?? a.price_max ?? 0) -
            (b.price_min ?? b.price_max ?? 0)
        );
        break;
      case "price_desc":
        result.sort(
          (a, b) =>
            (b.price_max ?? b.price_min ?? 0) -
            (a.price_max ?? a.price_min ?? 0)
        );
        break;
      case "trust_desc":
        result.sort(
          (a, b) =>
            (trustScores[b.host_id] ?? 0) -
            (trustScores[a.host_id] ?? 0)
        );
        break;
    }

    return result;
  }, [listings, areaSearch, priceMin, priceMax, sort, trustScores]);

  const hasActiveFilters = areaSearch || priceMin || priceMax;

  // No vouches = completely empty
  if (viewerVouchCount === 0 && listings.length === 0) {
    return (
      <div className="pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Browse Listings
            </h1>
            <p className="text-foreground-secondary text-sm">
              Trusted spaces from your network.
            </p>
          </div>
        </div>
        <NoVouchesEmpty />
      </div>
    );
  }

  return (
    <div className="pb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Browse Listings
          </h1>
          <p className="text-foreground-secondary text-sm">
            {listings.length} listing{listings.length !== 1 ? "s" : ""} in
            your network
          </p>
        </div>
        <Link href="/listings/create">
          <Button size="sm">
            <Plus className="size-3.5 mr-1" />
            New Listing
          </Button>
        </Link>
      </div>

      {/* Filter bar */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2">
          {/* Area search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground-tertiary" />
            <Input
              type="text"
              value={areaSearch}
              onChange={(e) => setAreaSearch(e.target.value)}
              placeholder="Search by area..."
              className="pl-10 pr-8"
            />
            {areaSearch && (
              <button
                onClick={() => setAreaSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="size-3.5 text-foreground-tertiary hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Toggle filters */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "border-primary text-primary")}
          >
            <SlidersHorizontal className="size-3.5 mr-1" />
            Filters
          </Button>

          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="appearance-none rounded-lg border border-border bg-white pl-3 pr-8 py-2 text-xs font-medium text-foreground-secondary focus:outline-none focus:border-primary cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-foreground-tertiary pointer-events-none" />
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
            <span className="text-xs font-medium text-foreground-secondary whitespace-nowrap">
              Price:
            </span>
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-foreground-tertiary">
                  $
                </span>
                <Input
                  type="number"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  placeholder="Min"
                  min={0}
                  className="pl-6 text-xs"
                />
              </div>
              <span className="text-foreground-tertiary text-xs">–</span>
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-foreground-tertiary">
                  $
                </span>
                <Input
                  type="number"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  placeholder="Max"
                  min={0}
                  className="pl-6 text-xs"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setAreaSearch("");
                  setPriceMin("");
                  setPriceMax("");
                }}
                className="text-xs text-primary hover:underline whitespace-nowrap"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Preview-only banner */}
      {hasLockedOnly && <PreviewOnlyEmpty />}

      {/* Listing grid */}
      {filtered.length === 0 ? (
        <NoMatchEmpty />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              trustScore={trustScores[listing.host_id] ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
