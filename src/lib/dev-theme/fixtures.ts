// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.
//
// Fixture data shared across the showcase. Keeps the showcase markup
// focused on rendering; the trust-engine shape is fiddly enough that
// inline literals would dominate the file otherwise.

import type { ListingCardProps } from "@/components/listing-card";
import type { HydratedProposal } from "@/lib/proposals-data";
import type { BrowseListing } from "@/lib/browse-data";
import type { BrowseListingTrust } from "@/components/browse/browse-layout";

export interface ConnectorPath {
  id: string;
  name: string;
  avatar_url: string | null;
  strength: number;
  viewer_knows: boolean;
}

export const fakeAvatar = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

export const connectorsTwoKnown: ConnectorPath[] = [
  {
    id: "c1",
    name: "Sarah Mendel",
    avatar_url: fakeAvatar("sarah"),
    strength: 78,
    viewer_knows: true,
  },
  {
    id: "c2",
    name: "Mike Tran",
    avatar_url: fakeAvatar("mike"),
    strength: 64,
    viewer_knows: true,
  },
];

export const connectorsThreeWithBridge: ConnectorPath[] = [
  {
    id: "b1",
    name: "Priya Shah",
    avatar_url: fakeAvatar("priya"),
    strength: 70,
    viewer_knows: true,
  },
  {
    id: "x1",
    name: "Anonymous hop",
    avatar_url: null,
    strength: 55,
    viewer_knows: false,
  },
];

export const connectorsFourLong: ConnectorPath[] = [
  {
    id: "b2",
    name: "Alex Kim",
    avatar_url: fakeAvatar("alex"),
    strength: 60,
    viewer_knows: true,
  },
  {
    id: "x2",
    name: "Anonymous hop A",
    avatar_url: null,
    strength: 50,
    viewer_knows: false,
  },
  {
    id: "x3",
    name: "Anonymous hop B",
    avatar_url: null,
    strength: 45,
    viewer_knows: false,
  },
];

export const sampleListing: ListingCardProps = {
  id: "fixture-1",
  title: "Sun-drenched studio with garden access",
  location: "Mission District, San Francisco",
  images: [
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=600&q=70",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=70",
    "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=600&q=70",
  ],
  pricePerNight: 165,
  rating: 4.92,
  reviewCount: 47,
  isFavorited: false,
  trustScore: 78,
  connectionLabel: "Friend of Sarah M.",
  category: "trending",
};

export const sampleListingGated: ListingCardProps = {
  ...sampleListing,
  id: "fixture-2",
  title: "Private cabin · gated to 2°+ network",
  location: "Stinson Beach, California",
  // trustScore: null hides the photo-overlay trust pill entirely
  // (the canonical ListingCard hardcodes `degree={1}` when it renders
  // the pill — passing 0 ship-shipped a "1° score 0" badge, which is
  // nonsense. Null is the correct no-trust state.)
  trustScore: null,
  connectionLabel: null,
  pricePerNight: 240,
};

// ── Proposals ─────────────────────────────────────────────────────────
// Six fixture HydratedProposal rows covering the kind × trust × hook
// matrix. We invent a stable viewerId so the "Own proposal" variant
// can be rendered truthfully (isOwn is derived from viewerId vs
// author_id inside ProposalCard).

const sampleAccessSettings = {
  see_preview: { type: "anyone" as const },
  full_listing_contact: { type: "anyone" as const },
  allow_intro_requests: true,
};

export const DEV_VIEWER_ID = "viewer-fixture-id";

/** Base constructor so the six variants stay in lockstep on fields
 *  that don't change between states. */
