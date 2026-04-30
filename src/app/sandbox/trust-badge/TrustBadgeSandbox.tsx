"use client";

// Trust badge sandbox — design exploration only.
//
// Shows the trust badge at THREE responsive sizes (nano, micro, medium),
// each rendered in the surface where it actually appears in the app:
//
//   nano   → inbox thread row (next to avatar)
//   micro  → listing card image overlay
//   medium → host card on a full listings page / profile row
//
// Edit `SAMPLES` below to retune values and see all three contexts
// react together.

import { useState } from "react";
import {
  Star,
  Heart,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Alert orange used for the 1° asymmetric vouch-back chip. Eventually
// this is a clickable affordance that opens the vouch-back modal.
const ASYMMETRY_ORANGE = "#EA580C";

// ── Sample data ───────────────────────────────────────────────────
// Per FT-1 spec the four metrics are independent — no composite. Each
// can be null when the user has no data in that pillar yet.
//
//   degree     1 | 2 | 3 | 4 | null         (4 = "4°+", null = no path)
//   connection 0–10 viewer-relative         (only present 1°–3°)
//   vouch      0–10 absolute                (always available unless cold-start)
//   rating     0–5 + count                  (raw avg, "—" when count=0)

type DegreeBucket = 1 | 2 | 3 | 4 | null;

type Connector = {
  id: string;
  name: string;
  avatarUrl: string;
  viewerKnows: boolean;
};

// 1° vouch direction: who has vouched for whom.
//   "mutual"   = both directions (default for 1°)
//   "outgoing" = viewer vouched for them, no return vouch yet
//   "incoming" = they vouched for the viewer, viewer hasn't vouched back
type VouchDirection = "mutual" | "outgoing" | "incoming";

type Sample = {
  id: string;
  name: string;
  initials: string;
  archetype: string;
  avatarUrl: string;
  degree: DegreeBucket;
  vouchDirection?: VouchDirection; // only meaningful when degree === 1
  connection: number | null;
  vouch: number | null;
  rating: number | null;
  reviewCount: number;
  // Inbox row content
  preview: string;
  time: string;
  unread?: boolean;
  // Listing tile content (only used in the micro grid)
  listing: {
    title: string;
    location: string;
    price: number;
    imageUrl: string;
  };
  // Macro-only profile-page content
  profile: {
    headline: string;
    bio: string;
    chains: number;
    vouchers: number;
  };
  // People who connect the viewer to this host. Empty for 1° (direct)
  // and cold-start/4°+; 2°/3° show 1–3 avatars (some viewer_knows=false
  // = anonymous intermediary, rendered as silhouette).
  connectors: Connector[];
};

// Royalty-free placeholder image services. Picsum gives stable seeded
// photos for listings; Pravatar gives stable seeded avatars for people.
// Swap any URL inline if you want a different image without touching
// the structure.
const SAMPLES: Sample[] = [
  {
    id: "maya",
    name: "Maya L.",
    initials: "ML",
    archetype: "1° · mutual",
    avatarUrl: "https://i.pravatar.cc/200?img=47",
    degree: 1,
    vouchDirection: "mutual",
    connection: 9.4,
    vouch: 8.2,
    rating: 4.9,
    reviewCount: 23,
    preview: "Yes! The lake house is yours for the long weekend.",
    time: "12m",
    unread: true,
    listing: {
      title: "Cedar A-frame on Lake Superior",
      location: "Bayfield, WI",
      price: 184,
      imageUrl: "https://picsum.photos/seed/cedar-aframe/800/600",
    },
    profile: {
      headline: "Architect & cabin builder · Madison, WI",
      bio: "Designed and built the cabin myself in 2019. Coffee on the dock most mornings if you want company.",
      chains: 4,
      vouchers: 9,
    },
    connectors: [], // 1° = direct, no chain
  },
  {
    id: "casey",
    name: "Casey W.",
    initials: "CW",
    archetype: "1° · I vouched, no return",
    avatarUrl: "https://i.pravatar.cc/200?img=32",
    degree: 1,
    vouchDirection: "outgoing",
    connection: null, // not shown for 1°
    vouch: 6.8,
    rating: 4.6,
    reviewCount: 7,
    preview: "Was great seeing you in PDX last fall. Stop by anytime.",
    time: "30m",
    listing: {
      title: "Backyard cottage with sauna",
      location: "Portland, OR",
      price: 122,
      imageUrl: "https://picsum.photos/seed/portland-cottage/800/600",
    },
    profile: {
      headline: "Carpenter & climber · Portland, OR",
      bio: "Detached one-bedroom cottage with private entrance and a wood-fired sauna in back.",
      chains: 0,
      vouchers: 5,
    },
    connectors: [],
  },
  {
    id: "aki",
    name: "Aki N.",
    initials: "AN",
    archetype: "2° · solid",
    avatarUrl: "https://i.pravatar.cc/200?img=12",
    degree: 2,
    connection: 6.4,
    vouch: 5.7,
    rating: 4.7,
    reviewCount: 12,
    preview: "Happy to host — I'll send the door code on arrival day.",
    time: "1h",
    unread: true,
    listing: {
      title: "Sunlit loft above the bakery",
      location: "Brooklyn, NY",
      price: 142,
      imageUrl: "https://picsum.photos/seed/brooklyn-loft/800/600",
    },
    profile: {
      headline: "Bakery owner · Brooklyn, NY",
      bio: "Sourdough at 6am, coffee on the roof at sunset. Two-bedroom loft above the shop, separate entrance.",
      chains: 2,
      vouchers: 6,
    },
    // 2° via two of the viewer's friends
    connectors: [
      { id: "c1", name: "Sam Park", avatarUrl: "https://i.pravatar.cc/100?img=5", viewerKnows: true },
      { id: "c2", name: "Eli Hart", avatarUrl: "https://i.pravatar.cc/100?img=33", viewerKnows: true },
    ],
  },
  {
    id: "robin",
    name: "Robin K.",
    initials: "RK",
    archetype: "3° · weaker",
    avatarUrl: "https://i.pravatar.cc/200?img=26",
    degree: 3,
    connection: 3.2,
    vouch: 4.1,
    rating: 4.4,
    reviewCount: 8,
    preview: "Cool, dates work. Want to set up an intro call first?",
    time: "Yesterday",
    listing: {
      title: "Garden cottage near the river",
      location: "Asheville, NC",
      price: 96,
      imageUrl: "https://picsum.photos/seed/asheville-cottage/800/600",
    },
    profile: {
      headline: "Permaculture grower · Asheville, NC",
      bio: "Two-acre garden, swimming hole on the property, four hens. Quiet weeknights, busier weekends.",
      chains: 2,
      vouchers: 3,
    },
    // 3° = your friend → their friend → host. Show 1 known + 1 anon.
    connectors: [
      { id: "c3", name: "Maya L.", avatarUrl: "https://i.pravatar.cc/100?img=47", viewerKnows: true },
      { id: "c4", name: "Mutual connection", avatarUrl: "", viewerKnows: false },
    ],
  },
  {
    id: "theo",
    name: "Theo R.",
    initials: "TR",
    archetype: "4°+ · distant",
    avatarUrl: "https://i.pravatar.cc/200?img=68",
    degree: 4,
    connection: null,
    vouch: 6.0,
    rating: 4.6,
    reviewCount: 5,
    preview: "Hi! Saw your trip post — happy to share the keys.",
    time: "2d",
    listing: {
      title: "Studio with rooftop access",
      location: "Lisbon, PT",
      price: 78,
      imageUrl: "https://picsum.photos/seed/lisbon-rooftop/800/600",
    },
    profile: {
      headline: "Translator · Lisbon, PT",
      bio: "Quiet studio in Alfama with a rooftop terrace. Walk to the river in 10 min.",
      chains: 3,
      vouchers: 4,
    },
    // 4°+ = no connection score; chain length too long. One bridge avatar.
    connectors: [
      { id: "c5", name: "Maya L.", avatarUrl: "https://i.pravatar.cc/100?img=47", viewerKnows: true },
      { id: "c6", name: "Mutual connection", avatarUrl: "", viewerKnows: false },
      { id: "c7", name: "Mutual connection", avatarUrl: "", viewerKnows: false },
    ],
  },
  {
    id: "jules",
    name: "Jules P.",
    initials: "JP",
    archetype: "new member",
    avatarUrl: "https://i.pravatar.cc/200?img=15",
    degree: null,
    connection: null,
    vouch: null,
    rating: null,
    reviewCount: 0,
    preview: "Hi there — would love to host you in May!",
    time: "3d",
    listing: {
      title: "Hand-built tiny house",
      location: "Hood River, OR",
      price: 110,
      imageUrl: "https://picsum.photos/seed/hood-river-tiny/800/600",
    },
    profile: {
      headline: "New to Trustead · Hood River, OR",
      bio: "Built this tiny house with my partner this spring. We're new to the platform — would love to host our first guest.",
      chains: 0,
      vouchers: 0,
    },
    connectors: [],
  },
  {
    id: "drew",
    name: "Drew M.",
    initials: "DM",
    archetype: "1° · they vouched, low rating",
    avatarUrl: "https://i.pravatar.cc/200?img=60",
    degree: 1,
    vouchDirection: "incoming",
    connection: null,
    vouch: 4.8,
    rating: 2.8,
    reviewCount: 15,
    preview: "Confirmed for the 14th. Bring slippers, please.",
    time: "5d",
    listing: {
      title: "Old farmhouse, three acres",
      location: "Hudson Valley, NY",
      price: 132,
      imageUrl: "https://picsum.photos/seed/hudson-farmhouse/800/600",
    },
    profile: {
      headline: "Farmer · Hudson Valley, NY",
      bio: "Working farm with two guest rooms. Goats, chickens, two dogs. Strict 9pm quiet hours.",
      chains: 0,
      vouchers: 5,
    },
    connectors: [],
  },
];

// ── Tokens ────────────────────────────────────────────────────────
//
// Inline-styled colors throughout so globals.css's !important degree-
// pill rewrites don't blank out arbitrary-value Tailwind classes
// (`.bg-[#bf8a0d]` is one of several mapped to the canonical tokens).
// The sandbox should preview with the colors I pick, not the ones
// the global stylesheet rewrites them to.
const DEGREE_PILL: Record<
  1 | 2 | 3 | 4,
  { bg: string; fg: string; label: string; outlineColor: string }
> = {
  // 1° = white pill with dark text. The strongest trust state earns the
  // highest contrast — pulled out of the green ramp entirely.
  1: { bg: "#FFFFFF", fg: "#0B2E25", label: "1°", outlineColor: "#FFFFFF" },
  2: { bg: "#2A8A6B", fg: "#FFFFFF", label: "2°", outlineColor: "#2A8A6B" },
  3: { bg: "#BF8A0D", fg: "#FFFFFF", label: "3°", outlineColor: "#BF8A0D" },
  4: { bg: "#525252", fg: "#FFFFFF", label: "4°+", outlineColor: "#525252" },
};

const METRIC_TONE: Record<
  "connection" | "vouch" | "vouch-outlined" | "rating-good" | "rating-bad",
  { bg: string; fg: string; border: string }
> = {
  connection: { bg: "#EFF6FF", fg: "#1D4ED8", border: "#BFDBFE" },
  vouch: { bg: "#FAF5FF", fg: "#6B21A8", border: "#E9D5FF" },
  // Outlined variant for the inline metric pill (micro/medium). The
  // macro Vouch tile keeps the filled "vouch" tone.
  "vouch-outlined": { bg: "transparent", fg: "#7C3AED", border: "#7C3AED" },
  "rating-good": { bg: "#FFFBEB", fg: "#B45309", border: "#FDE68A" },
  "rating-bad": { bg: "#FEF2F2", fg: "#B91C1C", border: "#FECACA" },
};

// Connection = ● circle (blue, viewer-relative).
// Vouch = small shield, color follows the degree color scale based on
// the vouch score itself (≥5 → 1° tier, 4–5 → 2°, 3–4 → 3°, <3 → 4°+).
// Rating = lucide Star (amber, locked from FT-1 spec).
const ICON_CIRCLE = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
    <circle cx="12" cy="12" r="10" />
  </svg>
);
const ICON_SHIELD = (
  <Shield className="h-full w-full" fill="currentColor" strokeWidth={0} />
);

