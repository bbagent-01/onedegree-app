import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { getEffectiveUserId } from "@/lib/impersonation/session";
import {
  getBrowseListings,
  getBrowsePriceRange,
  getBrowseSuggestions,
} from "@/lib/browse-data";
import { getSavedListingIds } from "@/lib/wishlist-data";
import {
  computeIncomingTrustPaths,
  getInternalUserIdFromClerk,
} from "@/lib/trust-data";
import {
  checkListingAccess,
  getActiveGrantorIds,
} from "@/lib/trust/check-access";
import type { AccessSettings } from "@/lib/trust/types";
import type { BrowseListingTrust } from "@/components/browse/browse-layout";
import { activeFilterCount, parseBrowseParams } from "@/lib/browse-utils";
import { SearchBar } from "@/components/browse/search-bar";
import { MobileSearchPill } from "@/components/browse/mobile-search-pill";
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
  // Anonymous viewers are allowed here — `checkListingAccess` hides
  // every listing whose see_preview gate isn't "anyone_anywhere", so
  // logged-out users see only the hosts who opted into a public
  // preview.
  const params = await searchParams;
  const filters = parseBrowseParams(params);
  const filterCount = activeFilterCount(filters);

  return (
    <div className="w-full">
      {/* Desktop: B4 swap — DesktopNav is hidden on this route by
          AppChrome (the sidebar lives there instead), so the
          NavCenterPortal target no longer mounts. Search + filters
          render here as a full-width header row at the top of the
          right-hand content column, per the locked direction. */}
      <div className="sticky top-0 z-30 hidden border-b border-border/60 bg-background/95 px-6 py-4 backdrop-blur md:block lg:px-10">
        <div className="flex w-full items-center gap-3">
          <div className="flex-1">
            <Suspense fallback={<div className="h-12" />}>
              <SuggestionsSearchBar compact />
            </Suspense>
          </div>
          <Suspense fallback={null}>
            <FiltersSlot filters={filters} activeCount={filterCount} />
          </Suspense>
        </div>
      </div>

      {/* Mobile sticky search pill — collapsed to "Start your search",
          opens a full-height sheet with stacked sections on tap. */}
      <div className="sticky top-0 z-30 border-b border-border/60 bg-white px-4 py-3 md:hidden">
        <Suspense fallback={<div className="h-14" />}>
          <MobileSearchPillSlot />
        </Suspense>
      </div>

      <div className="px-4 pt-6 md:px-10 lg:px-20">
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

  // Hide the viewer's own listings — the explore feed is for discovering
  // other hosts, not browsing your own inventory. Host manages those
  // from the dashboard.
  let viewerId: string | null = null;
  let savedIds: string[] = [];
  let viewerVouchCountReceived = 0;
  if (clerkId) {
    // ALPHA ONLY: getEffectiveUserId returns the impersonated user
    // when an admin is impersonating; otherwise it matches the
    // original clerk_id → users.id resolution.
    viewerId = await getEffectiveUserId(clerkId);
    if (viewerId) {
      const set = await getSavedListingIds(viewerId);
      savedIds = [...set];
      // Check if user has any inbound vouches (cold-start detection)
      const { getSupabaseAdmin } = await import("@/lib/supabase");
      const { data: vouchCountRow } = await getSupabaseAdmin()
        .from("users")
        .select("vouch_count_received")
        .eq("id", viewerId)
        .maybeSingle();
      viewerVouchCountReceived =
        (vouchCountRow as { vouch_count_received: number | null } | null)
          ?.vouch_count_received ?? 0;
    }
  }

  if (viewerId) {
    listings = listings.filter((l) => l.host_id !== viewerId);
  }

  // Trust direction is host→viewer (how much each host trusts the
  // viewer), matching the platform's host-vets-guest model. Reverse-
  // batched so we still do one DB roundtrip for N hosts.
  const trustByListing: Record<string, BrowseListingTrust> = {};
  if (viewerId && listings.length > 0) {
    const hostIds = [
      ...new Set(listings.map((l) => l.host_id).filter(Boolean)),
    ];
    const trustResults = await computeIncomingTrustPaths(hostIds, viewerId);
    // Batched grant lookup. Without this, the browse access check
    // disagreed with the listing-detail access check (which already
    // passes hasGrant) — a viewer who'd been granted access via an
    // accepted intro saw a locked card on /browse but full access on
    // click. One query covers every host on the page.
    const grantedHostIds = await getActiveGrantorIds(hostIds, viewerId);
    for (const l of listings) {
      const r = trustResults[l.host_id];
      const score = r?.score ?? 0;
      const degree = r?.degree ?? null;
      const mutualConnections = r?.mutualConnections ?? [];

      // Use checkListingAccess for proper per-action evaluation.
      // Pass the full degree (1-4 or null) so max_degrees can
      // evaluate 3° viewers correctly.
      const access = checkListingAccess(
        viewerId,
        {
          host_id: l.host_id,
          visibility_mode: l.visibility_mode,
          access_settings: l.access_settings as AccessSettings | null,
        },
        score,
        degree,
        grantedHostIds.has(l.host_id)
      );

      trustByListing[l.id] = {
        trust_score: score,
        degree,
        connectionCount: r?.connectionCount ?? 0,
        hasDirectVouch: r?.hasDirectVouch ?? false,
        connectorPaths: r?.connectorPaths ?? [],
        canSeePreview: access.can_see_preview,
        canSeeFull: access.can_see_full,
        canRequestBook: access.can_request_book,
        canMessage: access.can_message,
        canRequestIntro: access.can_request_intro,
        mutualConnections,
      };
    }
  } else {
    // Logged-out viewers: evaluate access with score=0
    for (const l of listings) {
      const access = checkListingAccess(
        null,
        {
          host_id: l.host_id,
          visibility_mode: l.visibility_mode,
          access_settings: l.access_settings as AccessSettings | null,
        },
        0
      );
      trustByListing[l.id] = {
        trust_score: 0,
        degree: null,
        connectionCount: 0,
        hasDirectVouch: false,
        connectorPaths: [],
        canSeePreview: access.can_see_preview,
        canSeeFull: access.can_see_full,
        canRequestBook: false,
        canMessage: false,
        canRequestIntro: false,
        mutualConnections: [],
      };
    }
  }

  // Zero-vouches users: only show listings where see_preview = anyone
  const isZeroVouches = viewerId !== null && viewerVouchCountReceived === 0;
  if (isZeroVouches) {
    listings = listings.filter((l) => {
      const settings = l.access_settings;
      const seePreviewType = settings?.see_preview?.type ?? "anyone";
      return seePreviewType === "anyone";
    });
  }

  // Filter out listings where the viewer can't see even the preview
  listings = listings.filter(
    (l) => trustByListing[l.id]?.canSeePreview || trustByListing[l.id]?.canSeeFull
  );

  // "Show only fully accessible" filter
  if (filters.fullAccessOnly) {
    listings = listings.filter((l) => trustByListing[l.id]?.canSeeFull);
  }

  // Trust score filter (client-side — trust is not a listings column).
  if (typeof filters.minTrust === "number" && filters.minTrust > 0) {
    const minTrust = filters.minTrust;
    listings = listings.filter(
      (l) => (trustByListing[l.id]?.trust_score ?? 0) >= minTrust
    );
  }

  // Trust sort — stable, applied after scoring.
  if (filters.sort === "trust_desc") {
    listings = [...listings].sort((a, b) => {
      const sa = trustByListing[a.id]?.trust_score ?? 0;
      const sb = trustByListing[b.id]?.trust_score ?? 0;
      return sb - sa;
    });
  }

  return (
    <BrowseLayout
      listings={listings}
      savedIds={savedIds}
      trustByListing={trustByListing}
      isSignedIn={Boolean(viewerId)}
      isZeroVouches={isZeroVouches}
      currentUserId={viewerId}
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