function makeProposal(
  overrides: {
    id: string;
    kind: "trip_wish" | "host_offer";
    title: string;
    description: string;
    destinations: string[];
    hook_type: "discount" | "trade" | "none";
    hook_details: string | null;
    authorName: string;
    authorId?: string;
    avatarSeed: string;
    listing?: HydratedProposal["listing"];
    trustScore?: number;
    trustDegree?: 1 | 2 | 3 | 4 | null;
    hasDirectVouch?: boolean;
    start_date?: string | null;
    end_date?: string | null;
    flexible_month?: string | null;
    guest_count?: number | null;
    status?: "active" | "expired" | "closed";
  }
): HydratedProposal {
  return {
    row: {
      id: overrides.id,
      author_id: overrides.authorId ?? `author-${overrides.id}`,
      kind: overrides.kind,
      title: overrides.title,
      description: overrides.description,
      destinations: overrides.destinations,
      start_date: overrides.start_date ?? null,
      end_date: overrides.end_date ?? null,
      flexible_month: overrides.flexible_month ?? null,
      guest_count: overrides.guest_count ?? null,
      listing_id: overrides.listing?.id ?? null,
      hook_type: overrides.hook_type,
      hook_details: overrides.hook_details,
      visibility_mode: "inherit",
      access_settings: null,
      status: overrides.status ?? "active",
      created_at: "2026-04-18T10:00:00Z",
      updated_at: "2026-04-18T10:00:00Z",
      expires_at: "2026-06-18T10:00:00Z",
      thumbnail_url: null,
      thumbnail_source: null,
      thumbnail_attribution: null,
    },
    author: {
      id: overrides.authorId ?? `author-${overrides.id}`,
      name: overrides.authorName,
      avatar_url: fakeAvatar(overrides.avatarSeed),
      vouch_power: 1.2,
      host_rating: overrides.kind === "host_offer" ? 4.85 : null,
      guest_rating: overrides.kind === "trip_wish" ? 4.9 : null,
    },
    listing: overrides.listing ?? null,
    effectiveRule: { type: "anyone" },
    audienceHostId: overrides.authorId ?? `author-${overrides.id}`,
    visibleToViewer: true,
    trustScore: overrides.trustScore ?? 68,
    trustDegree: overrides.trustDegree ?? 2,
    hasDirectVouch: overrides.hasDirectVouch ?? false,
  };
}

export const sampleProposals: HydratedProposal[] = [
  makeProposal({
    id: "p1",
    kind: "trip_wish",
    title: "Long weekend in Portland",
    description:
      "Two of us hoping to explore food scene + coffee shops. Flexible on exact dates — just need a cozy spot walkable to downtown.",
    destinations: ["Portland, OR"],
    hook_type: "none",
    hook_details: null,
    authorName: "Sarah Mendel",
    avatarSeed: "sarah",
    trustDegree: 1,
    hasDirectVouch: true,
    trustScore: 88,
    flexible_month: "May 2026",
    guest_count: 2,
  }),
  makeProposal({
    id: "p2",
    kind: "host_offer",
    title: "Stinson cabin · $200 off June weeknights",
    description:
      "Our mid-century beach cabin has some open weeknights in June. Happy to take 20% off for network folks who can be flexible.",
    destinations: ["Stinson Beach, CA"],
    hook_type: "discount",
    hook_details: "20% off weeknight rate (Mon–Thu)",
    authorName: "Mike Tran",
    avatarSeed: "mike",
    trustDegree: 2,
    trustScore: 62,
    start_date: "2026-06-08",
    end_date: "2026-06-28",
    guest_count: 4,
    listing: {
      id: "listing-stinson",
      title: "Mid-century beach cabin with private deck",
      area_name: "Stinson Beach, California",
      cover_photo_url:
        "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=70",
      photo_urls: [
        "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=70",
      ],
      host_id: "author-p2",
      access_settings: sampleAccessSettings,
      visibility_mode: "preview_gated",
    },
  }),
  makeProposal({
    id: "p3",
    kind: "host_offer",
    title: "Cabin swap · LA for Brooklyn?",
    description:
      "Looking for a week-long trade in August. Our 1BR near Silver Lake for your Brooklyn apartment — flexible on neighborhoods.",
    destinations: ["Brooklyn, NY"],
    hook_type: "trade",
    hook_details: "1BR Silver Lake ↔ your Brooklyn place, 7 nights",
    authorName: "Priya Shah",
    avatarSeed: "priya",
    trustDegree: 3,
    trustScore: 42,
    start_date: "2026-08-10",
    end_date: "2026-08-17",
    guest_count: 2,
    listing: {
      id: "listing-la",
      title: "Silver Lake 1BR with canyon views",
      area_name: "Silver Lake, Los Angeles",
      cover_photo_url:
        "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=70",
      photo_urls: [
        "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=70",
      ],
      host_id: "author-p3",
      access_settings: sampleAccessSettings,
      visibility_mode: "preview_gated",
    },
  }),
  makeProposal({
    id: "p4",
    kind: "trip_wish",
    title: "Honeymoon trip · anywhere quiet",
    description:
      "Looking for somewhere remote, ideally off-grid, with a kitchen. Open to anywhere in the western US.",
    destinations: ["Western US"],
    hook_type: "none",
    hook_details: null,
    authorName: "Alex Kim",
    avatarSeed: "alex",
    trustDegree: 4,
    trustScore: 22,
    flexible_month: "September 2026",
    guest_count: 2,
  }),
  makeProposal({
    id: "p5",
    kind: "host_offer",
    title: "Your chance: last-minute Tahoe week",
    description:
      "Unexpected cancellation. 3BR lakefront available Apr 26 – May 2. Happy to give network folks a discount for the fast turnaround.",
    destinations: ["Lake Tahoe, CA"],
    hook_type: "discount",
    hook_details: "30% off last-minute availability",
    authorName: "Rosa Delgado",
    avatarSeed: "rosa",
    trustDegree: 1,
    hasDirectVouch: true,
    trustScore: 91,
    start_date: "2026-04-26",
    end_date: "2026-05-02",
    guest_count: 6,
    listing: {
      id: "listing-tahoe",
      title: "Lakefront 3BR with hot tub",
      area_name: "South Lake Tahoe, CA",
      cover_photo_url:
        "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&q=70",
      photo_urls: [
        "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&q=70",
      ],
      host_id: "author-p5",
      access_settings: sampleAccessSettings,
      visibility_mode: "public",
    },
  }),
  makeProposal({
    id: "p6",
    kind: "trip_wish",
    title: "Your (own) proposal · trip to Mexico City",
    description:
      "Looking for a 5-night stay in Mexico City in early June. Walkable neighborhood preferred.",
    destinations: ["Mexico City"],
    hook_type: "none",
    hook_details: null,
    authorName: "Loren Polster",
    authorId: DEV_VIEWER_ID,
    avatarSeed: "loren",
    trustDegree: null,
    hasDirectVouch: false,
    trustScore: 0,
    start_date: "2026-06-02",
    end_date: "2026-06-07",
    guest_count: 2,
  }),
];

