import { SearchX } from "lucide-react";
import { LiveListingCard } from "./live-listing-card";
import type { BrowseListing } from "@/lib/browse-data";

export function BrowseGrid({ listings }: { listings: BrowseListing[] }) {
  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <SearchX className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">
          No listings match your search
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Try adjusting your location, dates, or guest count. Clearing filters
          will show every available stay.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {listings.map((l) => (
        <LiveListingCard key={l.id} listing={l} />
      ))}
    </div>
  );
}
