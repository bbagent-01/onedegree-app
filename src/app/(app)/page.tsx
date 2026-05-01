// B4 home page — replaces the old `src/app/page.tsx` redirect-to-
// /browse with the locked /sandbox/layouts/home-v4 layout, wired
// to real data:
//   • signed-out → minimal landing card (logo + sign-up / sign-in /
//     invite explanation). Onboarding takeover keeps firing post-
//     sign-up via OnboardingMount in the (app) layout.
//   • signed-in  → home-v4 feed (greeting, CTA strip, four marquees)
//     populated from existing live queries. No new endpoints, no new
//     columns, no fabricated data sources.

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCurrentUser } from "@/lib/messaging-data";
import { fetchVisibleProposals } from "@/lib/proposals-data";
import { getNetworkData } from "@/lib/network-data";
import { getBrowseListings } from "@/lib/browse-data";
import { getSavedListingIds } from "@/lib/wishlist-data";
import {
  computeIncomingTrustPaths,
} from "@/lib/trust-data";
import {
  checkListingAccess,
  getActiveGrantorIds,
} from "@/lib/trust/check-access";
import type { AccessSettings } from "@/lib/trust/types";
import type { BrowseListingTrust } from "@/components/browse/browse-layout";
import { SignedOutLanding } from "@/components/home/signed-out-landing";
import { HomeFeed } from "@/components/home/home-feed";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const MARQUEE_LIMIT = 12;

export default async function HomePage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return <SignedOutLanding />;
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    // Authenticated with Clerk but the users row hasn't been
    // provisioned yet (post-signup webhook race). Send them to
    // /browse — it handles the in-between state cleanly and the
    // Clerk-webhook backfill catches up within a few seconds.
    redirect("/browse");
  }

  const firstName = currentUser.name?.split(" ")[0] || "there";

  // Pull both proposal kinds + network + browse listings in parallel.
  // All four queries already exist; reused exactly the way /proposals,
  // /dashboard, and /browse use them — no new patterns introduced.
  const [tripWishesAll, hostOffersAll, networkData, browseListings, savedSet] =
    await Promise.all([
      fetchVisibleProposals({
        viewerId: currentUser.id,
        kind: "trip_wish",
        limit: 50,
      }),
      fetchVisibleProposals({
        viewerId: currentUser.id,
        kind: "host_offer",
        limit: 50,
      }),
      getNetworkData(),
      getBrowseListings({}),
      getSavedListingIds(currentUser.id),
    ]);

  // Marquees show "from your network": already-trust-filtered (audience
  // gate passed) AND viewer has a 1°/2° path to the audience host. The
  // 3°/4° tail still shows on /proposals; we tighten the home feed so
  // the "your network" framing is honest.
  const tripWishes = tripWishesAll
    .filter(
      (p) =>
        p.row.author_id !== currentUser.id &&
        (p.trustDegree === 1 || p.trustDegree === 2)
    )
    .slice(0, MARQUEE_LIMIT);
  const hostOffers = hostOffersAll
    .filter(
      (p) =>
        p.row.author_id !== currentUser.id &&
        (p.trustDegree === 1 || p.trustDegree === 2)
    )
    .slice(0, MARQUEE_LIMIT);

  // People — combine 1° vouchedFor + vouchedBy, dedupe, cap. Same
  // shape NetworkSection consumes; no new fetch.
  const networkPeople = (() => {
    if (!networkData) return [];
    const seen = new Set<string>();
    const merged: typeof networkData.vouchedFor = [];
    for (const p of [...networkData.vouchedBy, ...networkData.vouchedFor]) {
      if (seen.has(p.user_id)) continue;
      seen.add(p.user_id);
      merged.push(p);
      if (merged.length >= MARQUEE_LIMIT) break;
    }
    return merged;
  })();

  // Listings — apply the exact /browse access pipeline so the
  // "Stays from people you know" marquee respects the same RLS-
  // backed filtering. Then narrow to 1°/2° hosts with full access.
  const ownedFiltered = browseListings.filter(
    (l) => l.host_id !== currentUser.id
  );
  const hostIds = [...new Set(ownedFiltered.map((l) => l.host_id))];
  const listingTrust: Record<string, BrowseListingTrust> = {};
  let networkListings: typeof ownedFiltered = [];
  if (hostIds.length > 0) {
    const trustResults = await computeIncomingTrustPaths(
      hostIds,
      currentUser.id
    );
    const grantedHostIds = await getActiveGrantorIds(hostIds, currentUser.id);
    for (const l of ownedFiltered) {
      const r = trustResults[l.host_id];
      const score = r?.score ?? 0;
      const degree = r?.degree ?? null;
      const access = checkListingAccess(
        currentUser.id,
        {
          host_id: l.host_id,
          visibility_mode: l.visibility_mode,
          access_settings: l.access_settings as AccessSettings | null,
        },
        score,
        degree,
        grantedHostIds.has(l.host_id)
      );
      listingTrust[l.id] = {
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
    networkListings = ownedFiltered
      .filter((l) => {
        const t = listingTrust[l.id];
        return (
          t &&
          (t.degree === 1 || t.degree === 2) &&
          t.canSeeFull
        );
      })
      .slice(0, MARQUEE_LIMIT);
  }

  return (
    <HomeFeed
      firstName={firstName}
      tripWishes={tripWishes}
      hostOffers={hostOffers}
      networkPeople={networkPeople}
      networkListings={networkListings}
      savedListingIds={[...savedSet]}
      listingTrust={listingTrust}
    />
  );
}