// Map a vouch score (0-10) to the same tier color as the degree pill.
// For tier-1 we need to pick a different base color depending on the
// surface — pure white shows on dark forest but disappears on a white
// listing-card chip, so we swap to deep forest there.
function vouchTierColor(score: number, onImage: boolean): string {
  if (score >= 5) return onImage ? "#0B2E25" : "#FFFFFF"; // tier 1
  if (score >= 4) return "#2A8A6B"; // tier 2 — emerald
  if (score >= 3) return "#BF8A0D"; // tier 3 — mustard
  return onImage ? "#525252" : "#B0BBB7"; // tier 4 — zinc / light slate
}

// ── Badge primitive ───────────────────────────────────────────────
// One component, three sizes. Builds off the existing TrustTag's
// degree-pill anchor and adds the FT-1 four-metric structure
// (Connection circle, Vouch diamond, Rating star).
//
//   nano   → degree pill only, no metrics, no rating
//   micro  → degree + the highest-signal metric pill + rating
//   medium → degree + connection + vouch + rating, full breakdown

type BadgeSize = "nano" | "micro" | "medium";

function NewMemberPill({ size }: { size: BadgeSize }) {
  const cls =
    size === "nano"
      ? "px-1.5 py-[1px] text-[10px]"
      : size === "micro"
        ? "px-2 py-[1px] text-[11px]"
        : "px-2.5 py-0.5 text-xs";
  return (
    <span
      className={cn("inline-flex items-center rounded-full font-semibold", cls)}
      style={{ backgroundColor: "#3F3F46", color: "#F4F4F5" }}
    >
      New member
    </span>
  );
}

// Uncontained vouch indicator — no background, no border. Just the
// shield + number, both colored by the vouch tier scale (same scale
// as the degree pills, picked from the score itself). Sits next to
// the rating chip the same way and behaves identically.
function VouchPill({
  score,
  size,
  onImage,
}: {
  score: number;
  size: "micro" | "medium";
  onImage: boolean;
}) {
  const color = vouchTierColor(score, onImage);
  const sz = size === "micro" ? "gap-0.5 text-[11px]" : "gap-1 text-xs";
  const iconSize = size === "micro" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold tabular-nums",
        sz
      )}
      style={{ color }}
    >
      <span className={iconSize}>{ICON_SHIELD}</span>
      <span>{score.toFixed(1)}</span>
    </span>
  );
}

