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

import { Star, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

type Sample = {
  id: string;
  name: string;
  initials: string;
  archetype: string;
  avatarUrl: string;
  degree: DegreeBucket;
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
    archetype: "1° · top tier",
    avatarUrl: "https://i.pravatar.cc/200?img=47",
    degree: 1,
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
    archetype: "low rating",
    avatarUrl: "https://i.pravatar.cc/200?img=60",
    degree: 2,
    connection: 5.0,
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
      chains: 2,
      vouchers: 5,
    },
    connectors: [
      { id: "c8", name: "Aki N.", avatarUrl: "https://i.pravatar.cc/100?img=12", viewerKnows: true },
    ],
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
  { bg: string; fg: string; label: string }
> = {
  1: { bg: "#BFE2D4", fg: "#0B2E25", label: "1°" }, // mint, dark text
  2: { bg: "#2A8A6B", fg: "#FFFFFF", label: "2°" }, // emerald
  3: { bg: "#BF8A0D", fg: "#FFFFFF", label: "3°" }, // mustard
  4: { bg: "#525252", fg: "#FFFFFF", label: "4°+" }, // zinc
};

const METRIC_TONE: Record<
  "connection" | "vouch" | "rating-good" | "rating-bad",
  { bg: string; fg: string; border: string }
> = {
  connection: { bg: "#EFF6FF", fg: "#1D4ED8", border: "#BFDBFE" },
  vouch: { bg: "#FAF5FF", fg: "#6B21A8", border: "#E9D5FF" },
  "rating-good": { bg: "#FFFBEB", fg: "#B45309", border: "#FDE68A" },
  "rating-bad": { bg: "#FEF2F2", fg: "#B91C1C", border: "#FECACA" },
};

// Per trust-icons.html top-pick: ● circle for connection (blue), ◆
// diamond for vouch (purple), ★ star for rating (amber-gold, locked).
const ICON_CIRCLE = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
    <circle cx="12" cy="12" r="10" />
  </svg>
);
const ICON_DIAMOND = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
    <path d="M12 2L22 12L12 22L2 12Z" />
  </svg>
);

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