// ── Browse listings (LiveListingCard) ────────────────────────────────
// Real LiveListingCard needs a BrowseListing plus a BrowseListingTrust.
// These fixtures cover the three visibility states (full access,
// preview-only, gated no-preview) so the card renders each branch.

const sampleConnectorPaths = connectorsTwoKnown.map((c) => ({
  id: c.id,
  name: c.name,
  avatar_url: c.avatar_url,
  strength: c.strength,
  viewer_knows: c.viewer_knows,
}));

function mkPhoto(idx: number, url: string, isPreview: boolean) {
  return {
    id: `photo-${idx}`,
    listing_id: "x",
    storage_path: null,
    public_url: url,
    is_cover: idx === 0,
    is_preview: isPreview,
    sort_order: idx,
  };
}

export const sampleBrowseListingFull: BrowseListing = {
  id: "browse-full",
  title: "Sun-drenched studio with garden access",
  area_name: "Mission District, San Francisco",
  property_type: "Apartment",
  description: "A bright studio with a private patio.",
  price_min: 140,
  price_max: 185,
  avg_listing_rating: 4.92,
  listing_review_count: 47,
  created_at: "2026-01-04T10:00:00Z",
  photos: [
    mkPhoto(
      0,
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=70",
      true
    ),
    mkPhoto(
      1,
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=70",
      true
    ),
    mkPhoto(
      2,
      "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&q=70",
      true
    ),
  ],
  host: {
    id: "host-1",
    name: "Sarah Mendel",
    avatar_url: fakeAvatar("sarah"),
    host_rating: 4.9,
    host_review_count: 31,
  },
  host_id: "host-1",
  min_trust_gate: 0,
  amenities: ["wifi", "kitchen", "washer"],
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  latitude: 37.758,
  longitude: -122.419,
  visibility_mode: "public",
  preview_description: null,
  access_settings: sampleAccessSettings,
};

