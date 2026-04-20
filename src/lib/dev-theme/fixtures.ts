// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.
//
// Fixture data shared across the showcase. Keeps the showcase markup
// focused on rendering; the trust-engine shape is fiddly enough that
// inline literals would dominate the file otherwise.

import type { ListingCardProps } from "@/components/listing-card";

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
  trustScore: 0,
  connectionLabel: null,
  pricePerNight: 240,
};