function MetricPill({
  icon,
  value,
  tone,
  size,
}: {
  icon: React.ReactNode;
  value: string;
  tone: "connection" | "vouch" | "vouch-outlined" | "rating-good" | "rating-bad";
  size: "micro" | "medium";
}) {
  const palette = METRIC_TONE[tone];
  const sz =
    size === "micro"
      ? "gap-0.5 px-1.5 py-[1px] text-[11px]"
      : "gap-1 px-2 py-0.5 text-xs";
  const iconSize = size === "micro" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold tabular-nums",
        sz
      )}
      style={{
        backgroundColor: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
      }}
    >
      <span className={iconSize}>{icon}</span>
      <span>{value}</span>
    </span>
  );
}

function TrustBadgeSandboxPill({
  size,
  sample,
  // When the badge sits on top of an image (listing card overlay), use
  // a white chip background. Inside an inbox row or profile row it
  // sits on the parent surface, so leave transparent.
  onImage = false,
}: {
  size: BadgeSize;
  sample: Sample;
  onImage?: boolean;
}) {
  // Cold-start short-circuit. No data anywhere → "New member".
  const isColdStart =
    sample.degree === null &&
    sample.connection === null &&
    sample.vouch === null &&
    sample.rating === null;
  if (isColdStart) return <NewMemberPill size={size} />;

  // Degree pill is the anchor of every badge size. For 2°/3° (and any
  // other connected state with a connection score) the pill is a
  // two-segment combo: the LEFT segment is filled with the degree
  // color, a thin vertical divider separates the segments, and the
  // RIGHT segment is outlined-only (transparent fill, colored border)
  // and contains the viewer-relative connection score.
  const degreeStyle = sample.degree ? DEGREE_PILL[sample.degree] : null;
  const degreeSizeCls =
    size === "nano"
      ? "px-1.5 py-[1px] text-[10px] leading-[1.1]"
      : size === "micro"
        ? "px-2 py-[1px] text-[11px]"
        : "px-2.5 py-0.5 text-xs";

  // Connection score lives INSIDE the degree pill now. Only shown when
  // the host is 2° or 3° (FT-1 spec: 4°+ has no connection score, 1°
  // intentionally suppresses it because direct vouch is the whole story).
  const showConnectionInPill =
    sample.degree === 2 || sample.degree === 3;

  // Asymmetric vouch indicator — only meaningful at 1°. Mutual = no
  // arrow. Outgoing = "→" (you vouched for them). Incoming = "←" (they
  // vouched for you).
  const vouchArrow =
    sample.degree === 1 && sample.vouchDirection && sample.vouchDirection !== "mutual"
      ? sample.vouchDirection === "outgoing"
        ? "outgoing"
        : "incoming"
      : null;

  function ArrowGlyph({ size: sz }: { size: BadgeSize }) {
    const dim = sz === "nano" ? 10 : sz === "micro" ? 11 : 12;
    if (vouchArrow === "outgoing")
      return <ArrowRight style={{ width: dim, height: dim }} />;
    if (vouchArrow === "incoming")
      return <ArrowLeft style={{ width: dim, height: dim }} />;
    return null;
  }

  let degreeChip: React.ReactNode;
  if (!degreeStyle) {
    degreeChip = (
      <span
        className={cn(
          "inline-flex items-center rounded-full font-semibold",
          size === "nano" ? "px-1.5 py-[1px] text-[10px]" : "px-2 py-[1px] text-[11px]"
        )}
        style={{ backgroundColor: "#3F3F46", color: "#F4F4F5" }}
      >
        No path
      </span>
    );
  } else if (showConnectionInPill && sample.connection !== null) {
    // Two-segment combo pill — degree (filled) | connection score (outlined).
    // Inner segments use borderRadius: 0 to defeat globals.css's
    // "rounded corners guarantee" rule that auto-rounds bare <span>
    // elements to 6px (which made the inner edges look curved).
    degreeChip = (
      <span
        className="inline-flex items-stretch overflow-hidden rounded-full font-semibold tabular-nums"
        style={{
          border: `1px solid ${degreeStyle.outlineColor}`,
        }}
      >
        <span
          className={cn("inline-flex items-center", degreeSizeCls)}
          style={{
            backgroundColor: degreeStyle.bg,
            color: degreeStyle.fg,
            borderRadius: 0,
          }}
        >
          {degreeStyle.label}
        </span>
        <span
          className={cn("inline-flex items-center", degreeSizeCls)}
          style={{
            backgroundColor: "transparent",
            color: degreeStyle.outlineColor,
            borderLeft: `1px solid ${degreeStyle.outlineColor}`,
            borderRadius: 0,
          }}
        >
          {sample.connection.toFixed(1)}
        </span>
      </span>
    );
  } else if (vouchArrow) {
    // 1° asymmetric — same combo-pill structure as 2°/3° (one outer
    // rounded shape with two segments and a flat divider) BUT both
    // segments are filled and the divider is a 2px transparent gap
    // instead of a 1px line, so the surface behind the badge shows
    // through. The right segment is a real <button> — eventually a
    // click opens the vouch-back modal / nudge flow.
    const arrowDim = size === "nano" ? 10 : size === "micro" ? 12 : 14;
    const isOutgoing = vouchArrow === "outgoing";
    const arrowTitle = isOutgoing
      ? "You vouched for them — they haven't vouched back. Click to nudge."
      : "They vouched for you — you haven't vouched back. Click to vouch back.";
    degreeChip = (
      <span
        className="inline-flex items-stretch overflow-hidden rounded-full font-semibold"
        style={{
          gap: "2px",
          // Hairline always visible on degree=1 so the white segment
          // doesn't disappear when the badge sits on a white chip
          // (listing-card overlay or macro profile block).
          border: "1px solid rgba(11,46,37,0.14)",
        }}
      >
        <span
          className={cn("inline-flex items-center", degreeSizeCls)}
          style={{
            backgroundColor: degreeStyle.bg,
            color: degreeStyle.fg,
            borderRadius: 0,
          }}
        >
          {degreeStyle.label}
        </span>
        <button
          type="button"
          title={arrowTitle}
          aria-label={
            isOutgoing
              ? "Vouch-back pending — nudge for return vouch"
              : "Vouch them back"
          }
          className={cn(
            "inline-flex items-center transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1",
            degreeSizeCls
          )}
          style={{
            backgroundColor: ASYMMETRY_ORANGE,
            color: "#FFFFFF",
            borderRadius: 0,
          }}
          onClick={(e) => e.preventDefault()}
        >
          {isOutgoing ? (
            <ArrowRight style={{ width: arrowDim, height: arrowDim }} />
          ) : (
            <ArrowLeft style={{ width: arrowDim, height: arrowDim }} />
          )}
        </button>
      </span>
    );
  } else {
    // Single-segment pill — 1° mutual (white), 4°+ (zinc). White 1°
    // gets a hairline border so it shows clearly on the cream
    // listing-card chip background.
    const needsHairline = sample.degree === 1;
    degreeChip = (
      <span
        className={cn(
          "inline-flex items-center rounded-full font-semibold",
          degreeSizeCls
        )}
        style={{
          backgroundColor: degreeStyle.bg,
          color: degreeStyle.fg,
          border: needsHairline ? "1px solid rgba(11,46,37,0.14)" : undefined,
        }}
      >
        {degreeStyle.label}
      </span>
    );
  }

  // No more separate arrow chip — when degree=1 asymmetric, the chip
  // is now baked into the combo pill above. degreeBlock = degreeChip.
  const degreeBlock = degreeChip;

  // Nano = degree-only. Tiny visual anchor next to a name in a list.
  if (size === "nano") {
    return <span className="inline-flex items-center">{degreeBlock}</span>;
  }

  // For 1°, FT-1 says direct vouch is the whole story — skip the
  // separate Vouch metric pill at micro/medium. Rating still shows
  // because it's independent of trust direction.
  const showVouch = sample.vouch !== null && sample.degree !== 1;
  const showRating = sample.rating !== null && sample.reviewCount > 0;

  // Rating now uncontained — plain white-text star + value + (count).
  const ratingWarn = sample.rating !== null && sample.rating < 3.5;
  const ratingTextColor = onImage
    ? ratingWarn
      ? "#B91C1C"
      : "#0B2E25"
    : ratingWarn
      ? "#FCA5A5"
      : "#F5F1E6";
  const ratingMutedColor = onImage
    ? "rgba(11,46,37,0.55)"
    : "rgba(245,241,230,0.55)";
  const ratingDim = size === "micro" ? 12 : 14;
  const ratingTextSize = size === "micro" ? "text-[11px]" : "text-xs";
  const ratingNode = showRating ? (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-semibold tabular-nums",
        ratingTextSize
      )}
      style={{ color: ratingTextColor }}
    >
      <Star
        style={{ width: ratingDim, height: ratingDim, color: ratingTextColor }}
        fill="currentColor"
      />
      <span>{sample.rating!.toFixed(1)}</span>
      <span className="font-normal" style={{ color: ratingMutedColor }}>
        ({sample.reviewCount})
      </span>
    </span>
  ) : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full",
        onImage && "px-1.5 py-0.5 shadow-sm"
      )}
      style={onImage ? { backgroundColor: "rgba(255,255,255,0.95)" } : undefined}
    >
      {degreeBlock}
      {size === "micro" && (
        <>
          {showVouch && (
            <VouchPill score={sample.vouch!} size="micro" onImage={onImage} />
          )}
          {ratingNode}
        </>
      )}
      {size === "medium" && (
        <>
          {showVouch && (
            <VouchPill score={sample.vouch!} size="medium" onImage={onImage} />
          )}
          {ratingNode}
        </>
      )}
    </span>
  );
}

