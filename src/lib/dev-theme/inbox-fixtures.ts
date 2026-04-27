// REMOVE BEFORE BETA — Dev2 (design system page).
//
// Inbox-specific fixtures. The general fixture pool lives in
// fixtures.ts; these are heavy enough (full ThreadDetail with
// structured-message arrays, optional booking/intro/payment slices)
// that pulling them into a sibling file keeps fixtures.ts readable.

import type { ThreadDetail, ThreadMessage } from "@/lib/messaging-data";
import {
  TERMS_OFFERED_PREFIX,
  TERMS_ACCEPTED_PREFIX,
  paymentDueMessage,
  paymentClaimedMessage,
  paymentConfirmedMessage,
  INTRO_REQUEST_PREFIX,
} from "@/lib/structured-messages";
import { fakeAvatar } from "./fixtures";
import type { CancellationPolicy } from "@/lib/cancellation";

const VIEWER_ID = "viewer";

const moderatePolicy: CancellationPolicy = {
  approach: "refunds",
  preset: "moderate",
  payment_schedule: [
    { due_at: "booking", amount_type: "percentage", amount: 100 },
  ],
  refund_schedule: [
    { cutoff_days_before_checkin: 5, refund_pct: 100 },
    { cutoff_days_before_checkin: 1, refund_pct: 50 },
    { cutoff_days_before_checkin: 0, refund_pct: 0 },
  ],
  security_deposit: [],
  custom_note: null,
};

