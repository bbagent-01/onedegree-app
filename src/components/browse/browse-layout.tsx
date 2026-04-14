"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon, LayoutGrid, X } from "lucide-react";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveListingCard } from "./live-listing-card";
import type { BrowseListing } from "@/lib/browse-data";
import { cn } from "@/lib/utils";

const MapView = dynamic(
  () => import("./map-view").then((m) => m.MapView),
  { ssr: false, loading: () => <MapFallback /> }
);

interface Props {
  listings: BrowseListing[];
}

type ViewMode = "grid" | "split" | "map";

export function BrowseLayout({ listings }: Props) {
  const [mode, setMode] = useState<ViewMode>("grid");
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

  if (listings.length === 0) {
    return (
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
          <div
            className={cn(
              "grid gap-6",
              gridCols,
              mode === "split" && "md:max-h-[calc(100vh-200px)] md:overflow-y-auto md:pr-2"
            )}
          >
            {listings.map((l) => (
              <div
                key={l.id}
                ref={setRef(l.id)}
                onMouseEnter={() => setSelectedId(l.id)}
                onMouseLeave={() =>
                  setSelectedId((cur) => (cur === l.id ? null : cur))
                }
                className={cn(
                  "rounded-xl transition-all",
                  selectedId === l.id &&
                    "ring-2 ring-offset-2 ring-[color:var(--brand,#2563EB)]"
                )}
              >
                <LiveListingCard listing={l} />
              </div>
            ))}
          </div>

          {mode === "split" && (
            <div className="sticky top-32 hidden h-[calc(100vh-200px)] overflow-hidden rounded-xl border border-border md:block">
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
      <div className="fixed bottom-24 left-1/2 z-40 hidden -translate-x-1/2 md:block">
        <Button
          type="button"
          onClick={() => setMode((m) => (m === "split" ? "grid" : "split"))}
          className="rounded-full shadow-lg"
          size="sm"
        >
          {mode === "split" ? (
            <>
              <LayoutGrid className="mr-2 h-4 w-4" />
              Show grid
            </>
          ) : (
            <>
              <MapIcon className="mr-2 h-4 w-4" />
              Show map
            </>
          )}
        </Button>
      </div>

      {/* Mobile map toggle */}
      <div className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 md:hidden">
        <Button
          type="button"
          onClick={() => setMode((m) => (m === "map" ? "grid" : "map"))}
          className="rounded-full shadow-lg"
          size="sm"
        >
          {mode === "map" ? (
            <>
              <X className="mr-2 h-4 w-4" />
              Close map
            </>
          ) : (
            <>
              <MapIcon className="mr-2 h-4 w-4" />
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