// ── Section header ────────────────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string;
  title: string;
  note: string;
}) {
  return (
    <header className="mb-5">
      <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[rgba(245,241,230,0.55)]">
        {eyebrow}
      </div>
      <h3 className="mt-1 !text-lg !font-semibold !leading-snug text-[#F5F1E6] tracking-normal">
        {title}
      </h3>
      <p className="mt-1.5 max-w-3xl text-xs text-[rgba(245,241,230,0.62)] leading-relaxed">
        {note}
      </p>
    </header>
  );
}

// ── Surface 1: inbox thread list (nano) ──────────────────────────
// 360px-wide dark-theme card matching the desktop inbox sidebar.
// Real avatar photos so we can see how much room the nano badge has
// next to a name + a real photo.

function InboxAvatar({ name, avatarUrl }: { name: string; avatarUrl: string }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={avatarUrl}
      alt={name}
      className="h-12 w-12 shrink-0 rounded-full object-cover"
    />
  );
}

function InboxRow({ sample }: { sample: Sample }) {
  return (
    <li className="flex w-full items-start gap-3 border-b border-[rgba(245,241,230,0.08)] px-3 py-3 last:border-b-0">
      <InboxAvatar name={sample.name} avatarUrl={sample.avatarUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "truncate text-sm",
                sample.unread ? "font-semibold" : "font-medium"
              )}
              style={{ color: "#F5F1E6" }}
            >
              {sample.name}
            </span>
            <TrustBadgeSandboxPill size="nano" sample={sample} />
          </div>
          <span
            className="shrink-0 text-[11px]"
            style={{ color: "rgba(245,241,230,0.55)" }}
          >
            {sample.time}
          </span>
        </div>
        <div
          className="mt-0.5 truncate text-xs"
          style={{ color: "rgba(245,241,230,0.55)" }}
        >
          {sample.listing.title}
        </div>
        <div
          className={cn("mt-0.5 line-clamp-1 text-xs", sample.unread ? "font-semibold" : "")}
          style={{ color: sample.unread ? "#F5F1E6" : "rgba(245,241,230,0.62)" }}
        >
          {sample.preview}
        </div>
      </div>
      {sample.unread && (
        <span
          className="mt-1 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: "#4FB191" }}
          aria-label="Unread"
        />
      )}
    </li>
  );
}

function InboxMockup() {
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        width: 360,
        maxWidth: "100%",
        backgroundColor: "rgba(7,34,27,0.55)",
        border: "1px solid rgba(245,241,230,0.14)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: "1px solid rgba(245,241,230,0.1)",
          color: "#F5F1E6",
        }}
      >
        <div className="text-sm font-semibold">Messages</div>
        <div className="text-[11px]" style={{ color: "rgba(245,241,230,0.55)" }}>
          {SAMPLES.length} threads
        </div>
      </div>
      <ul className="m-0 p-0 list-none">
        {SAMPLES.map((s) => (
          <InboxRow key={s.id} sample={s} />
        ))}
      </ul>
    </div>
  );
}

// ── Surface 2: listing card grid (micro) ─────────────────────────

// Mirrors src/components/browse/live-listing-card.tsx (the actual
// browse-grid card on trustead.app, NOT the older listing-card.tsx).
// Image area = heart + carousel only — no trust pill overlay. Trust
// pill lives inline below the image, alongside "Hosted by [name]".
function ListingTile({ sample }: { sample: Sample }) {
  const { listing } = sample;
  const firstName = sample.name.split(" ")[0];
  return (
    <div className="group block">
      {/* Image area: photo + heart + carousel — no trust pill here */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ aspectRatio: "4 / 3", backgroundColor: "#0B2E25" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={listing.imageUrl}
          alt={listing.title}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <Heart
          className="absolute top-3 right-3 z-10 h-6 w-6 drop-shadow-md"
          style={{ color: "rgba(255,255,255,0.95)", fill: "rgba(0,0,0,0.3)" }}
          aria-hidden
        />
        <div className="pointer-events-none absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 group-hover:flex h-7 w-7 items-center justify-center rounded-full shadow" style={{ backgroundColor: "rgba(255,255,255,0.9)" }}>
          <ChevronLeft className="h-4 w-4" style={{ color: "#0B2E25" }} />
        </div>
        <div className="pointer-events-none absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 group-hover:flex h-7 w-7 items-center justify-center rounded-full shadow" style={{ backgroundColor: "rgba(255,255,255,0.9)" }}>
          <ChevronRight className="h-4 w-4" style={{ color: "#0B2E25" }} />
        </div>
        <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: i === 0 ? "#FFFFFF" : "rgba(255,255,255,0.5)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Content area: location, title, hosted-by, trust pill inline,
          then price. This mirrors live-listing-card.tsx lines 234-262. */}
      <div className="mt-3">
        <h4
          className="!text-base !font-semibold !leading-tight tracking-normal line-clamp-1"
          style={{ color: "#F5F1E6" }}
        >
          {listing.location}
        </h4>
        <p
          className="mt-0.5 text-sm line-clamp-1"
          style={{ color: "rgba(245,241,230,0.62)" }}
        >
          {listing.title}
        </p>
        <p
          className="mt-0.5 text-sm line-clamp-1"
          style={{ color: "rgba(245,241,230,0.62)" }}
        >
          Hosted by {firstName}
        </p>
        <div className="mt-1.5">
          <TrustBadgeSandboxPill size="micro" sample={sample} />
        </div>
        <p className="mt-1.5 text-base">
          <span className="font-semibold" style={{ color: "#F5F1E6" }}>
            ${listing.price}
          </span>
          <span style={{ color: "rgba(245,241,230,0.62)" }}> night</span>
        </p>
      </div>
    </div>
  );
}

