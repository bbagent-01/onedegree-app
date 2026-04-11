"use client";

import { cn } from "@/lib/utils";
import { TrustScoreBadge } from "./trust-score-badge";
import { CalendarDays, Star, Users, ArrowRight } from "lucide-react";
import type { Listing } from "@/lib/mock-data";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface ListingCardProps {
  listing: Listing;
  className?: string;
}

export function ListingCard({ listing, className }: ListingCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-white/60 backdrop-blur-lg transition-all duration-200",
        "hover:border-primary-border hover:shadow-lg hover:shadow-purple-500/5",
        className
      )}
    >
      {/* Hero Image */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl">
        <img
          src={listing.heroImage}
          alt={listing.area}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Price overlay */}
        <div className="absolute bottom-3 left-3">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-3xl text-white">
              ${listing.pricePerNight}
            </span>
            <span className="text-sm text-white/70">/night</span>
          </div>
        </div>

        {/* Trust badge overlay */}
        <div className="absolute right-3 top-3">
          <TrustScoreBadge score={listing.trustScore} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-display text-2xl text-foreground leading-tight">
          {listing.title}
        </h3>
        <p className="mt-0.5 text-xs text-foreground-secondary">{listing.area}</p>

        {/* Meta row */}
        <div className="mt-3 flex items-center gap-3 text-xs text-foreground-secondary">
          <div className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            <span>
              {formatDate(listing.availableFrom)} – {formatDate(listing.availableTo)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{listing.maxGuests}</span>
          </div>
        </div>

        {/* Trust metrics row */}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-3 text-xs text-foreground-secondary">
            <span className="font-mono">{listing.completedStays} stays</span>
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="font-mono">{listing.averageRating}</span>
            </div>
          </div>

          <button className="inline-flex items-center gap-1 rounded-full border border-primary-border bg-primary-light px-3 py-1 text-xs font-semibold text-primary transition-all hover:shadow-md hover:shadow-purple-500/10">
            Request Access
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
