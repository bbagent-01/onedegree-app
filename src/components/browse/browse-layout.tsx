"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Map as MapIcon,
  LayoutGrid,
  X,
  UserPlus,
  Lock,
  Eye,
  Shield,
  Check,
} from "lucide-react";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveListingCard } from "./live-listing-card";
import { SortDropdown } from "./sort-dropdown";
import type { BrowseListing } from "@/lib/browse-data";
import type { ConnectorPathSummary, TrustPathUser } from "@/lib/trust-data";
import { cn } from "@/lib/utils";

/**
 * Per-listing trust info injected by the server component. The viewer
 * may see a listing fully, only the preview, or nothing at all based
 * on the host's access_settings evaluated via checkListingAccess.
 */
export interface BrowseListingTrust {
  /** Composite trust score (renamed from the legacy "1° vouch score"). */
  trust_score: number;
  degree: 1 | 2 | 3 | 4 | null;
  connectionCount: number;
  /** True when the viewer has directly vouched for the host. */
  hasDirectVouch: boolean;
  /** Sorted strongest → weakest by individual path strength. */
  connectorPaths: ConnectorPathSummary[];
  canSeePreview: boolean;
  canSeeFull: boolean;
  canRequestBook: boolean;
  canMessage: boolean;
  canRequestIntro: boolean;
  mutualConnections: TrustPathUser[];
}

const MapView = dynamic(
  () => import("./map-view").then((m) => m.MapView),
  { ssr: false, loading: () => <MapFallback /> }
);

interface Props {
  listings: BrowseListing[];
  headingText: string;
  /** Listing IDs the signed-in user has already wishlisted. */
  savedIds?: string[];
  /**
   * Per-listing trust info keyed by listing id. Missing entries are
   * treated as "no gate / fully visible" (public viewing, or a
   * listing whose gate is 0).
   */
  trustByListing?: Record<string, BrowseListingTrust>;
  /** True if the viewer is signed in (affects gated-card CTAs). */
  isSignedIn?: boolean;
  /** True if the viewer is signed in but has zero inbound vouches (cold-start). */
  isZeroVouches?: boolean;
  /** Current user's internal id — needed to build a shareable vouch link. */
  currentUserId?: string | null;
  /**
   * Compact Filters pill for the mobile header row. On desktop the
   * Filters button lives in the top nav cluster, so this slot is only
   * visible on small screens.
   */
  mobileFiltersSlot: React.ReactNode;
}

type ViewMode = "grid" | "split" | "map";

