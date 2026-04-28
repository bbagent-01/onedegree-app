// REMOVE BEFORE BETA — Dev2 (design system page).
"use client";

import Link from "next/link";
import { BellRing, Plus } from "lucide-react";
import { ProposalsFeedWithFilters } from "@/components/proposals/feed-with-filters";
import { sampleProposals, DEV_VIEWER_ID } from "@/lib/dev-theme/fixtures";
import { PageChrome } from "./Chrome";

export function ProposalsPageV1() {
  return (
    <PageChrome>
      <div className="mx-auto w-full max-w-[960px] px-4 py-6 md:px-6 md:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold md:text-3xl">
              Proposals in your network
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Trip Wishes and Host Offers from people you can see — bounded by
              each post&apos;s preview network.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="#"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-white px-4 text-sm font-semibold hover:bg-muted"
            >
              <BellRing className="h-4 w-4" />
              Alerts
            </Link>
            <Link
              href="#"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90"
            >
              <Plus className="h-4 w-4" />
              Create
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ["All", true],
            ["Trip Wishes", false],
            ["Host Offers", false],
          ].map(([label, active]) => (
            <span
              key={label as string}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                active
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border bg-white text-foreground"
              }`}
            >
              {label as string}
            </span>
          ))}
        </div>

        <div className="mt-6">
          <ProposalsFeedWithFilters
            proposals={sampleProposals}
            viewerId={DEV_VIEWER_ID}
          />
        </div>
      </div>
    </PageChrome>
  );
}
