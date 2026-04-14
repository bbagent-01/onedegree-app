import { Suspense } from "react";
import {
  getBrowseListings,
  getBrowsePriceRange,
  getBrowseSuggestions,
} from "@/lib/browse-data";
import { activeFilterCount, parseBrowseParams } from "@/lib/browse-utils";
import { SearchBar } from "@/components/browse/search-bar";
import { SortDropdown } from "@/components/browse/sort-dropdown";
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
      {/* Desktop: portal search + filters + sort into the top nav's center slot */}
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
          <SortDropdown />
        </div>
      </NavCenterPortal>

      {/* Mobile sticky search bar (DesktopNav is hidden on mobile) */}
      <div className="sticky top-0 z-40 -mx-4 border-b border-border/60 bg-white px-4 py-3 md:hidden">
        <Suspense fallback={<div className="h-12" />}>
          <SuggestionsSearchBar compact />
        </Suspense>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">
          {filters.location ? `Stays in ${filters.location}` : "Stays"}
        </h1>
        <div className="flex items-center gap-2 md:hidden">
          <Suspense fallback={null}>
            <FiltersSlot filters={filters} activeCount={filterCount} />
          </Suspense>
          <SortDropdown />
        </div>
      </div>

      <div className="py-6">
        <Suspense fallback={<GridSkeleton />}>
          <BrowseResults filters={filters} />
        </Suspense>
      </div>
    </div>
  );
}

async function SuggestionsSearchBar({ compact }: { compact?: boolean }) {
  const suggestions = await getBrowseSuggestions();
  return <SearchBar suggestions={suggestions} compact={compact} />;
}

async function FiltersSlot({
  filters,
  activeCount,
}: {
  filters: ReturnType<typeof parseBrowseParams>;
  activeCount: number;
}) {
  // Price bounds should reflect the currently-filtered set (excluding price itself).
  const { priceMin, priceMax, bedrooms, beds, bathrooms, ...rest } = filters;
  void priceMin;
  void priceMax;
  void bedrooms;
  void beds;
  void bathrooms;
  const priceRange = await getBrowsePriceRange(rest);
  return <FilterSheet priceRange={priceRange} activeCount={activeCount} />;
}

async function BrowseResults({
  filters,
}: {
  filters: ReturnType<typeof parseBrowseParams>;
}) {
  const listings = await getBrowseListings(filters);
  return <BrowseLayout listings={listings} />;
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