function ListingGrid() {
  // 2×2 grid so each tile is closer to the size it actually renders
  // at on a real browse page — same rough column width as the live
  // browse grid on a desktop viewport.
  const ids = ["maya", "aki", "theo", "jules"];
  const tiles = ids
    .map((id) => SAMPLES.find((s) => s.id === id))
    .filter((s): s is Sample => Boolean(s));
  return (
    <div className="mx-auto grid max-w-[820px] gap-6 grid-cols-1 sm:grid-cols-2">
      {tiles.map((s) => (
        <ListingTile key={s.id} sample={s} />
      ))}
    </div>
  );
}

// ── Surface 3: profile / host card row (medium) ──────────────────
// Mirrors the host-card pattern in gated-listing-view.tsx — real
// avatar photo + medium TrustTag + the connector avatars (people who
// connect the viewer to the host) shown alongside the badge.

function ConnectorStrip({
  connectors,
  size = "h-6 w-6",
}: {
  connectors: Connector[];
  size?: string;
}) {
  if (!connectors.length) return null;
  return (
    <span className="inline-flex items-center -space-x-1.5">
      {connectors.slice(0, 4).map((c) => (
        <span
          key={c.id}
          title={c.viewerKnows ? c.name : "Mutual connection"}
          className={cn(
            "inline-flex items-center justify-center overflow-hidden rounded-full",
            size
          )}
          style={{
            border: "2px solid #07221B", // ring punches through the dark surface
            backgroundColor: "rgba(245,241,230,0.18)",
          }}
        >
          {c.viewerKnows && c.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={c.avatarUrl}
              alt={c.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="rgba(245,241,230,0.65)"
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Z" />
            </svg>
          )}
        </span>
      ))}
    </span>
  );
}

function HostRow({ sample }: { sample: Sample }) {
  const showConnectors = sample.connectors.length > 0;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[rgba(245,241,230,0.12)] bg-[rgba(7,34,27,0.5)] p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sample.avatarUrl}
        alt={sample.name}
        className="h-14 w-14 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h4 className="!text-base !font-semibold !leading-tight text-[#F5F1E6] tracking-normal">
            Hosted by {sample.name}
          </h4>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <TrustBadgeSandboxPill size="medium" sample={sample} />
          {showConnectors && <ConnectorStrip connectors={sample.connectors} />}
        </div>
        <div className="mt-1.5 text-[11px] text-[rgba(245,241,230,0.55)]">
          {showConnectors
            ? `${sample.archetype} · ${sample.connectors.filter((c) => c.viewerKnows).map((c) => c.name).join(" · ") || "via mutual connections"}`
            : sample.archetype}
        </div>
      </div>
    </div>
  );
}

function HostRowGrid() {
  return (
    <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
      {SAMPLES.map((s) => (
        <HostRow key={s.id} sample={s} />
      ))}
    </div>
  );
}

// ── Surface 4: profile-page macro block ──────────────────────────
// Big, fully-labeled detail card. Used on the host's profile page
// where there's room to spell out each metric ("4.7★ (12 reviews)"
// rather than "4.7"). FT-1 phase 3 deliverable: full breakdown with
// supporting counts.

function MacroMetric({
  icon,
  label,
  value,
  unit,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  sub: string;
  tone: "connection" | "vouch" | "rating-good" | "rating-bad" | "muted";
}) {
  const palette =
    tone === "muted"
      ? { bg: "#F1F5F4", fg: "#525252", border: "#E5E5E5" }
      : METRIC_TONE[tone];
  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: palette.bg,
        border: `1px solid ${palette.border}`,
      }}
    >
      <div
        className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em]"
        style={{ color: palette.fg }}
      >
        <span className="h-3 w-3">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span
          className="text-2xl font-semibold tabular-nums"
          style={{ color: palette.fg }}
        >
          {value}
        </span>
        <span
          className="text-xs"
          style={{ color: palette.fg, opacity: 0.65 }}
        >
          {unit}
        </span>
      </div>
      <div
        className="mt-1 text-[11px]"
        style={{ color: palette.fg, opacity: 0.75 }}
      >
        {sub}
      </div>
    </div>
  );
}

