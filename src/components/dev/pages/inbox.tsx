// REMOVE BEFORE BETA — Dev2 (design system page).
"use client";

import { useState } from "react";
import { InboxList } from "@/components/inbox/inbox-list";
import { ThreadView } from "@/components/inbox/thread-view";
import { ReservationSidebar } from "@/components/inbox/reservation-sidebar";
import { fakeAvatar } from "@/lib/dev-theme/fixtures";
import {
  sampleThreadDetails,
  threadActiveReservation,
} from "@/lib/dev-theme/inbox-fixtures";
import { PageChrome } from "./Chrome";

const VIEWER_ID = "viewer";
const VIEWER_NAME = "Loren Polster";
const VIEWER_AVATAR = fakeAvatar("loren");

/**
 * Custom inbox preview that mirrors the InboxShell 3-column layout
 * but selects threads from local fixtures instead of fetching from
 * /api/inbox/thread/[id]. Each fixture is a fully-populated
 * ThreadDetail so the live ThreadView + ReservationSidebar render
 * end-to-end (structured cards, timeline, payment methods, the
 * works).
 *
 * Click any list item on desktop → ThreadView re-keys to the new
 * thread, ReservationSidebar follows. Mobile would push to
 * /inbox/[threadId] in production; here we keep desktop-only since
 * the design system iframe is desktop-shaped.
 */
export function InboxPageV1() {
  const [selectedId, setSelectedId] = useState<string>(
    threadActiveReservation.id
  );
  const selected =
    sampleThreadDetails.find((t) => t.id === selectedId) ??
    sampleThreadDetails[0];

  return (
    <PageChrome>
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 md:py-10">
        <h1 className="mb-4 text-2xl font-semibold md:text-3xl">Messages</h1>

        <div className="grid h-[calc(100dvh-228px)] max-h-[calc(100dvh-228px)] grid-cols-1 overflow-hidden rounded-xl border border-border bg-white md:grid-cols-[360px_1fr] xl:grid-cols-[320px_1fr_340px]">
          <div className="border-r border-border md:overflow-y-auto">
            <InboxList
              threads={sampleThreadDetails}
              currentUserId={VIEWER_ID}
              selectedId={selected.id}
              onSelectThread={setSelectedId}
            />
          </div>
          <div className="hidden min-h-0 overflow-hidden md:flex md:flex-col">
            <ThreadView
              key={selected.id}
              thread={selected}
              currentUserId={VIEWER_ID}
              currentUserName={VIEWER_NAME}
              currentUserAvatar={VIEWER_AVATAR}
            />
          </div>
          <div className="hidden xl:flex xl:flex-col xl:overflow-hidden">
            <ReservationSidebar
              thread={selected}
              currentUserId={VIEWER_ID}
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Preview only — sending a message or accepting terms will hit
          alpha-c API endpoints with fixture IDs and fail silently. The
          rendering of every structured card type is real.
        </p>
      </div>
    </PageChrome>
  );
}