export const sampleBrowseListingPreview: BrowseListing = {
  ...sampleBrowseListingFull,
  id: "browse-preview",
  title: "Private cabin · 2°+ network only",
  area_name: "Stinson Beach, CA",
  price_min: 220,
  price_max: 280,
  avg_listing_rating: 4.85,
  listing_review_count: 22,
  visibility_mode: "preview_gated",
  preview_description:
    "Tucked into the hillside with ocean views. Private deck + hot tub. Details shared with introduced guests.",
  access_settings: {
    see_preview: { type: "anyone" },
    full_listing_contact: { type: "min_score", threshold: 50 },
    allow_intro_requests: true,
  },
};

export const sampleBrowseListingGated: BrowseListing = {
  ...sampleBrowseListingFull,
  id: "browse-gated",
  title: "Hidden loft · invite-only",
  area_name: "Tribeca, New York",
  price_min: 380,
  price_max: 420,
  avg_listing_rating: null,
  listing_review_count: 0,
  visibility_mode: "hidden",
  preview_description: null,
  access_settings: {
    see_preview: { type: "specific_people", user_ids: [] },
    full_listing_contact: { type: "specific_people", user_ids: [] },
    allow_intro_requests: false,
  },
};

export const sampleTrustFull: BrowseListingTrust = {
  trust_score: 88,
  degree: 1,
  connectionCount: 2,
  hasDirectVouch: true,
  connectorPaths: sampleConnectorPaths,
  canSeePreview: true,
  canSeeFull: true,
  canRequestBook: true,
  canMessage: true,
  canRequestIntro: true,
  mutualConnections: [],
};

export const sampleTrustPreview: BrowseListingTrust = {
  trust_score: 42,
  degree: 3,
  connectionCount: 2,
  hasDirectVouch: false,
  connectorPaths: sampleConnectorPaths,
  canSeePreview: true,
  canSeeFull: false,
  canRequestBook: false,
  canMessage: false,
  canRequestIntro: true,
  mutualConnections: [],
};

export const sampleTrustGated: BrowseListingTrust = {
  trust_score: 0,
  degree: null,
  connectionCount: 0,
  hasDirectVouch: false,
  connectorPaths: [],
  canSeePreview: false,
  canSeeFull: false,
  canRequestBook: false,
  canMessage: false,
  canRequestIntro: false,
  mutualConnections: [],
};

// ── Listing detail (full + gated) ─────────────────────────────────────
import type { ListingDetail } from "@/lib/listing-detail-data";
import type { TrustResult } from "@/lib/trust-data";
import type { ListingAccessResult } from "@/lib/trust/types";

const listingPhotos = [
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=70",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=70",
  "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200&q=70",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=70",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=70",
].map((url, i) => ({
  id: `photo-${i}`,
  listing_id: "fixture-detail",
  storage_path: null,
  public_url: url,
  is_cover: i === 0,
  is_preview: i < 3,
  sort_order: i,
}));

const sampleReviews = [
  {
    id: "rev-1",
    rating: 5,
    text: "Wonderful spot — Sarah was incredibly welcoming + responsive. The studio is exactly as described and the garden access is a treat.",
    created_at: "2026-02-14T10:00:00Z",
    guest: {
      id: "g1",
      name: "Loren Polster",
      avatar_url: fakeAvatar("loren"),
    },
  },
  {
    id: "rev-2",
    rating: 5,
    text: "Perfect Mission base for a long weekend. Walkable to everything we wanted.",
    created_at: "2025-11-22T10:00:00Z",
    guest: {
      id: "g2",
      name: "Mike Tran",
      avatar_url: fakeAvatar("mike"),
    },
  },
  {
    id: "rev-3",
    rating: 4,
    text: "Lovely space. A little noisy at night but otherwise great.",
    created_at: "2025-09-08T10:00:00Z",
    guest: {
      id: "g3",
      name: "Priya Shah",
      avatar_url: fakeAvatar("priya"),
    },
  },
];

import type { CancellationPolicy } from "@/lib/cancellation";

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

