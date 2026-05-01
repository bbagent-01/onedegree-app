import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { getEffectiveUserId } from "@/lib/impersonation/session";
import {
  getBrowseListings,
  getBrowsePriceRange,
} from "@/lib/browse-data";
import { getSavedListingIds } from "@/lib/wishlist-data";
import { fetchVisibleProposals } from "@/lib/proposals-data";
import { computeIncomingTrustPaths } from "@/lib/trust-data";
import {
  checkListingAccess,
  getActiveGrantorIds,
} from "@/lib/trust/check-access";
import type { AccessSettings } from "@/lib/trust/types";
import type { BrowseListingTrust } from "@/components/browse/browse-layout";
import { activeFilterCount, parseBrowseParams } from "@/lib/browse-utils";
import { BrowseFeed, type BrowseMode, type TravelShow } from "@/components/browse/browse-feed";
import { FilterSheet } from "@/components/browse/filter-sheet";
import { ListingCardSkeleton } from "@/components/listing-card-skeleton";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function readMode(raw: string | string[] | undefined): BrowseMode {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "host" ? "host" : "travel";
}

function readShow(raw: string | string[] | undefined): TravelShow {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "listings" || v === "host_offers") return v;
  return "all";
}

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
  const mode = readMode(params.mode);
  const show = readShow(params.show);

  return (
    <Suspense fallback={<GridSkeleton />}>
      <BrowseResults
        filters={filters}
        activeCount={filterCount}
        mode={mode}
        show={show}
      />
    </Suspense>
  );
}

async function BrowseResults({
  filters,
  activeCount,
  mode,
  show,
}: {
  filters: ReturnType<typeof parseBrowseParams>;
  activeCount: number;
  mode: BrowseMode;
  show: TravelShow;
}) {
  // Resolve the signed-in viewer's internal user id once.
  const { userId: clerkId } = await auth();
  let viewerId: string | null = null;
  let savedIds: string[] = [];
  let viewerVouchCountReceived = 0;
  if (clerkId) {
    viewerId = await getEffectiveUserId(clerkId);
    if (viewerId) {
      const set = await getSavedListingIds(viewerId);
      savedIds = [...set];
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

  // ── Listings (Travel mode) ──────────────────────────────────
  let listings = mode === "travel" ? await getBrowseListings(filters) : [];
  const trustByListing: Record<string, BrowseListingTrust> = {};
  if (mode === "travel") {
    if (viewerId) {
      listings = listings.filter((l) => l.host_id !== viewerId);
    }
    if (viewerId && listings.length > 0) {
      const hostIds = [...new Set(listings.map((l) => l.host_id).filter(Boolean))];
      const trustResults = await computeIncomingTrustPaths(hostIds, viewerId);
      const grantedHostIds = await getActiveGrantorIds(hostIds, viewerId);
      for (const l of listings) {
        const r = trustResults[l.host_id];
        const score = r?.score ?? 0;
        const degree = r?.degree ?? null;
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
          mutualConnections: r?.mutualConnections ?? [],
        };
      }
    } else {
      // Logged-out viewers (or empty list): score=0 access checks
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

    // Cold-start gate + access gate + trust filters (unchanged)
    const isZeroVouches = viewerId !== null && viewerVouchCountReceived === 0;
    if (isZeroVouches) {
      listings = listings.filter((l) => {
        const settings = l.access_settings;
        const seePreviewType = settings?.see_preview?.type ?? "anyone";
        return seePreviewType === "anyone";
      });
    }
    listings = listings.filter(
      (l) => trustByListing[l.id]?.canSeePreview || trustByListing[l.id]?.canSeeFull
    );
    if (filters.fullAccessOnly) {
      listings = listings.filter((l) => trustByListing[l.id]?.canSeeFull);
    }
    if (typeof filters.minTrust === "number" && filters.minTrust > 0) {
      const minTrust = filters.minTrust;
      listings = listings.filter(
        (l) => (trustByListing[l.id]?.trust_score ?? 0) >= minTrust
      );
    }
    if (filters.sort === "trust_desc") {
      listings = [...listings].sort((a, b) => {
        const sa = trustByListing[a.id]?.trust_score ?? 0;
        const sb = trustByListing[b.id]?.trust_score ?? 0;
        return sb - sa;
      });
    }
  }

  // ── Proposals — host offers (Travel) or trip wishes (Host) ──
  let hostOffers = mode === "travel"
    ? await fetchVisibleProposals({
        viewerId,
        kind: "host_offer",
        limit: 50,
      })
    : [];
  hostOffers = hostOffers.filter(
    (p) =>
      p.row.author_id !== viewerId &&
      (p.trustDegree === 1 || p.trustDegree === 2 || p.trustDegree === 3)
  );

  let tripWishes = mode === "host"
    ? await fetchVisibleProposals({
        viewerId,
        kind: "trip_wish",
        limit: 100,
      })
    : [];
  tripWishes = tripWishes.filter((p) => p.row.author_id !== viewerId);

  // Best-effort destination filter when the user typed in Where —
  // proposals get the same `?location=` term applied as a substring
  // match against destinations / title / description so the search
  // bar feels coherent in either mode.
  if (filters.location) {
    const q = filters.location.toLowerCase();
    const matches = (p: typeof hostOffers[number]) => {
      const blob = (
        p.row.destinations.join(" ") +
        " " +
        p.row.title +
        " " +
        (p.row.description ?? "")
      ).toLowerCase();
      return blob.includes(q);
    };
    hostOffers = hostOffers.filter(matches);
    tripWishes = tripWishes.filter(matches);
  }

  // Filter sheet uses the same data path as before, regardless of
  // mode — the sheet handles date / guest / amenity / price filters
  // which are all listing-side concerns.
  const { priceMin, priceMax, bedrooms, beds, bathrooms, ...rest } = filters;
  void priceMin;
  void priceMax;
  void bedrooms;
  void beds;
  void bathrooms;
  const priceRange = await getBrowsePriceRange(rest);

  return (
    <BrowseFeed
      mode={mode}
      show={show}
      listings={listings}
      hostOffers={hostOffers}
      tripWishes={tripWishes}
      trustByListing={trustByListing}
      savedIds={savedIds}
      isSignedIn={Boolean(viewerId)}
      filtersSlot={
        <FilterSheet priceRange={priceRange} activeCount={activeCount} />
      }
    />
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 px-4 py-10 sm:grid-cols-2 md:px-10 lg:grid-cols-3 lg:px-20 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}
