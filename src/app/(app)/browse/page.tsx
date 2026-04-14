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
    <div className="mx-auto max-w-container px-4 md:px-6">
      <div className="sticky top-0 md:top-16 z-40 -mx-4 md:-mx-6 border-b border-border/60 bg-white px-4 md:px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <Suspense fallback={<div className="h-14" />}>
            <SuggestionsSearchBar />
          </Suspense>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">
          {filters.location ? `Stays in ${filters.location}` : "Stays"}
        </h1>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <FiltersSlot activeCount={filterCount} />
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

async function SuggestionsSearchBar() {
  const suggestions = await getBrowseSuggestions();
  return <SearchBar suggestions={suggestions} />;
}

async function FiltersSlot({ activeCount }: { activeCount: number }) {
  const priceRange = await getBrowsePriceRange();
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
