// REMOVE BEFORE BETA — Dev2 (design system page).
"use client";

import { BrowseLayout } from "@/components/browse/browse-layout";
import {
  sampleBrowseListingFull,
  sampleBrowseListingPreview,
  sampleBrowseListingGated,
  sampleTrustFull,
  sampleTrustPreview,
  sampleTrustGated,
} from "@/lib/dev-theme/fixtures";
import type { BrowseListing } from "@/lib/browse-data";
import { PageChrome } from "./Chrome";

// Build an 8-card fixture grid covering every visibility state.
function buildBrowseFixture() {
  const more: BrowseListing[] = [
    {
      ...sampleBrowseListingFull,
      id: "browse-mid-1",
      title: "Desert cabin · Joshua Tree",
      area_name: "Joshua Tree, CA",
      price_min: 180,
      price_max: 220,
    },
    {
      ...sampleBrowseListingFull,
      id: "browse-mid-2",
      title: "Lakefront A-frame",
      area_name: "South Lake Tahoe, CA",
      price_min: 260,
      price_max: 320,
    },
    {
      ...sampleBrowseListingFull,
      id: "browse-mid-3",
      title: "Treehouse studio",
      area_name: "Mendocino, CA",
      price_min: 145,
      price_max: 165,
    },
    {
      ...sampleBrowseListingFull,
      id: "browse-mid-4",
      title: "Vineyard guest cottage",
      area_name: "Sonoma, CA",
      price_min: 200,
      price_max: 240,
    },
    {
      ...sampleBrowseListingFull,
      id: "browse-mid-5",
      title: "Cozy downtown loft",
      area_name: "Portland, OR",
      price_min: 130,
      price_max: 160,
    },
  ];
  const listings: BrowseListing[] = [
    sampleBrowseListingFull,
    sampleBrowseListingPreview,
    ...more,
    sampleBrowseListingGated,
  ];
  const trustByListing = {
    [sampleBrowseListingFull.id]: sampleTrustFull,
    [sampleBrowseListingPreview.id]: sampleTrustPreview,
    [sampleBrowseListingGated.id]: sampleTrustGated,
    "browse-mid-1": { ...sampleTrustFull, degree: 2 as const, trust_score: 62 },
    "browse-mid-2": { ...sampleTrustFull, degree: 1 as const, trust_score: 84 },
    "browse-mid-3": {
      ...sampleTrustPreview,
      degree: 3 as const,
      trust_score: 38,
    },
    "browse-mid-4": { ...sampleTrustFull, degree: 1 as const, trust_score: 90 },
    "browse-mid-5": { ...sampleTrustFull, degree: 2 as const, trust_score: 58 },
  };
  return { listings, trustByListing };
}

export function BrowsePageV1() {
  const { listings, trustByListing } = buildBrowseFixture();
  return (
    <PageChrome>
      <div className="w-full px-4 md:px-10 lg:px-20">
        <div className="mt-6">
          <BrowseLayout
            listings={listings}
            headingText="Stays in your network"
            savedIds={[]}
            trustByListing={trustByListing}
            isSignedIn
            isZeroVouches={false}
            currentUserId="dev-viewer"
            mobileFiltersSlot={null}
          />
        </div>
      </div>
    </PageChrome>
  );
}
