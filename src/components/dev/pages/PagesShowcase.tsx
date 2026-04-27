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
  variants: VariantSpec[];
}

const ROUTES: Record<PageRouteId, RouteSpec> = {
  "pages-browse": {
    routeLabel: "/browse",
    filePath: "src/app/(app)/browse/page.tsx",
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
      <div>
        <h2 className="text-xl font-semibold">Page · {spec.routeLabel}</h2>
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

      {/* Full-bleed live page — children render at the natural width
       *  of the design-system content area (which is itself full-window
       *  when on a pages-* section per DesignSystemRoot). */}
      <div className="-mx-6 overflow-x-hidden border-y-2 border-border bg-white md:-mx-10">
        {variant.render()}
      </div>
    </section>
  );
}