function MacroBlock({ sample }: { sample: Sample }) {
  const isColdStart =
    sample.degree === null &&
    sample.connection === null &&
    sample.vouch === null &&
    sample.rating === null;

  // 1° intentionally skips Connection and Vouch tiles per Loren's
  // direction — direct vouch is the whole story; rating is the only
  // independent signal worth surfacing.
  const isFirstDegree = sample.degree === 1;
  const showConnection =
    !isFirstDegree &&
    sample.connection !== null &&
    sample.degree !== null &&
    sample.degree < 4;
  const showVouch = !isFirstDegree && sample.vouch !== null;
  const showRating = sample.rating !== null && sample.reviewCount > 0;
  const ratingWarn = sample.rating !== null && sample.rating < 3.5;

  const degreeStyle = sample.degree ? DEGREE_PILL[sample.degree] : null;
  const showConnectors = sample.connectors.length > 0;
  const vouchDirCopy =
    sample.vouchDirection === "mutual"
      ? "You and " + sample.name + " have vouched for each other"
      : sample.vouchDirection === "outgoing"
        ? "You vouched for " + sample.name + " · no return vouch yet"
        : sample.vouchDirection === "incoming"
          ? sample.name + " vouched for you · you haven't vouched back"
          : null;

  return (
    <div
      className="rounded-2xl p-6 sm:p-8"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid rgba(11,46,37,0.14)",
        color: "#0B2E25",
      }}
    >
      {/* Header: big avatar photo + name + degree pill + headline + bio */}
      <div className="flex items-start gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sample.avatarUrl}
          alt={sample.name}
          className="h-20 w-20 shrink-0 rounded-full object-cover sm:h-24 sm:w-24"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4
              className="!text-2xl !font-semibold !leading-tight tracking-normal"
              style={{ color: "#0B2E25" }}
            >
              {sample.name}
            </h4>
            {degreeStyle ? (
              // 2°/3° get the combo pill (degree | connection); 1° and
              // 4°+ stay single-segment. 1° optionally appends an arrow
              // for asymmetric vouch direction.
              (sample.degree === 2 || sample.degree === 3) &&
              sample.connection !== null ? (
                <span
                  className="inline-flex items-stretch overflow-hidden rounded-full text-sm font-semibold tabular-nums"
                  style={{ border: `1px solid ${degreeStyle.outlineColor}` }}
                >
                  <span
                    className="inline-flex items-center px-3 py-0.5"
                    style={{
                      backgroundColor: degreeStyle.bg,
                      color: degreeStyle.fg,
                      borderRadius: 0,
                    }}
                  >
                    {degreeStyle.label}
                  </span>
                  <span
                    className="inline-flex items-center px-3 py-0.5"
                    style={{
                      color: degreeStyle.outlineColor,
                      borderLeft: `1px solid ${degreeStyle.outlineColor}`,
                      borderRadius: 0,
                    }}
                  >
                    {sample.connection.toFixed(1)}
                  </span>
                </span>
              ) : sample.degree === 1 &&
                sample.vouchDirection &&
                sample.vouchDirection !== "mutual" ? (
                // 1° asymmetric — combo pill (white | gap | orange arrow)
                <span
                  className="inline-flex items-stretch overflow-hidden rounded-full text-sm font-semibold"
                  style={{
                    gap: "2px",
                    border: "1px solid rgba(11,46,37,0.14)",
                  }}
                >
                  <span
                    className="inline-flex items-center px-3 py-0.5"
                    style={{
                      backgroundColor: degreeStyle.bg,
                      color: degreeStyle.fg,
                      borderRadius: 0,
                    }}
                  >
                    {degreeStyle.label}
                  </span>
                  <button
                    type="button"
                    title={
                      sample.vouchDirection === "outgoing"
                        ? "You vouched for them — they haven't vouched back. Click to nudge."
                        : "They vouched for you — you haven't vouched back. Click to vouch back."
                    }
                    className="inline-flex items-center px-2.5 py-0.5 transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: ASYMMETRY_ORANGE,
                      color: "#FFFFFF",
                      borderRadius: 0,
                    }}
                    onClick={(e) => e.preventDefault()}
                  >
                    {sample.vouchDirection === "outgoing" ? (
                      <ArrowRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowLeft className="h-3.5 w-3.5" />
                    )}
                  </button>
                </span>
              ) : (
                <span
                  className="inline-flex items-center rounded-full px-3 py-0.5 text-sm font-semibold"
                  style={{
                    backgroundColor: degreeStyle.bg,
                    color: degreeStyle.fg,
                    border:
                      sample.degree === 1
                        ? "1px solid rgba(11,46,37,0.14)"
                        : undefined,
                  }}
                >
                  {degreeStyle.label}
                </span>
              )
            ) : (
              <span
                className="inline-flex items-center rounded-full px-3 py-0.5 text-sm font-semibold"
                style={{ backgroundColor: "#3F3F46", color: "#F4F4F5" }}
              >
                {isColdStart ? "New member" : "No path"}
              </span>
            )}
          </div>
          <div
            className="mt-1 text-sm"
            style={{ color: "rgba(11,46,37,0.62)" }}
          >
            {sample.profile.headline}
          </div>
          <p
            className="mt-3 text-sm leading-relaxed"
            style={{ color: "rgba(11,46,37,0.78)" }}
          >
            {sample.profile.bio}
          </p>

          {/* Connector strip — same pattern as the medium card, just
              white-bg-friendly ring color */}
          {showConnectors && (
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center -space-x-1.5">
                {sample.connectors.slice(0, 4).map((c) => (
                  <span
                    key={c.id}
                    title={c.viewerKnows ? c.name : "Mutual connection"}
                    className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full"
                    style={{
                      border: "2px solid #FFFFFF",
                      backgroundColor: "#F1F5F4",
                    }}
                  >
                    {c.viewerKnows && c.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={c.avatarUrl}
                        alt={c.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="rgba(11,46,37,0.5)"
                        className="h-4 w-4"
                        aria-hidden
                      >
                        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Z" />
                      </svg>
                    )}
                  </span>
                ))}
              </span>
              <span
                className="text-xs"
                style={{ color: "rgba(11,46,37,0.62)" }}
              >
                {sample.connectors.filter((c) => c.viewerKnows).map((c) => c.name).join(", ")}
                {sample.connectors.some((c) => !c.viewerKnows) &&
                  ` + ${sample.connectors.filter((c) => !c.viewerKnows).length} mutual`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Metric tile row */}
      {isColdStart ? (
        <div
          className="mt-6 rounded-xl p-5 text-sm"
          style={{
            backgroundColor: "#F1F5F4",
            border: "1px solid #E5E5E5",
            color: "rgba(11,46,37,0.7)",
          }}
        >
          New to Trustead — no vouches or reviews yet. Invite a friend to
          vouch and start a chain.
        </div>
      ) : isFirstDegree ? (
        // 1° — direct vouch is the whole story. Show a vouch-direction
        // callout + the rating tile only.
        <div className="mt-6 grid gap-3 grid-cols-1 sm:grid-cols-2">
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: "#ECFDF5",
              border: "1px solid #A7F3D0",
              color: "#065F46",
            }}
          >
            <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#047857]">
              Direct vouch
            </div>
            <div className="mt-1.5 text-sm font-semibold leading-snug">
              {vouchDirCopy}
            </div>
          </div>
          {showRating ? (
            <MacroMetric
              icon={<Star className="h-full w-full" fill="currentColor" />}
              label="Rating"
              value={sample.rating!.toFixed(1)}
              unit="★"
              sub={`Across ${sample.reviewCount} ${sample.reviewCount === 1 ? "review" : "reviews"}`}
              tone={ratingWarn ? "rating-bad" : "rating-good"}
            />
          ) : (
            <MacroMetric
              icon={<Star className="h-full w-full" fill="currentColor" />}
              label="Rating"
              value="—"
              unit=""
              sub="No reviews yet"
              tone="muted"
            />
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-3 grid-cols-1 sm:grid-cols-3">
          {showConnection ? (
            <MacroMetric
              icon={ICON_CIRCLE}
              label="Connection"
              value={sample.connection!.toFixed(1)}
              unit="/ 10"
              sub={`Reachable through ${sample.profile.chains} ${sample.profile.chains === 1 ? "chain" : "chains"} in your network`}
              tone="connection"
            />
          ) : (
            <MacroMetric
              icon={ICON_CIRCLE}
              label="Connection"
              value="—"
              unit=""
              sub="Too far in the network to score"
              tone="muted"
            />
          )}
          {showVouch && (
            <MacroMetric
              icon={ICON_SHIELD}
              label="Vouch"
              value={sample.vouch!.toFixed(1)}
              unit="/ 10"
              sub={`From ${sample.profile.vouchers} ${sample.profile.vouchers === 1 ? "voucher" : "vouchers"} platform-wide`}
              tone="vouch"
            />
          )}
          {showRating ? (
            <MacroMetric
              icon={<Star className="h-full w-full" fill="currentColor" />}
              label="Rating"
              value={sample.rating!.toFixed(1)}
              unit="★"
              sub={`Across ${sample.reviewCount} ${sample.reviewCount === 1 ? "review" : "reviews"}`}
              tone={ratingWarn ? "rating-bad" : "rating-good"}
            />
          ) : (
            <MacroMetric
              icon={<Star className="h-full w-full" fill="currentColor" />}
              label="Rating"
              value="—"
              unit=""
              sub="No reviews yet"
              tone="muted"
            />
          )}
        </div>
      )}
    </div>
  );
}

function MacroStack() {
  // Full-width stack — the macro block lives on a profile page, which
  // is a single-column surface. Show all six samples so every state
  // is visible (top tier, 2°/3° with connectors, 4°+, cold-start,
  // penalized).
  return (
    <div className="grid gap-5">
      {SAMPLES.map((s) => (
        <MacroBlock key={s.id} sample={s} />
      ))}
    </div>
  );
}

// ── Palette comparator (top-of-page review section) ─────────────
// Shows alternative color scales for the degree pill. 2° (emerald)
// and 3° (mustard) are held fixed across all options — only 1° and
// 4° vary. Each row shows the four pills in the same order they'd
// appear on a real badge: a single 1° pill, then 2°/3° as combo
// pills (so the outline-color is visible), then a single 4°+ pill.

