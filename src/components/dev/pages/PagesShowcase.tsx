// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.
//
// Faithful page previews. Each route imports the actual client
// components used by the live route + feeds them fixture data, so
// (a) the previews mirror the real page section-for-section, and
// (b) sandbox theme overrides flow through naturally.
//
// Variants are sub-tabs: v1 is the live-accurate baseline; v2/v3
// (added later) compose alternative structures or styles for design
// exploration. Each variant function lives in its own file under
// ./pages/<route>/v1.tsx etc., re-exported here.
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

import { BrowsePageV1 } from "./browse";
import { ListingPageV1Full, ListingPageV1Gated } from "./listing";
import { ProfilePageV1 } from "./profile";
import { InboxPageV1 } from "./inbox";
import { ProposalsPageV1 } from "./proposals";

export type PageRouteId =
  | "pages-browse"
  | "pages-listing"
  | "pages-profile"
  | "pages-inbox"
  | "pages-proposals";

interface VariantSpec {
  id: string;
  label: string;
  blurb?: string;
  render: () => React.ReactNode;
}

interface RouteSpec {
  routeLabel: string;
  filePath: string;
  blurb: string;
  /** Numbered eyebrow ("01", "02"…) + big serif page headline shown
   *  above the preview frame. Picks up Guesty styling under the
   *  Guesty Forest preset; reads as a normal section label under the
   *  default preset. <em>-wrapped phrases get an italic mint accent
   *  in Guesty mode. */
  num: string;
  headline: React.ReactNode;
  tagline?: string;
  variants: VariantSpec[];
}

const ROUTES: Record<PageRouteId, RouteSpec> = {
  "pages-browse": {
    routeLabel: "/browse",
    filePath: "src/app/(app)/browse/page.tsx",
    num: "01",
    headline: (
      <>
        Stays from the people <em>you trust</em>.
      </>
    ),
    tagline: "Glass tiles over the green ground, with circle-vouch counts and 1°/2° badges.",
    blurb:
      "Renders the live BrowseLayout client component with fixture listings + per-listing trust. Sandbox theme overrides flow through. Heart icon will fail (no signed-in flow).",
    variants: [
      {
        id: "v1",
        label: "v1 · live-accurate",
        blurb: "Mirrors the alpha-c /browse layout 1:1.",
        render: () => <BrowsePageV1 />,
      },
    ],
  },
  "pages-listing": {
    routeLabel: "/listings/[id]",
    filePath: "src/app/(app)/listings/[id]/page.tsx",
    num: "02",
    headline: (
      <>
        A place <em>worth the trip</em>.
      </>
    ),
    tagline: "Photo gallery + glass booking card. Gated state when trust isn't there yet.",
    blurb:
      "Two access states. FULL composes the real PhotoGallery, host card, BookingSidebar, ReviewsSection, and policy block live. GATED renders the real GatedListingView component with a preview-only fixture.",
    variants: [
      {
        id: "v1-full",
        label: "v1 · full access",
        render: () => <ListingPageV1Full />,
      },
      {
        id: "v1-gated",
        label: "v1 · gated preview",
        render: () => <ListingPageV1Gated />,
      },
    ],
  },
  "pages-profile": {
    routeLabel: "/profile/[id]",
    filePath: "src/app/(app)/profile/[id]/page.tsx",
    num: "03",
    headline: (
      <>
        The <em>human</em> behind the home.
      </>
    ),
    tagline: "Hero badge, vouch surfaces, listings + proposals from the same person.",
    blurb:
      "Composes the real header card (avatar + name + ConnectionPopover + VouchButton placeholder), bio, listings grid, proposals grid (live ProposalCard × N), and ProfileReviews tabbed surface.",
    variants: [
      {
        id: "v1",
        label: "v1 · 1° direct",
        render: () => <ProfilePageV1 degree={1} />,
      },
      {
        id: "v1-preview",
        label: "v1 · 0° preview",
        render: () => <ProfilePageV1 degree={null} />,
      },
    ],
  },
  "pages-inbox": {
    routeLabel: "/inbox",
    filePath: "src/app/(app)/inbox/page.tsx",
    num: "04",
    headline: (
      <>
        Conversations that <em>matter</em>.
      </>
    ),
    tagline: "Split-pane thread view. Inline structured cards for terms, payments, intros.",
    blurb:
      "Live InboxShell client component with fixture threads. Selecting a thread on desktop opens the live ThreadView; mobile pushes to /inbox/[threadId] (would-be navigation; preview is read-only).",
    variants: [
      {
        id: "v1",
        label: "v1 · live-accurate",
        render: () => <InboxPageV1 />,
      },
    ],
  },
  "pages-proposals": {
    routeLabel: "/proposals",
    filePath: "src/app/(app)/proposals/page.tsx",
    num: "05",
    headline: (
      <>
        Trips and offers <em>from your circle</em>.
      </>
    ),
    tagline: "Trip Wishes + Host Offers visible only through trust paths.",
    blurb:
      "Live ProposalsFeedWithFilters client component over the fixture proposals. Tab links + URL-synced filters fire — clicking a tab will push to /proposals?kind=... in this preview frame.",
    variants: [
      {
        id: "v1",
        label: "v1 · live-accurate",
        render: () => <ProposalsPageV1 />,
      },
    ],
  },
};

interface Props {
  route: PageRouteId;
}

export function PagesShowcase({ route }: Props) {
  const spec = ROUTES[route];
  const [activeVariant, setActiveVariant] = useState(spec.variants[0].id);
  const variant =
    spec.variants.find((v) => v.id === activeVariant) ?? spec.variants[0];

  return (
    <section className="space-y-4">
      {/* Eyebrow + big serif page headline. Plain styling under
          default; under Guesty the preset's CSS gives this the
          dramatic forest-hero treatment with italic mint accents. */}
      <div className="space-y-3 pt-4">
        <p className="eyebrow text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          <span className="num text-foreground">{spec.num}</span> —{" "}
          {spec.routeLabel.replace(/^\//, "").toUpperCase().replace(/\[ID\]/, "")}
        </p>
        <h1 className="max-w-[18ch] text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          {spec.headline}
        </h1>
        {spec.tagline && (
          <p className="max-w-2xl text-sm text-muted-foreground">
            {spec.tagline}
          </p>
        )}
      </div>

      <div className="border-t border-border pt-3">
        <code className="font-mono text-[11px] text-muted-foreground">
          {spec.filePath}
        </code>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          {spec.blurb}
        </p>
      </div>

      {spec.variants.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b pb-3">
          {spec.variants.map((v) => (
            <button
              key={v.id}
              onClick={() => setActiveVariant(v.id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                activeVariant === v.id
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-white hover:bg-muted"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      {variant.blurb && (
        <p className="text-xs text-muted-foreground">{variant.blurb}</p>
      )}

      {/* Live page preview — full-bleed under the default preset
       *  (-mx-6 / md:-mx-10 cancels the design-system content-area
       *  padding). Under Guesty Forest the preset's CSS catches
       *  .page-frame and turns this into a rounded-3xl forest screen
       *  with a heavy outset shadow, sitting on the deeper page bg. */}
      <div className="page-frame -mx-6 overflow-x-hidden border-y-2 border-border bg-white md:-mx-10">
        {variant.render()}
      </div>
    </section>
  );
}
