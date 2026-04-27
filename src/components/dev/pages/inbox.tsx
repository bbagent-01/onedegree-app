// REMOVE BEFORE BETA — Dev2 (design system page).
"use client";

import { InboxShell } from "@/components/inbox/inbox-shell";
import type { InboxThread } from "@/lib/messaging-data";
import { fakeAvatar } from "@/lib/dev-theme/fixtures";
import { PageChrome } from "./Chrome";

const mockThreads: InboxThread[] = [
  {
    id: "thread-1",
    listing_id: "listing-1",
    guest_id: "viewer",
    host_id: "host-sarah",
    contact_request_id: null,
    last_message_at: "2026-04-22T14:32:00Z",
    last_message_preview: "Sounds good — let me check the calendar and confirm.",
    unread_count: 1,
    role: "guest",
    other_user: {
      id: "host-sarah",
      name: "Sarah Mendel",
      avatar_url: fakeAvatar("sarah"),
    },
    listing: {
      id: "listing-1",
      title: "Sun-drenched studio with garden access",
      area_name: "Mission District, San Francisco",
      thumbnail_url:
        "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=200&q=70",
    },
    trust_score: 88,
    trust_connection_count: 2,
    trust_is_direct: true,
    trust_degree: 1,
    trust_connector_paths: [],
    pending_photo_request_count: 0,
    is_intro_request: false,
    intro: null,
    origin_proposal_id: null,
  },
  {
    id: "thread-2",
    listing_id: null,
    guest_id: "viewer",
    host_id: "host-mike",
    contact_request_id: null,
    last_message_at: "2026-04-20T09:11:00Z",
    last_message_preview: "Thanks for the intro! I'll reach out tomorrow.",
    unread_count: 0,
    role: "guest",
    other_user: {
      id: "host-mike",
      name: "Mike Tran",
      avatar_url: fakeAvatar("mike"),
    },
    listing: null,
    trust_score: 62,
    trust_connection_count: 1,
    trust_is_direct: false,
    trust_degree: 2,
    trust_connector_paths: [],
    pending_photo_request_count: 0,
    is_intro_request: false,
    intro: null,
    origin_proposal_id: null,
  },
  {
    id: "thread-3",
    listing_id: "listing-3",
    guest_id: "viewer",
    host_id: "host-priya",
    contact_request_id: null,
    last_message_at: "2026-04-18T16:00:00Z",
    last_message_preview:
      "Loren wants an introduction to the host of Stinson cabin.",
    unread_count: 0,
    role: "host",
    other_user: {
      id: "guest-loren",
      name: "Loren Polster",
      avatar_url: fakeAvatar("loren"),
    },
    listing: {
      id: "listing-3",
      title: "Hidden hillside cabin",
      area_name: "Stinson Beach, CA",
      thumbnail_url:
        "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=200&q=70",
    },
    trust_score: 42,
    trust_connection_count: 1,
    trust_is_direct: false,
    trust_degree: 3,
    trust_connector_paths: [],
    pending_photo_request_count: 0,
    is_intro_request: true,
    intro: {
      sender_id: "guest-loren",
      recipient_id: "host-priya",
      status: "pending",
      decided_at: null,
    },
    origin_proposal_id: null,
  },
];

export function InboxPageV1() {
  return (
    <PageChrome>
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 md:py-10">
        <h1 className="mb-4 text-2xl font-semibold md:text-3xl">Messages</h1>
        <InboxShell
          threads={mockThreads}
          initialSelected={null}
          currentUserId="viewer"
          currentUserName="Loren Polster"
          currentUserAvatar={fakeAvatar("loren")}
        />
      </div>
    </PageChrome>
  );
}
