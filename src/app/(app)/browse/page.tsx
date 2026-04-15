import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import {
  getBrowseListings,
  getBrowsePriceRange,
  getBrowseSuggestions,
} from "@/lib/browse-data";
import { getSavedListingIds } from "@/lib/wishlist-data";
import {
  computeTrustPaths,
  getInternalUserIdFromClerk,
} from "@/lib/trust-data";
import type { BrowseListingTrust } from "@/components/browse/browse-layout";
import { activeFilterCount, parseBrowseParams } from "@/lib/browse-utils";
import { SearchBar } from "@/components/browse/search-bar";
import { MobileSearchPill } from "@/components/browse/mobile-search-pill";
import { BrowseLayout } from "@/components/browse/browse-layout";
import { FilterSheet } from "@/components/browse/filter-sheet";
import { ListingCardSkeleton } from "@/components/listing-card-skeleton";
import { NavCenterPortal } from "@/components/layout/nav-center-portal";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseBrowseParams(params);
  const filterCount = activeFilterCount(filters);

  return (
    <div className="w-full px-4 md:px-10 lg:px-20">
      {/* Desktop: portal search + filters into the top nav's center slot.
          Sort lives next to the "Stays" heading below so the nav cluster
          doesn't overflow at narrow desktop widths. */}
      <NavCenterPortal>
        <div className="flex w-full max-w-4xl items-center gap-3">
          <div className="flex-1">
            <Suspense fallback={<div className="h-12" />}>
              <SuggestionsSearchBar compact />
            </Suspense>
          </div>
          <Suspense fallback={null}>
            <FiltersSlot filters={filters} activeCount={filterCount} />
          </Suspense>
        </div>
      </NavCenterPortal>

      {/* Mobile sticky search pill — collapsed to "Start your search",
          opens a full-height sheet with stacked sections on tap. */}
      <div className="sticky top-0 z-40 -mx-4 border-b border-border/60 bg-white px-4 py-3 md:hidden">
        <Suspense fallback={<div className="h-14" />}>
          <MobileSearchPillSlot />
        </Suspense>
      </div>

      <div className="mt-6">
        <Suspense fallback={<GridSkeleton />}>
          <BrowseResults
            filters={filters}
            activeCount={filterCount}
            headingText={
              filters.location ? `Stays in ${filters.location}` : "Stays"
            }
          />
        </Suspense>
      </div>
    </div>
  );
}

async function SuggestionsSearchBar({ compact }: { compact?: boolean }) {
  const suggestions = await getBrowseSuggestions();
  return <SearchBar suggestions={suggestions} compact={compact} />;
}

async function MobileSearchPillSlot() {
  const suggestions = await getBrowseSuggestions();
  return <MobileSearchPill suggestions={suggestions} />;
}

async function FiltersSlot({
  filters,
  activeCount,
  compact,
}: {
  filters: ReturnType<typeof parseBrowseParams>;
  activeCount: number;
  compact?: boolean;
}) {
  // Price bounds should reflect the currently-filtered set (excluding price itself).
  const { priceMin, priceMax, bedrooms, beds, bathrooms, ...rest } = filters;
  void priceMin;
  void priceMax;
  void bedrooms;
  void beds;
  void bathrooms;
  const priceRange = await getBrowsePriceRange(rest);
  return (
    <FilterSheet
      priceRange={priceRange}
      activeCount={activeCount}
      compact={compact}
    />
  );
}

async function BrowseResults({
  filters,
  activeCount,
  headingText,
}: {
  filters: ReturnType<typeof parseBrowseParams>;
  activeCount: number;
  headingText: string;
}) {
  let listings = await getBrowseListings(filters);

  // Resolve the signed-in viewer's internal user id once.
  const { userId: clerkId } = await auth();
  let viewerId: string | null = null;
  let savedIds: string[] = [];
  if (clerkId) {
    viewerId = await getInternalUserIdFromClerk(clerkId);
    if (viewerId) {
      const set = await getSavedListingIds(viewerId);
      savedIds = [...set];
    }
  }

  // Compute trust paths from the viewer to every host in the result
  // set. One batched DB roundtrip — no N+1.
  const trustByListing: Record<string, BrowseListingTrust> = {};
  if (viewerId && listings.length > 0) {
    const hostIds = [
      ...new Set(listings.map((l) => l.host_id).filter(Boolean)),
    ];
    const trustResults = await computeTrustPaths(viewerId, hostIds);
    for (const l of listings) {
      const r = trustResults[l.host_id];
      if (!r) {
        trustByListing[l.id] = {
          score: 0,
          degree: null,
          canSeeFull: l.min_trust_gate <= 0 || l.host_id === viewerId,
          mutualConnections: [],
        };
        continue;
      }
      // Host is always allowed to see their own listing.
      const isHost = l.host_id === viewerId;
      const canSeeFull = isHost || r.score >= l.min_trust_gate;
      trustByListing[l.id] = {
        score: r.score,
        degree: r.degree,
        canSeeFull,
        mutualConnections: r.mutualConnections,
      };
    }
  } else {
    // Logged-out viewers: gate anything with min_trust_gate > 0.
    for (const l of listings) {
      trustByListing[l.id] = {
        score: 0,
        degree: null,
        canSeeFull: l.min_trust_gate <= 0,
        mutualConnections: [],
      };
    }
  }

  // Trust score filter (client-side — trust is not a listings column).
  if (typeof filters.minTrust === "number" && filters.minTrust > 0) {
    const minTrust = filters.minTrust;
    listings = listings.filter(
      (l) => (trustByListing[l.id]?.score ?? 0) >= minTrust
    );
  }

  // Trust sort — stable, applied after scoring.
  if (filters.sort === "trust_desc") {
    listings = [...listings].sort((a, b) => {
      const sa = trustByListing[a.id]?.score ?? 0;
      const sb = trustByListing[b.id]?.score ?? 0;
      return sb - sa;
    });
  }

  return (
    <BrowseLayout
      listings={listings}
      savedIds={savedIds}
      trustByListing={trustByListing}
      isSignedIn={Boolean(viewerId)}
      headingText={headingText}
      mobileFiltersSlot={
        <Suspense fallback={null}>
          <FiltersSlot filters={filters} activeCount={activeCount} compact />
        </Suspense>
      }
    />
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}