function msg(
  id: string,
  threadId: string,
  senderId: string | null,
  content: string,
  createdAt: string,
  isSystem = false
): ThreadMessage {
  return {
    id,
    thread_id: threadId,
    sender_id: senderId,
    content,
    is_system: isSystem,
    created_at: createdAt,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Thread 1 · Active reservation (terms accepted, payment in progress)
//   Loren (guest) ↔ Sarah (host) — Mission studio Jun 12–15
//   Includes terms_offered card, terms_accepted card, and a
//   payment_due structured event.
// ─────────────────────────────────────────────────────────────────────

export const threadActiveReservation: ThreadDetail = {
  id: "thread-active",
  listing_id: "listing-mission",
  guest_id: VIEWER_ID,
  host_id: "host-sarah",
  contact_request_id: "cr-active",
  last_message_at: "2026-04-21T14:02:00Z",
  last_message_preview: "Payment 1 of 2 due Jun 5",
  unread_count: 1,
  role: "guest",
  other_user: {
    id: "host-sarah",
    name: "Sarah Mendel",
    avatar_url: fakeAvatar("sarah"),
  },
  listing: {
    id: "listing-mission",
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
  messages: [
    msg(
      "m1",
      "thread-active",
      VIEWER_ID,
      "Hi Sarah! We're hoping to visit Jun 12–15. Two of us, no pets — would your studio be open?",
      "2026-04-12T09:00:00Z"
    ),
    msg(
      "m2",
      "thread-active",
      "host-sarah",
      "Hi Loren! Those dates are open. Sending over terms in a sec.",
      "2026-04-12T10:32:00Z"
    ),
    msg(
      "m3",
      "thread-active",
      null,
      TERMS_OFFERED_PREFIX,
      "2026-04-12T10:34:00Z",
      true
    ),
    msg(
      "m4",
      "thread-active",
      null,
      TERMS_ACCEPTED_PREFIX,
      "2026-04-12T11:18:00Z",
      true
    ),
    msg(
      "m5",
      "thread-active",
      VIEWER_ID,
      "Confirmed — looking forward to it!",
      "2026-04-12T11:20:00Z"
    ),
    msg(
      "m6",
      "thread-active",
      null,
      paymentDueMessage("pay-1"),
      "2026-04-21T14:02:00Z",
      true
    ),
  ],
  intro_detail: null,
  origin_proposal: null,
  booking: {
    id: "booking-active",
    status: "accepted",
    check_in: "2026-06-12",
    check_out: "2026-06-15",
    guest_count: 2,
    total_estimate: 545,
    message: null,
    responded_at: "2026-04-12T10:34:00Z",
    host_response_message: null,
    created_at: "2026-04-12T09:00:00Z",
    terms_accepted_at: "2026-04-12T11:18:00Z",
    terms_declined_at: null,
    terms_declined_by: null,
    original_check_in: "2026-06-12",
    original_check_out: "2026-06-15",
    original_guest_count: 2,
    original_total_estimate: 545,
    original_cancellation_policy: moderatePolicy,
    edits_requested_at: null,
    edits_requested_by: null,
    last_edited_at: null,
    edit_count: 0,
    offered_nightly_rate: 165,
    offered_cleaning_fee: 50,
  },
  reservation_sidebar: {
    listing_price_min: 140,
    listing_price_max: 185,
    listing_cleaning_fee: 50,
    listing_rating_avg: 4.92,
    listing_review_count: 47,
    other_user_host_rating: 4.92,
    other_user_guest_rating: null,
    other_user_review_count: 47,
    other_user_is_host: true,
    other_user_joined_year: 2023,
    other_user_location: "San Francisco, CA",
    stay_confirmation_id: null,
    stay_reviewed_by_me: false,
    viewer_has_vouched: true,
    cancellation_policy: moderatePolicy,
    host_payment_methods: [
      { type: "venmo", handle: "@sarahm", note: null, enabled: true },
      {
        type: "zelle",
        handle: "sarah@example.com",
        note: null,
        enabled: true,
      },
    ],
  },
  payment_events: [
    {
      id: "pay-1",
      contact_request_id: "cr-active",
      schedule_index: 0,
      amount_cents: 27250,
      due_at: "2026-06-05",
      status: "scheduled",
      method: null,
      claimed_at: null,
      confirmed_at: null,
      note: null,
    },
    {
      id: "pay-2",
      contact_request_id: "cr-active",
      schedule_index: 1,
      amount_cents: 27250,
      due_at: "2026-06-11",
      status: "scheduled",
      method: null,
      claimed_at: null,
      confirmed_at: null,
      note: null,
    },
  ],
  issue_reports: [],
  photo_requests: [],
};

// ─────────────────────────────────────────────────────────────────────
// Thread 2 · Intro request (pending)
//   Loren (sender) → Priya (recipient, can introduce to Stinson host)
// ─────────────────────────────────────────────────────────────────────

export const threadIntroPending: ThreadDetail = {
  id: "thread-intro",
  listing_id: "listing-stinson",
  guest_id: VIEWER_ID,
  host_id: "host-priya",
  contact_request_id: null,
  last_message_at: "2026-04-19T16:00:00Z",
  last_message_preview: "Loren wants an introduction to the host of Stinson cabin",
  unread_count: 0,
  role: "guest",
  other_user: {
    id: "host-priya",
    name: "Priya Shah",
    avatar_url: fakeAvatar("priya"),
  },
  listing: {
    id: "listing-stinson",
    title: "Hidden hillside cabin",
    area_name: "Stinson Beach, CA",
    thumbnail_url:
      "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=200&q=70",
  },
  trust_score: 62,
  trust_connection_count: 1,
  trust_is_direct: false,
  trust_degree: 2,
  trust_connector_paths: [],
  pending_photo_request_count: 0,
  is_intro_request: true,
  intro: {
    sender_id: VIEWER_ID,
    recipient_id: "host-priya",
    status: "pending",
    decided_at: null,
  },
  origin_proposal_id: null,
  messages: [
    msg(
      "i1",
      "thread-intro",
      null,
      INTRO_REQUEST_PREFIX,
      "2026-04-19T16:00:00Z",
      true
    ),
  ],
  intro_detail: {
    sender_id: VIEWER_ID,
    recipient_id: "host-priya",
    status: "pending",
    message:
      "Hey Priya — would love an intro to the owner of the Stinson cabin. Planning a family weekend Jun 12–15 for 2 adults.",
    start_date: "2026-06-12",
    end_date: "2026-06-15",
    decided_at: null,
    sender_profile: {
      id: VIEWER_ID,
      name: "Loren Polster",
      avatar_url: fakeAvatar("loren"),
      bio: "Founder, Trustead. Frequent traveler.",
      member_since_year: 2024,
      host_rating_avg: null,
      guest_rating_avg: 4.9,
      vouch_count_received: 6,
    },
    sender_listings: [],
  },
  origin_proposal: null,
  booking: null,
  payment_events: [],
  issue_reports: [],
  photo_requests: [],
};

// ─────────────────────────────────────────────────────────────────────
// Thread 3 · New conversation (no booking yet, pure messages)
//   Loren ↔ Mike — checking availability for Brooklyn
// ─────────────────────────────────────────────────────────────────────

export const threadNewConversation: ThreadDetail = {
  id: "thread-new",
  listing_id: "listing-brooklyn",
  guest_id: VIEWER_ID,
  host_id: "host-mike",
  contact_request_id: null,
  last_message_at: "2026-04-22T08:14:00Z",
  last_message_preview: "We're flexible on dates — let me know what works.",
  unread_count: 0,
  role: "guest",
  other_user: {
    id: "host-mike",
    name: "Mike Tran",
    avatar_url: fakeAvatar("mike"),
  },
  listing: {
    id: "listing-brooklyn",
    title: "Brooklyn loft — Bed-Stuy",
    area_name: "Bed-Stuy, Brooklyn",
    thumbnail_url:
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=200&q=70",
  },
  trust_score: 62,
  trust_connection_count: 2,
  trust_is_direct: false,
  trust_degree: 2,
  trust_connector_paths: [],
  pending_photo_request_count: 0,
  is_intro_request: false,
  intro: null,
  origin_proposal_id: null,
  messages: [
    msg(
      "n1",
      "thread-new",
      VIEWER_ID,
      "Hey Mike — Sarah Mendel said you've got a place in Bed-Stuy that might be open in early August?",
      "2026-04-22T08:00:00Z"
    ),
    msg(
      "n2",
      "thread-new",
      "host-mike",
      "Yeah! Aug 5–9 is open if that works. 1 bed + a pull-out, fits 4. Walking distance to Halsey C train.",
      "2026-04-22T08:08:00Z"
    ),
    msg(
      "n3",
      "thread-new",
      VIEWER_ID,
      "We're flexible on dates — let me know what works.",
      "2026-04-22T08:14:00Z"
    ),
  ],
  intro_detail: null,
  origin_proposal: null,
  booking: null,
  payment_events: [],
  issue_reports: [],
  photo_requests: [],
};

export const sampleThreadDetails: ThreadDetail[] = [
  threadActiveReservation,
  threadIntroPending,
  threadNewConversation,
];