type DegreeColor = { bg: string; fg: string; outline: string };
type Palette = {
  id: string;
  name: string;
  note: string;
  d1: DegreeColor;
  d2: DegreeColor;
  d3: DegreeColor;
  d4: DegreeColor;
};

// Single starting palette. Loren's working values from the most recent
// design pass — a sky-blue 1°, mint 2°, mustard 3°, neutral gray 4°+.
// Use the row's Duplicate button to fork an iteration; the duplicate
// inherits the source's *current* picker values (not these defaults),
// so refinements compound row-by-row.
const INITIAL_PALETTES: Palette[] = [
  {
    id: "base",
    name: "Base",
    note: "Starting palette — duplicate to iterate without losing this baseline. Each tier is editable; the vouch power chip in the preview follows the same color scale based on its score, so a 3° contact can still display a high-vouch color and vice versa.",
    d1: { bg: "#3ABFF8", fg: "#0B2E25", outline: "#3ABFF8" },
    d2: { bg: "#1AEAA5", fg: "#0B2E25", outline: "#1AEAA5" },
    d3: { bg: "#FDD34D", fg: "#0B2E25", outline: "#FDD34D" },
    d4: { bg: "#BABABA", fg: "#0B2E25", outline: "#BABABA" },
  },
];

// Pick a readable text color for a given background. Good-enough
// luminance check — keeps the picker UX simple (one color input per
// segment instead of two).
function pickFg(hex: string): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return "#FFFFFF";
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return luma > 150 ? "#0B2E25" : "#FFFFFF";
}

// Very-light backgrounds (white, cream, pale gray) need a hairline border so
// the pill still reads as a defined shape against the dark sandbox surface.
// Stricter threshold than pickFg's "needs-dark-text" cutoff.
function isVeryLight(hex: string): boolean {
  const m = hex.replace("#", "");
  if (m.length !== 6) return false;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 200;
}

function SwatchPill({
  label,
  color,
  hairline = false,
}: {
  label: string;
  color: DegreeColor;
  hairline?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{
        backgroundColor: color.bg,
        color: color.fg,
        border: hairline ? "1px solid rgba(11,46,37,0.14)" : undefined,
      }}
    >
      {label}
    </span>
  );
}

function ComboSwatchPill({
  label,
  score,
  color,
}: {
  label: string;
  score: string;
  color: DegreeColor;
}) {
  return (
    <span
      className="inline-flex items-stretch overflow-hidden rounded-full text-xs font-semibold tabular-nums"
      style={{ border: `1px solid ${color.outline}` }}
    >
      <span
        className="inline-flex items-center px-2.5 py-0.5"
        style={{
          backgroundColor: color.bg,
          color: color.fg,
          borderRadius: 0,
        }}
      >
        {label}
      </span>
      <span
        className="inline-flex items-center px-2.5 py-0.5"
        style={{
          color: color.outline,
          borderLeft: `1px solid ${color.outline}`,
          borderRadius: 0,
        }}
      >
        {score}
      </span>
    </span>
  );
}

function ColorSwatchInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label
      className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.08em]"
      style={{ color: "rgba(245,241,230,0.62)" }}
    >
      <span className="w-7 shrink-0 text-right">{label}</span>
      <span
        className="relative inline-block h-6 w-6 shrink-0 overflow-hidden rounded-md"
        style={{ border: "1px solid rgba(245,241,230,0.2)" }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer border-0 bg-transparent p-0"
          aria-label={`${label} color`}
        />
      </span>
      <span style={{ color: "rgba(245,241,230,0.45)" }}>
        {value.toUpperCase()}
      </span>
    </label>
  );
}

// Resolve a vouch score to its tier color under the *palette's*
// current color choices (not the canonical hardcoded scale). The
// preview pills want to show how vouch coloring shifts as the user
// retunes the palette.
function paletteVouchColor(
  score: number,
  d1: DegreeColor,
  d2: DegreeColor,
  d3: DegreeColor,
  d4: DegreeColor
): string {
  if (score >= 5) return d1.bg;
  if (score >= 4) return d2.bg;
  if (score >= 3) return d3.bg;
  return d4.bg;
}

// Sample combinations rendered in each palette's preview row. Mixes
// degree tiers with vouch scores that don't all line up — a 3° host
// with strong vouch power, a 4°+ host with low vouch — so the preview
// shows how degree and vouch coloring interact under the chosen
// palette, not just the "everything matches" diagonal.
const PREVIEW_COMBOS: Array<{
  tier: 1 | 2 | 3 | 4;
  connection?: string;
  vouch: number;
}> = [
  { tier: 1, vouch: 8.5 },
  { tier: 2, connection: "6.4", vouch: 4.0 },
  { tier: 3, connection: "3.2", vouch: 7.2 },
  { tier: 4, vouch: 1.2 },
];

function PreviewCombo({
  tier,
  connection,
  vouch,
  d1,
  d2,
  d3,
  d4,
}: {
  tier: 1 | 2 | 3 | 4;
  connection?: string;
  vouch: number;
  d1: DegreeColor;
  d2: DegreeColor;
  d3: DegreeColor;
  d4: DegreeColor;
}) {
  const tierColor = [d1, d2, d3, d4][tier - 1];
  const tierLabel = tier === 4 ? "4°+" : `${tier}°`;
  const vouchColor = paletteVouchColor(vouch, d1, d2, d3, d4);
  return (
    <span className="inline-flex items-center gap-1">
      {connection ? (
        <ComboSwatchPill
          label={tierLabel}
          score={connection}
          color={tierColor}
        />
      ) : (
        <SwatchPill
          label={tierLabel}
          color={tierColor}
          hairline={isVeryLight(tierColor.bg)}
        />
      )}
      <span
        className="inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums"
        style={{ color: vouchColor }}
      >
        <Shield
          className="h-3 w-3"
          fill="currentColor"
          strokeWidth={0}
        />
        <span>{vouch.toFixed(1)}</span>
      </span>
    </span>
  );
}