function MetricPill({
  icon,
  value,
  tone,
  size,
}: {
  icon: React.ReactNode;
  value: string;
  tone: "connection" | "vouch" | "rating-good" | "rating-bad";
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

  // Degree pill — the visual anchor every size shares.
  const degreeStyle = sample.degree ? DEGREE_PILL[sample.degree] : null;
  const degreeSizeCls =
    size === "nano"
      ? "px-1.5 py-[1px] text-[10px] leading-[1.1]"
      : size === "micro"
        ? "px-2 py-[1px] text-[11px]"
        : "px-2.5 py-0.5 text-xs";
  const degreeChip = degreeStyle ? (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold",
        degreeSizeCls
      )}
      style={{ backgroundColor: degreeStyle.bg, color: degreeStyle.fg }}
    >
      {degreeStyle.label}
    </span>
  ) : (
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

  // Nano = degree-only. The whole point of this size is "tiny visual
  // anchor next to a name in a list" — don't add metric pills.
  if (size === "nano") {
    return <span className="inline-flex items-center">{degreeChip}</span>;
  }

  // Decide which metrics to show.
  // Per FT-1 cold-start rules: hide pillars the user has no data in.
  const showConnection =
    size === "medium" && sample.connection !== null && sample.degree !== null && sample.degree < 4;
  const showVouch = sample.vouch !== null;
  const showRating = sample.rating !== null && sample.reviewCount > 0;
  const ratingWarn = sample.rating !== null && sample.rating < 3.5;

  // Micro picks ONE metric pill — Vouch is the absolute signal that
  // travels best to a card-tile context. Rating goes alongside.
  const microMetric =
    size === "micro" && showVouch ? (
      <MetricPill
        icon={ICON_DIAMOND}
        value={sample.vouch!.toFixed(1)}
        tone="vouch"
        size="micro"
      />
    ) : null;
  const ratingTone = ratingWarn ? "rating-bad" : "rating-good";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full",
        onImage && "px-1.5 py-0.5 shadow-sm"
      )}
      style={onImage ? { backgroundColor: "rgba(255,255,255,0.95)" } : undefined}
    >
      {degreeChip}
      {size === "micro" && (
        <>
          {microMetric}
          {showRating && (
            <MetricPill
              icon={
                <Star className="h-full w-full" fill="currentColor" />
              }
              value={sample.rating!.toFixed(1)}
              tone={ratingTone}
              size="micro"
            />
          )}
        </>
      )}
      {size === "medium" && (
        <>
          {showConnection && (
            <MetricPill
              icon={ICON_CIRCLE}
              value={sample.connection!.toFixed(1)}
              tone="connection"
              size="medium"
            />
          )}
          {showVouch && (
            <MetricPill
              icon={ICON_DIAMOND}
              value={sample.vouch!.toFixed(1)}
              tone="vouch"
              size="medium"
            />
          )}
          {showRating && (
            <MetricPill
              icon={
                <Star className="h-full w-full" fill="currentColor" />
              }
              value={`${sample.rating!.toFixed(1)} (${sample.reviewCount})`}
              tone={ratingTone}
              size="medium"
            />
          )}
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

// Mirrors src/components/listing-card.tsx — real listing image, heart
// top-right, carousel dot indicators bottom-center, trust chip pinned
// bottom-right. The micro pill sits inside that white chip and has to
// compete with the photo + heart for attention.
function ListingTile({ sample }: { sample: Sample }) {
  const { listing } = sample;
  return (
    <div className="group block">
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
        {/* Heart top-right (favorite) */}
        <Heart
          className="absolute top-3 right-3 z-10 h-6 w-6 drop-shadow-md"
          style={{ color: "rgba(255,255,255,0.95)", fill: "rgba(0,0,0,0.3)" }}
          aria-hidden
        />

        {/* Carousel arrows on hover (visual only) */}
        <div className="pointer-events-none absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 group-hover:flex h-8 w-8 items-center justify-center rounded-full shadow-sm" style={{ backgroundColor: "rgba(255,255,255,0.9)" }}>
          <ChevronLeft className="h-4 w-4" style={{ color: "#0B2E25" }} />
        </div>
        <div className="pointer-events-none absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 group-hover:flex h-8 w-8 items-center justify-center rounded-full shadow-sm" style={{ backgroundColor: "rgba(255,255,255,0.9)" }}>
          <ChevronRight className="h-4 w-4" style={{ color: "#0B2E25" }} />
        </div>

        {/* Carousel dots bottom-center */}
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor:
                  i === 0 ? "#FFFFFF" : "rgba(255,255,255,0.5)",
              }}
            />
          ))}
        </div>

        {/* Trust pill — bottom-right, white chip, micro size */}
        <div className="absolute bottom-3 right-3 z-10">
          <TrustBadgeSandboxPill size="micro" sample={sample} onImage />
        </div>
      </div>

      <div className="mt-3 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <h4
            className="!text-base !font-semibold !leading-tight tracking-normal line-clamp-1"
            style={{ color: "#F5F1E6" }}
          >
            {listing.location}
          </h4>
          {sample.rating !== null && sample.reviewCount > 0 && (
            <div className="flex shrink-0 items-center gap-1 text-sm">
              <Star
                className="h-3.5 w-3.5"
                fill="currentColor"
                style={{ color: "#F5F1E6" }}
              />
              <span className="font-medium" style={{ color: "#F5F1E6" }}>
                {sample.rating.toFixed(1)}
              </span>
              <span style={{ color: "rgba(245,241,230,0.55)" }}>
                ({sample.reviewCount})
              </span>
            </div>
          )}
        </div>
        <p className="text-sm line-clamp-1" style={{ color: "rgba(245,241,230,0.62)" }}>
          {listing.title}
        </p>
        <p className="pt-1 text-base">
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
  // Pick four samples that together show the range — top, mid,
  // distant, and the cold-start case.
  const ids = ["maya", "aki", "theo", "jules"];
  const tiles = ids
    .map((id) => SAMPLES.find((s) => s.id === id))
    .filter((s): s is Sample => Boolean(s));
  return (
    <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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

  const showConnection =
    sample.connection !== null && sample.degree !== null && sample.degree < 4;
  const showVouch = sample.vouch !== null;
  const showRating = sample.rating !== null && sample.reviewCount > 0;
  const ratingWarn = sample.rating !== null && sample.rating < 3.5;

  const degreeStyle = sample.degree ? DEGREE_PILL[sample.degree] : null;
  const showConnectors = sample.connectors.length > 0;

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
              <span
                className="inline-flex items-center rounded-full px-3 py-0.5 text-sm font-semibold"
                style={{ backgroundColor: degreeStyle.bg, color: degreeStyle.fg }}
              >
                {degreeStyle.label}
              </span>
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
              icon={ICON_DIAMOND}
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

// ── Page shell ───────────────────────────────────────────────────

export function TrustBadgeSandbox() {
  return (
    <div className="min-h-screen bg-[var(--tt-body-bg)] text-[#F5F1E6] py-10 sm:py-14">
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

        <div className="space-y-12">
          <section>
            <SectionHeader
              eyebrow="Size 01 · Nano"
              title="Inbox thread row"
              note="Smallest size. Just the degree pill — a tiny visual anchor next to the name. No metrics, no rating star. Cold-start renders as a 'New member' chip."
            />
            <InboxMockup />
          </section>

          <section>
            <SectionHeader
              eyebrow="Size 02 · Micro"
              title="Listing card overlay"
              note="Floats on the listing image. Degree pill + the absolute Vouch score (purple diamond) + raw rating. Connection score is omitted at this size to keep the chip narrow; the listing tile already implies the viewer has a path to it."
            />
            <ListingGrid />
          </section>

          <section>
            <SectionHeader
              eyebrow="Size 03 · Medium"
              title="Host card on a full listings page"
              note="Full four-metric display. Connection circle (blue, viewer-relative) + Vouch diamond (purple, absolute) + Rating star (amber, with review count in parens). 4°+ hides the connection pill per spec; cold-start collapses to a 'New member' chip."
            />
            <HostRowGrid />
          </section>

          <section>
            <SectionHeader
              eyebrow="Size 04 · Macro"
              title="Profile page block"
              note="The biggest size. Lives on the host's profile page where each metric gets its own labeled tile with the supporting count (chains, vouchers, reviews). Connection collapses to '—' for 4°+; whole block collapses to a 'New member' empty state for cold-start users."
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