export const sampleListingDetail: ListingDetail = {
  id: "fixture-detail",
  title: "Sun-drenched studio with garden access",
  description:
    "Bright studio with a private patio, walkable to Mission restaurants and Dolores Park. Dedicated workspace + quiet residential block. Sleeps 2 comfortably; the queen bed is in an alcove that gets morning light.",
  area_name: "Mission District, San Francisco",
  property_type: "Apartment",
  price_min: 140,
  price_max: 185,
  cleaning_fee: 50,
  amenities: [
    "wifi",
    "kitchen",
    "washer",
    "dryer",
    "dedicated_workspace",
    "tv",
    "heating",
    "ac",
  ],
  house_rules: "No parties or smoking. Quiet hours after 10pm.",
  checkin_time: "15:00",
  checkout_time: "11:00",
  min_nights: 2,
  max_nights: 14,
  availability_start: "2026-01-01",
  availability_end: "2027-01-01",
  photos: listingPhotos,
  host: {
    id: "host-1",
    name: "Sarah Mendel",
    avatar_url: fakeAvatar("sarah"),
    bio: "Architect. Love hosting people who appreciate small spaces.",
    created_at: "2023-06-12T10:00:00Z",
    host_rating: 4.92,
    host_review_count: 47,
  },
  host_id: "host-1",
  min_trust_gate: 0,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  max_guests: 2,
  place_kind: "entire",
  property_label: "apartment",
  latitude: 37.758,
  longitude: -122.419,
  avg_rating: 4.92,
  review_count: 47,
  reviews: sampleReviews,
  blockedRanges: [
    { start: "2026-05-01", end: "2026-05-04" },
    { start: "2026-05-22", end: "2026-05-26" },
  ],
  visibility_mode: "public",
  preview_description: null,
  access_settings: sampleAccessSettings,
  cancellation_policy: moderatePolicy,
  host_payment_method_types: ["venmo", "zelle"],
};

export const sampleListingDetailGated: ListingDetail = {
  ...sampleListingDetail,
  id: "fixture-detail-gated",
  title: "Hidden hillside cabin · Stinson Beach",
  description:
    "Three-bedroom cabin perched above the beach with a private deck and outdoor shower. Full details revealed once you're introduced to the host.",
  area_name: "Stinson Beach, California",
  price_min: 240,
  price_max: 320,
  cleaning_fee: 120,
  bedrooms: 3,
  beds: 4,
  bathrooms: 2,
  max_guests: 6,
  place_kind: "entire",
  property_label: "cabin",
  latitude: 37.901,
  longitude: -122.643,
  visibility_mode: "preview_gated",
  preview_description:
    "Tucked into the hillside with ocean views. Private deck + hot tub. Details shared with introduced guests.",
  access_settings: {
    see_preview: { type: "anyone" },
    full_listing_contact: { type: "min_score", threshold: 50 },
    allow_intro_requests: true,
  },
};

export const sampleTrustResultFull: TrustResult = {
  score: 88,
  degree: 1,
  hasDirectVouch: true,
  path: [],
  mutualConnections: [],
  connectionCount: 2,
  connectorPaths: [
    {
      id: "c1",
      name: "Sarah Mendel",
      avatar_url: fakeAvatar("sarah"),
      strength: 78,
      viewer_knows: true,
    },
    {
      id: "c2",
      name: "Mike Tran",
      avatar_url: fakeAvatar("mike"),
      strength: 64,
      viewer_knows: true,
    },
  ],
};

export const sampleTrustResultGatedPreview: TrustResult = {
  score: 42,
  degree: 3,
  hasDirectVouch: false,
  path: [],
  mutualConnections: [],
  connectionCount: 1,
  connectorPaths: [
    {
      id: "b1",
      name: "Priya Shah",
      avatar_url: fakeAvatar("priya"),
      strength: 70,
      viewer_knows: true,
    },
  ],
};

export const sampleListingAccessFull: ListingAccessResult = {
  can_see_preview: true,
  can_see_full: true,
  can_request_book: true,
  can_message: true,
  can_request_intro: true,
  can_view_host_profile: true,
};

export const sampleListingAccessGated: ListingAccessResult = {
  can_see_preview: true,
  can_see_full: false,
  can_request_book: false,
  can_message: false,
  can_request_intro: true,
  can_view_host_profile: false,
};
