"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon, LayoutGrid, X } from "lucide-react";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveListingCard } from "./live-listing-card";
import { SortDropdown } from "./sort-dropdown";
import type { BrowseListing } from "@/lib/browse-data";
import { cn } from "@/lib/utils";

const MapView = dynamic(
  () => import("./map-view").then((m) => m.MapView),
  { ssr: false, loading: () => <MapFallback /> }
);

interface Props {
  listings: BrowseListing[];
  headingText: string;
  /**
   * Compact Filters pill for the mobile header row. On desktop the
   * Filters button lives in the top nav cluster, so this slot is only
   * visible on small screens.
   */
  mobileFiltersSlot: React.ReactNode;
}

type ViewMode = "grid" | "split" | "map";

export function BrowseLayout({ listings, headingText, mobileFiltersSlot }: Props) {
  // Default to split on desktop so map is visible without toggling (Airbnb behavior).
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) return "split";
    return "grid";
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // When a pin is selected, scroll the matching card into view.
  useEffect(() => {
    if (!selectedId) return;
    const el = cardRefs.current.get(selectedId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedId]);

  const setRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  };

  const gridCols = useMemo(
    () =>
      mode === "split"
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    [mode]
  );

  // Offset the card padding so the grid visually lines up with the container edge.
  const gridPad = "-m-3";

  // Heading row with sort/filters — lives inside the left column so the
  // sort pill aligns with the right edge of the grid (not the far right
  // of the page) and the map column extends all the way up to this row.
  const headerRow = (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h1 className="text-lg font-semibold">{headingText}</h1>
      <div className="flex items-center gap-2">
        <div className="md:hidden">{mobileFiltersSlot}</div>
        <SortDropdown />
      </div>
    </div>
  );

  if (listings.length === 0) {
    return (
      <div>
        {headerRow}
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <SearchX className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">
            No listings match your search
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Try adjusting your location, dates, or filters. Clearing filters will
            show every available stay.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {mode !== "map" && (
        <div
          className={cn(
            "grid gap-4",
            mode === "split"
              ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-6"
              : ""
          )}
        >
          {/* Left column — heading row + grid of cards */}
          <div
            className={cn(
              mode === "split" && "md:max-h-[calc(100vh-140px)] md:overflow-y-auto"
            )}
          >
            {headerRow}
            <div className={cn("grid", gridPad, gridCols)}>
              {listings.map((l) => (
                <div
                  key={l.id}
                  ref={setRef(l.id)}
                  onMouseEnter={() => setSelectedId(l.id)}
                  onMouseLeave={() =>
                    setSelectedId((cur) => (cur === l.id ? null : cur))
                  }
                  className={cn(
                    "h-fit self-start rounded-2xl p-3 transition-shadow",
                    selectedId === l.id &&
                      "shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
                  )}
                >
                  <LiveListingCard listing={l} />
                </div>
              ))}
            </div>
          </div>

          {/* Right column — map, extends up to the same top as the heading */}
          {mode === "split" && (
            <div className="sticky top-24 hidden h-[calc(100vh-140px)] overflow-hidden rounded-xl border border-border md:block">
              <MapView
                listings={listings}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
          )}
        </div>
      )}

      {mode === "map" && (
        <div className="fixed inset-x-0 bottom-16 top-[calc(theme(spacing.16)+theme(spacing.16))] z-30 md:top-40 md:bottom-6 md:mx-6 md:rounded-xl md:border md:border-border md:overflow-hidden">
          <MapView
            listings={listings}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      )}

      {/* Desktop split toggle */}
      <div className="fixed bottom-8 left-1/2 z-40 hidden -translate-x-1/2 md:block">
        <Button
          type="button"
          onClick={() => setMode((m) => (m === "split" ? "grid" : "split"))}
          className="h-12 gap-2 rounded-full bg-foreground px-6 text-sm font-medium text-background shadow-lg hover:bg-foreground/90"
        >
          {mode === "split" ? (
            <>
              <LayoutGrid className="h-4 w-4" />
              Show grid
            </>
          ) : (
            <>
              <MapIcon className="h-4 w-4" />
              Show map
            </>
          )}
        </Button>
      </div>

      {/* Mobile map toggle — floats above the mobile tab bar. The bottom
          offset accounts for the tab bar's height plus the iOS
          home-indicator safe area plus a 1rem breathing gap. */}
      <div
        className="fixed left-1/2 z-40 -translate-x-1/2 md:hidden"
        style={{
          bottom: "calc(4rem + env(safe-area-inset-bottom) + 1rem)",
        }}
      >
        <Button
          type="button"
          onClick={() => setMode((m) => (m === "map" ? "grid" : "map"))}
          className="h-12 gap-2 rounded-full bg-foreground px-6 text-sm font-medium text-background shadow-lg hover:bg-foreground/90"
        >
          {mode === "map" ? (
            <>
              <X className="h-4 w-4" />
              Close map
            </>
          ) : (
            <>
              <MapIcon className="h-4 w-4" />
              Map
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function MapFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
      Loading map…
    </div>
  );
}