function PaletteRow({
  initial,
  onDuplicate,
  onRemove,
  canRemove,
}: {
  initial: Palette;
  onDuplicate: (
    sourceId: string,
    snapshot: {
      d1: DegreeColor;
      d2: DegreeColor;
      d3: DegreeColor;
      d4: DegreeColor;
    }
  ) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  // Each row owns its own color state so editing one palette never
  // affects another. Initial values come from the palette definition
  // (either INITIAL_PALETTES or a duplicate-snapshot). Reload page to
  // reset.
  const [d1, setD1] = useState<DegreeColor>(initial.d1);
  const [d2, setD2] = useState<DegreeColor>(initial.d2);
  const [d3, setD3] = useState<DegreeColor>(initial.d3);
  const [d4, setD4] = useState<DegreeColor>(initial.d4);
  // Default open so freshly-created (and base) palettes immediately
  // show their picker UX; collapse manually if the list grows long.
  const [open, setOpen] = useState(true);

  const setBg = (
    setter: (c: DegreeColor) => void
  ): ((next: string) => void) =>
    (next: string) =>
      setter({ bg: next, fg: pickFg(next), outline: next });

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{
        backgroundColor: "rgba(7,34,27,0.55)",
        border: "1px solid rgba(245,241,230,0.12)",
      }}
    >
      {/* Toggle row — chevron + name on the left, four sample combos
          (degree pill + vouch chip) on the right. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[rgba(245,241,230,0.04)]"
      >
        <ChevronRight
          className="h-3.5 w-3.5 shrink-0 transition-transform"
          style={{
            color: "rgba(245,241,230,0.55)",
            transform: open ? "rotate(90deg)" : "none",
          }}
          aria-hidden
        />
        <h4
          className="!text-sm !font-semibold !leading-tight tracking-normal shrink-0"
          style={{ color: "#F5F1E6" }}
        >
          {initial.name}
        </h4>
        <span className="ml-auto flex flex-wrap items-center justify-end gap-3">
          {PREVIEW_COMBOS.map((c, i) => (
            <PreviewCombo
              key={i}
              tier={c.tier}
              connection={c.connection}
              vouch={c.vouch}
              d1={d1}
              d2={d2}
              d3={d3}
              d4={d4}
            />
          ))}
        </span>
      </button>

      {open && (
        <div
          className="px-4 pb-4 pt-3"
          style={{ borderTop: "1px solid rgba(245,241,230,0.08)" }}
        >
          <p
            className="mb-3 max-w-3xl text-xs leading-relaxed"
            style={{ color: "rgba(245,241,230,0.62)" }}
          >
            {initial.note}
          </p>
          {/* 2x2 picker grid — keeps the expanded row compact. */}
          <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-x-6">
            <ColorSwatchInput
              label="1°"
              value={d1.bg}
              onChange={setBg(setD1)}
            />
            <ColorSwatchInput
              label="2°"
              value={d2.bg}
              onChange={setBg(setD2)}
            />
            <ColorSwatchInput
              label="3°"
              value={d3.bg}
              onChange={setBg(setD3)}
            />
            <ColorSwatchInput
              label="4°+"
              value={d4.bg}
              onChange={setBg(setD4)}
            />
          </div>
          {/* Action footer — Duplicate forks a copy below with the
              current picker values; Delete removes this row (hidden
              when only one palette is left). */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() =>
                onDuplicate(initial.id, { d1, d2, d3, d4 })
              }
              className="inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.08em] transition-colors hover:bg-[rgba(245,241,230,0.08)]"
              style={{
                color: "rgba(245,241,230,0.78)",
                border: "1px solid rgba(245,241,230,0.2)",
              }}
            >
              Duplicate
            </button>
            {canRemove && (
              <button
                type="button"
                onClick={() => onRemove(initial.id)}
                className="inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.08em] transition-colors hover:bg-[rgba(248,113,113,0.12)]"
                style={{
                  color: "rgba(252,165,165,0.85)",
                  border: "1px solid rgba(252,165,165,0.3)",
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PaletteOptions() {
  // Lift the palette list up so Duplicate / Delete can mutate it.
  // Each row still owns its own picker state (keyed by stable id), so
  // edits to one row never disturb another.
  const [palettes, setPalettes] = useState<Palette[]>(INITIAL_PALETTES);

  const handleDuplicate = (
    sourceId: string,
    snapshot: {
      d1: DegreeColor;
      d2: DegreeColor;
      d3: DegreeColor;
      d4: DegreeColor;
    }
  ) => {
    setPalettes((prev) => {
      const idx = prev.findIndex((p) => p.id === sourceId);
      if (idx < 0) return prev;
      const source = prev[idx];
      // Count existing copies to suffix a stable name.
      const copyCount = prev.filter((p) =>
        p.name.startsWith(`${source.name} copy`)
      ).length;
      const copy: Palette = {
        id: `${sourceId}-copy-${Date.now()}`,
        name: copyCount === 0
          ? `${source.name} copy`
          : `${source.name} copy ${copyCount + 1}`,
        note: source.note,
        d1: snapshot.d1,
        d2: snapshot.d2,
        d3: snapshot.d3,
        d4: snapshot.d4,
      };
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
  };

  const handleRemove = (id: string) => {
    setPalettes((prev) =>
      prev.length > 1 ? prev.filter((p) => p.id !== id) : prev
    );
  };

  return (
    <div className="grid gap-3">
      {palettes.map((p) => (
        <PaletteRow
          key={p.id}
          initial={p}
          onDuplicate={handleDuplicate}
          onRemove={handleRemove}
          canRemove={palettes.length > 1}
        />
      ))}
    </div>
  );
}

// ── Page shell ───────────────────────────────────────────────────

export function TrustBadgeSandbox() {
  return (
    <div className="min-h-screen bg-[var(--tt-body-bg)] text-[#F5F1E6] py-10 sm:py-14">
      {/* Page header is constrained, but the nano + micro side-by-side
          row below uses a wider container so the listings can render at
          something close to their real width without crowding the inbox. */}
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <header className="mb-10">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[rgba(245,241,230,0.55)]">
            Trustead · sandbox
          </div>
          <h1 className="mt-2 !text-4xl sm:!text-5xl !leading-[1.05] text-[#F5F1E6]">
            Trust badge sizes
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[rgba(245,241,230,0.78)] leading-relaxed">
            One badge, four sizes — each shown in the surface where it
            actually appears in the app: nano in the inbox row, micro on
            a listing tile, medium on a host card, macro on a profile page.
            All four pull from the same FT-1 four-metric model (degree ·
            connection · vouch · rating); detail collapses as the badge
            shrinks.
          </p>
        </header>

        <section className="mb-12">
          <SectionHeader
            eyebrow="Palette · review"
            title="Degree color scale options"
            note="Tinker with all four tiers per palette. Each row's preview pairs a degree pill with a sample vouch chip — including asymmetric combos (3° host with high vouch, 4°+ host with low vouch) — so you can see how degree and vouch coloring interact under the chosen palette. Duplicate any row to fork an iteration; delete the ones that aren't working."
          />
          <PaletteOptions />
        </section>
      </div>

      {/* Nano + Micro row — wider than page max so we can see both in
          context next to each other. */}
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
          <section className="shrink-0">
            <SectionHeader
              eyebrow="Size 01 · Nano"
              title="Inbox thread row"
              note="Smallest size. Just the degree pill — a tiny visual anchor next to the name. Cold-start renders as a 'New member' chip."
            />
            <InboxMockup />
          </section>

          <section className="min-w-0 flex-1">
            <SectionHeader
              eyebrow="Size 02 · Micro"
              title="Listing card"
              note="Sits inline below the image — under the location, title, and 'Hosted by' line — same spot LiveListingCard puts it today. Two-segment combo pill (degree · connection) + Vouch diamond + uncontained rating with count."
            />
            <ListingGrid />
          </section>
        </div>
      </div>

      <div className="mx-auto mt-12 w-full max-w-[1200px] px-5 sm:px-8">
        <div className="space-y-12">
          <section>
            <SectionHeader
              eyebrow="Size 03 · Medium"
              title="Host card on a full listings page"
              note="Combo degree pill (with connection score baked in) + Vouch diamond + uncontained rating + connector strip showing the people who connect you to this host. 1° drops the metric pills since direct vouch is the whole story."
            />
            <HostRowGrid />
          </section>

          <section>
            <SectionHeader
              eyebrow="Size 04 · Macro"
              title="Profile page block"
              note="The biggest size. Full-width profile-page block with avatar photo, bio, connector strip, and three labeled metric tiles. Connection collapses to '—' for 4°+; whole block collapses to a 'New member' empty state for cold-start users."
            />
            <MacroStack />
          </section>
        </div>

        <footer className="mt-14 text-[11px] text-[rgba(245,241,230,0.45)]">
          Sandbox only · no DB · sample data lives in
          <span className="font-mono ml-1">SAMPLES</span> at the top of
          <span className="font-mono ml-1">TrustBadgeSandbox.tsx</span>
        </footer>
      </div>
    </div>
  );
}
