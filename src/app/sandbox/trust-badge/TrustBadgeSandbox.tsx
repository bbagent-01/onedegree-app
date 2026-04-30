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

import { Star } from "lucide-react";
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

type Sample = {
  id: string;
  name: string;
  initials: string;
  archetype: string;
  degree: DegreeBucket;
  connection: number | null;
  vouch: number | null;
  rating: number | null;
  reviewCount: number;
  // Inbox row content
  preview: string;
  time: string;
  // Listing tile content (only used in the micro grid)
  listing: {
    title: string;
    location: string;
    price: number;
    image: string; // tailwind gradient class for the placeholder image
  };
};

const SAMPLES: Sample[] = [
  {
    id: "maya",
    name: "Maya L.",
    initials: "ML",
    archetype: "1° · top tier",
    degree: 1,
    connection: 9.4,
    vouch: 8.2,
    rating: 4.9,
    reviewCount: 23,
    preview: "Yes! The lake house is yours for the long weekend.",
    time: "12m",
    listing: {
      title: "Cedar A-frame on Lake Superior",
      location: "Bayfield, WI",
      price: 184,
      image: "from-emerald-700 via-emerald-600 to-emerald-900",
    },
  },
  {
    id: "aki",
    name: "Aki N.",
    initials: "AN",
    archetype: "2° · solid",
    degree: 2,
    connection: 6.4,
    vouch: 5.7,
    rating: 4.7,
    reviewCount: 12,
    preview: "Happy to host — I'll send the door code on arrival day.",
    time: "1h",
    listing: {
      title: "Sunlit loft above the bakery",
      location: "Brooklyn, NY",
      price: 142,
      image: "from-amber-700 via-orange-700 to-red-900",
    },
  },
  {
    id: "robin",
    name: "Robin K.",
    initials: "RK",
    archetype: "3° · weaker",
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
      image: "from-stone-600 via-stone-700 to-stone-900",
    },
  },
  {
    id: "theo",
    name: "Theo R.",
    initials: "TR",
    archetype: "4°+ · distant",
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
      image: "from-sky-800 via-indigo-900 to-slate-900",
    },
  },
  {
    id: "jules",
    name: "Jules P.",
    initials: "JP",
    archetype: "new member",
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
      image: "from-teal-700 via-cyan-800 to-emerald-900",
    },
  },
  {
    id: "drew",
    name: "Drew M.",
    initials: "DM",
    archetype: "low rating",
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
      image: "from-rose-800 via-amber-900 to-stone-900",
    },
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

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[rgba(245,241,230,0.12)] text-xs font-semibold text-[#F5F1E6]">
      {initials}
    </div>
  );
}

function InboxRow({ sample }: { sample: Sample }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3 border-b border-[rgba(245,241,230,0.08)] last:border-b-0 hover:bg-[rgba(245,241,230,0.04)] transition-colors">
      <Avatar initials={sample.initials} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-[#F5F1E6]">
              {sample.name}
            </span>
            <TrustBadgeSandboxPill size="nano" sample={sample} />
          </div>
          <span className="shrink-0 text-[11px] text-[rgba(245,241,230,0.55)]">
            {sample.time}
          </span>
        </div>
        <div className="mt-0.5 truncate text-xs text-[rgba(245,241,230,0.62)]">
          {sample.preview}
        </div>
      </div>
    </li>
  );
}

function InboxMockup() {
  return (
    <div className="rounded-2xl border border-[rgba(245,241,230,0.14)] bg-[rgba(7,34,27,0.55)] overflow-hidden max-w-[480px]">
      <div className="px-4 py-3 border-b border-[rgba(245,241,230,0.1)] flex items-center justify-between">
        <div className="text-sm font-semibold text-[#F5F1E6]">Inbox</div>
        <div className="text-[11px] text-[rgba(245,241,230,0.55)]">
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

function ListingTile({ sample }: { sample: Sample }) {
  const { listing } = sample;
  return (
    <div className="group block">
      <div
        className={cn(
          "relative rounded-xl overflow-hidden bg-gradient-to-br",
          listing.image
        )}
        style={{ aspectRatio: "4 / 3" }}
      >
        {/* Heart icon — non-functional, just visual parity */}
        <div className="absolute top-3 right-3 z-10 text-white/85 drop-shadow">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6"
            aria-hidden
          >
            <path d="M12 21s-7.5-4.6-7.5-10.4A4.6 4.6 0 0 1 12 6.5a4.6 4.6 0 0 1 7.5 4.1C19.5 16.4 12 21 12 21Z" opacity="0.4" />
          </svg>
        </div>

        {/* Trust pill — micro size, on white chip overlay */}
        <div className="absolute bottom-3 left-3 z-10">
          <TrustBadgeSandboxPill size="micro" sample={sample} onImage />
        </div>
      </div>

      <div className="mt-3 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="!text-sm !font-semibold !leading-tight text-[#F5F1E6] tracking-normal line-clamp-1">
            {listing.location}
          </h4>
          {sample.rating !== null && sample.reviewCount > 0 && (
            <div className="flex shrink-0 items-center gap-1 text-xs">
              <Star
                className="h-3 w-3 text-[#F5F1E6]"
                fill="currentColor"
              />
              <span className="font-medium text-[#F5F1E6]">
                {sample.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
        <p className="text-xs text-[rgba(245,241,230,0.62)] line-clamp-1">
          {listing.title}
        </p>
        <p className="pt-1 text-sm">
          <span className="font-semibold text-[#F5F1E6]">${listing.price}</span>
          <span className="text-[rgba(245,241,230,0.62)]"> night</span>
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

function HostRow({ sample }: { sample: Sample }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[rgba(245,241,230,0.12)] bg-[rgba(7,34,27,0.5)] p-4">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[rgba(245,241,230,0.12)] text-base font-semibold text-[#F5F1E6]">
        {sample.initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h4 className="!text-base !font-semibold !leading-tight text-[#F5F1E6] tracking-normal">
            Hosted by {sample.name}
          </h4>
        </div>
        <div className="mt-2">
          <TrustBadgeSandboxPill size="medium" sample={sample} />
        </div>
        <div className="mt-1 text-[11px] text-[rgba(245,241,230,0.55)]">
          {sample.archetype}
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
            One badge, three sizes — each shown in the surface where it
            actually appears in the app. Pulls from the same FT-1 four-metric
            model (degree · connection · vouch · rating); detail collapses
            as the badge shrinks. Macro lives on the profile page and is out
            of scope for this round.
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