export function BrowseLayout({
  listings,
  headingText,
  savedIds = [],
  trustByListing = {},
  isSignedIn = false,
  isZeroVouches = false,
  currentUserId = null,
  mobileFiltersSlot,
}: Props) {
  const [shareCopied, setShareCopied] = useState(false);

  const copyVouchLink = async () => {
    if (!currentUserId) return;
    const url = `${window.location.origin}/profile/${currentUserId}?vouch=1`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);
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

  // Sparse-state note — when results are thin, prod the user toward
  // expanding the search instead of silently showing an empty row.
  // Threshold matches the filter-sheet's "hide histogram below 10"
  // signal so the cues move together.
  const showSparseNote =
    listings.length > 0 && listings.length < 5;


  // Heading row with sort/filters — lives inside the left column so the
  // sort pill aligns with the right edge of the grid (not the far right
  // of the page) and the map column extends all the way up to this row.
  // Mobile: heading on its own line, pills on the line below.
  // Desktop: single row with heading left, pills right-aligned.
  const headerRow = (
    <div className="mb-4 md:flex md:items-center md:justify-between md:gap-3">
      <h1 className="text-lg font-semibold">{headingText}</h1>
      <div className="mt-3 flex items-center gap-2 md:mt-0">
        <div className="md:hidden">{mobileFiltersSlot}</div>
        <SortDropdown />
      </div>
    </div>
  );

  if (listings.length === 0) {
    return (
      <div>
        {headerRow}
        {isZeroVouches ? (
          <ZeroVouchesPanel
            currentUserId={currentUserId}
            shareCopied={shareCopied}
            onCopyVouchLink={copyVouchLink}
            isEmpty
          />
        ) : isSignedIn ? (
          // User has vouches but no listings show — network-growth
          // nudge instead of a generic empty-search message. Frames
          // the empty state as "more network = more listings" so the
          // CTA fits the trust model.
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <SearchX className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">
              No listings in this area yet
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Ask connections to host, or expand by inviting more
              friends. You can also try clearing filters or expanding
              your search area.
            </p>
            <Link
              href="/invite"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
            >
              <UserPlus className="h-4 w-4" />
              Invite a friend
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <SearchX className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">
              No listings match your search
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Try adjusting your location, dates, or filters. Clearing filters
              will show every available stay.
            </p>
          </div>
        )}
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
          {/* Left column — heading row + grid of cards.
              No independent scroll container: the whole page scrolls,
              and the map column uses sticky to stay pinned. This avoids
              clipping hover shadows against an overflow box and lets the
              footer be replaced by the map extending to viewport bottom. */}
          <div>
            {/* Zero-vouches banner — preview-only explainer + two CTAs. */}
            {isZeroVouches && (
              <ZeroVouchesPanel
                currentUserId={currentUserId}
                shareCopied={shareCopied}
                onCopyVouchLink={copyVouchLink}
              />
            )}

            {/* Sign-in CTA for unauthenticated users */}
            {!isSignedIn && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
                <Lock className="h-5 w-5 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  <Link href="/sign-in" className="font-semibold text-foreground underline underline-offset-2">Sign in</Link>
                  {" "}or{" "}
                  <Link href="/sign-up" className="font-semibold text-foreground underline underline-offset-2">sign up</Link>
                  {" "}to see trusted listings from your network.
                </p>
              </div>
            )}

            {headerRow}
            <div className={cn("grid gap-3", gridCols)}>
              {listings.map((l) => {
                const trust = trustByListing[l.id];
                return (
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
                    <LiveListingCard
                      listing={l}
                      initialSaved={savedSet.has(l.id)}
                      trust={trust}
                      isSignedIn={isSignedIn}
                    />
                  </div>
                );
              })}
            </div>
            {showSparseNote && (
              <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Only {listings.length} listing
                  {listings.length === 1 ? "" : "s"} in this search — try
                  expanding your search area or clearing filters to see
                  more.
                </p>
              </div>
            )}
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

      {/* Mobile map toggle — floats above the mobile tab bar. The
          bottom offset accounts for the tab bar height + iOS safe
          area + 1rem breathing gap. */}
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

/**
 * Sparse-state panel for signed-in 0° users. When `isEmpty` is true,
 * no host has opted into a public preview for this filter set — we
 * render the panel by itself. Otherwise it sits above the preview-
 * only grid as an explainer banner.
 */
function ZeroVouchesPanel({
  currentUserId,
  shareCopied,
  onCopyVouchLink,
  isEmpty = false,
}: {
  currentUserId: string | null;
  shareCopied: boolean;
  onCopyVouchLink: () => void;
  isEmpty?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-5 md:p-6",
        isEmpty ? "my-8" : "mb-4"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <Eye className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground md:text-lg">
            You can preview listings outside your network.
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get vouched or invite friends to unlock full listings. Hosts only
            share the full details with people their network trusts.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/invite"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <UserPlus className="h-4 w-4" />
              Invite a friend
            </Link>
            {currentUserId && (
              <Button
                type="button"
                variant="outline"
                onClick={onCopyVouchLink}
                className="h-9 gap-1.5 rounded-lg border-border bg-white px-4 text-sm font-semibold hover:bg-muted"
              >
                {shareCopied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    Link copied
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Request a vouch
                  </>
                )}
              </Button>
            )}
          </div>
          {isEmpty && (
            <p className="mt-4 text-xs text-muted-foreground">
              No hosts have opted into public previews for this search. Try
              clearing filters or adjusting your location.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
