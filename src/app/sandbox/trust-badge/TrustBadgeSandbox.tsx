"use client";

// Trust badge sandbox — design exploration only.
//
// Edit `SAMPLE_PROFILES` below to retune scores and see all 3 variants
// react in lock-step. Edit `VARIANT_COPY` to tweak the row labels.
// Tooltips open on hover (desktop) and on click/tap (everywhere) so
// touch users can explore without hover.

import { useState, useId } from "react";

// ── Sample data ───────────────────────────────────────────────────
// 6 edge-case profiles. `composite` is null when we don't have one
// (degree-only, cold-start). `degreeLabel` is what variant A shows in
// the halo; the numeric `degree` field is the composite-input score.

type VouchChain = {
  via: string;
  hops: number;
  type: "stayed" | "lived" | "worked" | "knew";
  yearsKnown: number;
};

type Profile = {
  id: string;
  name: string;
  archetype: string;
  // Sub-metrics that feed the composite (0–100)
  degree: number | null;
  connection: number | null;
  vouch: number | null;
  rating: number | null; // 0–5
  // Display-only fields
  degreeLabel: string; // "1°" / "2°" / "5° via 3 chains" / "—"
  composite: number | null; // null for degree-only / cold-start
  vouchChains: VouchChain[];
  // Cold-start sentinel (changes copy in tooltips + enumeration)
  isColdStart?: boolean;
};

const SAMPLE_PROFILES: Profile[] = [
  {
    id: "degree-only",
    name: "Theo R.",
    archetype: "degree-only (4°+)",
    degree: null,
    connection: null,
    vouch: null,
    rating: null,
    degreeLabel: "5°",
    composite: null,
    vouchChains: [
      { via: "Mira → Sasha → Ruth", hops: 5, type: "knew", yearsKnown: 3 },
      { via: "Jonah → Lin → Pete", hops: 5, type: "stayed", yearsKnown: 2 },
      { via: "Ben → Dev → Cole", hops: 5, type: "worked", yearsKnown: 1 },
    ],
  },
  {
    id: "composite-1deg",
    name: "Maya L.",
    archetype: "composite · 1° · top tier",
    degree: 100,
    connection: 95,
    vouch: 98,
    rating: 4.9,
    degreeLabel: "1°",
    composite: 97,
    vouchChains: [
      { via: "Direct (Loren)", hops: 1, type: "lived", yearsKnown: 9 },
      { via: "Direct (Sam)", hops: 1, type: "stayed", yearsKnown: 5 },
      { via: "Direct (Eli)", hops: 1, type: "worked", yearsKnown: 7 },
    ],
  },
  {
    id: "composite-2deg",
    name: "Aki N.",
    archetype: "composite · 2° · solid",
    degree: 92,
    connection: 75,
    vouch: 88,
    rating: 4.7,
    degreeLabel: "2°",
    composite: 84,
    vouchChains: [
      { via: "Maya → Aki", hops: 2, type: "stayed", yearsKnown: 4 },
      { via: "Sam → Aki", hops: 2, type: "knew", yearsKnown: 3 },
    ],
  },
  {
    id: "composite-3deg",
    name: "Robin K.",
    archetype: "composite · 3° · weaker",
    degree: 68,
    connection: 55,
    vouch: 60,
    rating: 4.2,
    degreeLabel: "3°",
    composite: 61,
    vouchChains: [
      { via: "Maya → Aki → Robin", hops: 3, type: "knew", yearsKnown: 2 },
      { via: "Eli → Pat → Robin", hops: 3, type: "worked", yearsKnown: 1 },
    ],
  },
  {
    id: "cold-start",
    name: "Jules P.",
    archetype: "cold-start (brand new)",
    degree: null,
    connection: null,
    vouch: null,
    rating: null,
    degreeLabel: "—",
    composite: null,
    vouchChains: [],
    isColdStart: true,
  },
  {
    id: "penalized",
    name: "Drew M.",
    archetype: "penalized (low rating)",
    degree: 80,
    connection: 70,
    vouch: 65,
    rating: 2.8,
    degreeLabel: "2°",
    composite: 56,
    vouchChains: [
      { via: "Maya → Drew", hops: 2, type: "stayed", yearsKnown: 4 },
      { via: "Sam → Drew", hops: 2, type: "worked", yearsKnown: 6 },
    ],
  },
];

// ── Shared helpers ────────────────────────────────────────────────

function compositeTone(score: number | null): {
  ring: string;
  text: string;
  band: string;
} {
  if (score === null)
    return {
      ring: "rgba(245,241,230,0.25)",
      text: "rgba(245,241,230,0.55)",
      band: "neutral",
    };
  if (score >= 85) return { ring: "#4FB191", text: "#BFE2D4", band: "solid" };
  if (score >= 70) return { ring: "#2A8A6B", text: "#BFE2D4", band: "building" };
  if (score >= 55) return { ring: "#FBBF24", text: "#FBBF24", band: "watch" };
  return { ring: "#FB923C", text: "#FB923C", band: "low" };
}

function degreeTone(label: string): string {
  if (label === "1°") return "var(--tt-degree-1)";
  if (label === "2°") return "var(--tt-degree-2)";
  if (label === "3°") return "var(--tt-degree-3)";
  if (label === "—") return "var(--tt-degree-none)";
  return "var(--tt-degree-4)"; // 4°, 5°, etc.
}

function bandLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 85) return "Solid";
  if (score >= 70) return "Building";
  if (score >= 55) return "Watch";
  return "Low";
}

// ── Tooltip / popover (shared across variants) ────────────────────

function MetricsPopover({ profile }: { profile: Profile }) {
  if (profile.isColdStart) {
    return (
      <div className="absolute z-30 left-1/2 top-full mt-3 -translate-x-1/2 w-[220px] rounded-xl border border-[rgba(245,241,230,0.16)] bg-[#0B2E25] p-3 text-xs shadow-2xl">
        <div className="font-semibold text-[#F5F1E6]">No data yet</div>
        <div className="mt-1 text-[rgba(245,241,230,0.62)] leading-snug">
          New to Trustead. Invite a friend to vouch and start a chain.
        </div>
      </div>
    );
  }
  if (profile.composite === null) {
    return (
      <div className="absolute z-30 left-1/2 top-full mt-3 -translate-x-1/2 w-[240px] rounded-xl border border-[rgba(245,241,230,0.16)] bg-[#0B2E25] p-3 text-xs shadow-2xl">
        <div className="font-semibold text-[#F5F1E6]">
          Degree-only ({profile.degreeLabel})
        </div>
        <div className="mt-1 text-[rgba(245,241,230,0.62)] leading-snug">
          Too far in the network for a composite score. Reachable through{" "}
          {profile.vouchChains.length} chain
          {profile.vouchChains.length === 1 ? "" : "s"}.
        </div>
      </div>
    );
  }
  return (
    <div className="absolute z-30 left-1/2 top-full mt-3 -translate-x-1/2 w-[240px] rounded-xl border border-[rgba(245,241,230,0.16)] bg-[#0B2E25] p-3 text-xs shadow-2xl">
      <div className="flex items-baseline justify-between">
        <div className="font-semibold text-[#F5F1E6]">{profile.name}</div>
        <div className="font-mono text-[11px] text-[rgba(245,241,230,0.62)]">
          {profile.degreeLabel} · {bandLabel(profile.composite)}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-y-1.5 gap-x-3">
        <MetricRow label="Degree" value={profile.degree} />
        <MetricRow label="Connection" value={profile.connection} />
        <MetricRow label="Vouch" value={profile.vouch} />
        <MetricRow
          label="Rating"
          value={profile.rating}
          format={(v) => v.toFixed(1)}
          warn={(v) => v < 3.5}
        />
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  format,
  warn,
}: {
  label: string;
  value: number | null;
  format?: (v: number) => string;
  warn?: (v: number) => boolean;
}) {
  const display =
    value === null ? "—" : format ? format(value) : Math.round(value).toString();
  const isWarn = value !== null && warn?.(value);
  return (
    <div className="flex items-center justify-between">
      <div className="text-[rgba(245,241,230,0.62)]">{label}</div>
      <div
        className="font-mono"
        style={{ color: isWarn ? "#FB923C" : "#F5F1E6" }}
      >
        {display}
      </div>
    </div>
  );
}

// ── Hover/click wrapper for tooltips ──────────────────────────────

function BadgeWithPopover({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div
      className="relative inline-flex flex-col items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#4FB191]"
        onClick={() => setOpen((v) => !v)}
      >
        {children}
      </button>
      {open && (
        <div id={id} role="tooltip">
          <MetricsPopover profile={profile} />
        </div>
      )}
    </div>
  );
}

// ── Variant A: composite primary, degree halo ────────────────────

function VariantA({ profile }: { profile: Profile }) {
  const tone = compositeTone(profile.composite);
  const ringColor = degreeTone(profile.degreeLabel);
  return (
    <BadgeWithPopover profile={profile}>
      <div className="relative h-[88px] w-[88px]">
        {/* Outer halo = degree band */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(${ringColor} 0deg 360deg)`,
            opacity: 0.85,
          }}
          aria-hidden
        />
        {/* Inner well */}
        <div className="absolute inset-[6px] rounded-full bg-[#07221B] flex flex-col items-center justify-center">
          <div
            className="font-mono text-2xl font-semibold leading-none"
            style={{ color: tone.text }}
          >
            {profile.composite ?? "—"}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-[rgba(245,241,230,0.62)]">
            {profile.degreeLabel}
          </div>
        </div>
      </div>
      <div className="mt-2 text-xs text-[rgba(245,241,230,0.78)] truncate max-w-[120px]">
        {profile.name}
      </div>
    </BadgeWithPopover>
  );
}

// ── Variant B: four-quadrant tile ────────────────────────────────

function VariantB({ profile }: { profile: Profile }) {
  const items: Array<{
    label: string;
    value: number | null;
    format?: (v: number) => string;
  }> = [
    { label: "Degree", value: profile.degree },
    { label: "Connection", value: profile.connection },
    { label: "Vouch", value: profile.vouch },
    { label: "Rating", value: profile.rating, format: (v) => v.toFixed(1) },
  ];
  return (
    <BadgeWithPopover profile={profile}>
      <div className="grid grid-cols-2 grid-rows-2 gap-px h-[104px] w-[132px] rounded-xl overflow-hidden bg-[rgba(245,241,230,0.14)]">
        {items.map((it) => {
          const tone =
            it.label === "Rating" && it.value !== null && it.value < 3.5
              ? "#FB923C"
              : it.value === null
                ? "rgba(245,241,230,0.45)"
                : "#F5F1E6";
          const display =
            it.value === null
              ? "—"
              : it.format
                ? it.format(it.value)
                : Math.round(it.value).toString();
          return (
            <div
              key={it.label}
              className="bg-[#0B2E25] flex flex-col items-center justify-center px-1"
            >
              <div
                className="font-mono text-lg font-semibold leading-none"
                style={{ color: tone }}
              >
                {display}
              </div>
              <div className="mt-1 text-[9px] uppercase tracking-wider text-[rgba(245,241,230,0.55)]">
                {it.label}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-[rgba(245,241,230,0.78)] truncate max-w-[120px]">
        {profile.name}
      </div>
    </BadgeWithPopover>
  );
}

// ── Variant C: minimalist single number ──────────────────────────

function VariantC({ profile }: { profile: Profile }) {
  const tone = compositeTone(profile.composite);
  const display = profile.composite ?? "—";
  return (
    <BadgeWithPopover profile={profile}>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(245,241,230,0.18)] bg-[rgba(245,241,230,0.04)]">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: tone.ring }}
          aria-hidden
        />
        <span
          className="font-mono text-base font-semibold leading-none"
          style={{ color: tone.text }}
        >
          {display}
        </span>
        <span className="font-mono text-[11px] text-[rgba(245,241,230,0.55)]">
          {profile.degreeLabel}
        </span>
      </div>
      <div className="mt-2 text-xs text-[rgba(245,241,230,0.78)] truncate max-w-[120px]">
        {profile.name}
      </div>
    </BadgeWithPopover>
  );
}

// ── Variant row ──────────────────────────────────────────────────

const VARIANT_COPY = [
  {
    key: "A",
    title: "A — Composite primary, degree halo",
    note:
      "One bold number with a colored ring that encodes how close the connection is. Ring tone steps from 1° → 4°+.",
    Component: VariantA,
  },
  {
    key: "B",
    title: "B — Four-quadrant tile",
    note:
      "All four sub-metrics visible at a glance. No composite — the reader does their own weighting. Rating goes amber when < 3.5.",
    Component: VariantB,
  },
  {
    key: "C",
    title: "C — Minimalist pill",
    note:
      "One number, one dot, one degree label. Hover/tap to expand the breakdown. Highest density for list views.",
    Component: VariantC,
  },
] as const;

function VariantRow({
  title,
  note,
  Component,
}: {
  title: string;
  note: string;
  Component: (props: { profile: Profile }) => React.ReactElement;
}) {
  return (
    <section className="rounded-2xl border border-[rgba(245,241,230,0.14)] bg-[rgba(7,34,27,0.55)] p-5 sm:p-6">
      <header className="mb-4">
        <h3 className="!text-base !font-semibold text-[#F5F1E6] tracking-normal">
          {title}
        </h3>
        <p className="mt-1 text-xs text-[rgba(245,241,230,0.62)] leading-snug max-w-3xl">
          {note}
        </p>
      </header>
      <div className="grid gap-x-4 gap-y-6 grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 sm:[&>*]:justify-self-center">
        {SAMPLE_PROFILES.map((p) => (
          <div
            key={p.id}
            className="flex flex-col items-center gap-1.5 min-w-0"
          >
            <Component profile={p} />
            <div className="text-[10px] uppercase tracking-wider text-[rgba(245,241,230,0.45)] text-center">
              {p.archetype}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Trust-detail enumeration view ────────────────────────────────

function VouchChainRow({ chain }: { chain: VouchChain }) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-3 py-2 border-b border-[rgba(245,241,230,0.08)] last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm text-[#F5F1E6] truncate">{chain.via}</div>
        <div className="text-[11px] text-[rgba(245,241,230,0.55)] mt-0.5">
          {chain.type} · {chain.yearsKnown} yr
          {chain.yearsKnown === 1 ? "" : "s"} known
        </div>
      </div>
      <div className="font-mono text-[11px] text-[rgba(245,241,230,0.62)] whitespace-nowrap">
        {chain.hops} hop{chain.hops === 1 ? "" : "s"}
      </div>
    </li>
  );
}

function EnumerationCard({ profile }: { profile: Profile }) {
  return (
    <div className="rounded-xl border border-[rgba(245,241,230,0.14)] bg-[rgba(7,34,27,0.5)] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#F5F1E6] truncate">
            {profile.name}
          </div>
          <div className="text-[11px] text-[rgba(245,241,230,0.55)] mt-0.5">
            {profile.archetype}
          </div>
        </div>
        <div className="font-mono text-[11px] text-[rgba(245,241,230,0.62)] whitespace-nowrap">
          {profile.degreeLabel}
          {profile.composite !== null ? ` · ${profile.composite}` : ""}
        </div>
      </div>
      <div className="mt-3">
        {profile.isColdStart || profile.vouchChains.length === 0 ? (
          <div className="text-xs text-[rgba(245,241,230,0.62)] leading-snug py-2">
            No vouches yet — invite a friend to vouch for you.
          </div>
        ) : (
          <ul className="m-0 p-0 list-none">
            {profile.vouchChains.map((c, i) => (
              <VouchChainRow key={i} chain={c} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Page shell ───────────────────────────────────────────────────

export function TrustBadgeSandbox() {
  return (
    <div className="min-h-screen bg-[var(--tt-body-bg)] text-[#F5F1E6] py-10 sm:py-14">
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <header className="mb-8 sm:mb-10">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[rgba(245,241,230,0.55)]">
            Trustead · sandbox
          </div>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl text-[#F5F1E6]">
            Trust badge variants
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[rgba(245,241,230,0.78)] leading-relaxed">
            Three ways to render the same four signals — degree, connection,
            vouch, rating. Hover or tap any badge to see the full breakdown.
            Below the grid: the same six profiles as a full trust-detail
            enumeration, so you can compare badge-as-summary against
            full-disclosure side by side.
          </p>
        </header>

        <div className="space-y-6">
          {VARIANT_COPY.map((v) => (
            <VariantRow
              key={v.key}
              title={v.title}
              note={v.note}
              Component={v.Component}
            />
          ))}
        </div>

        <section className="mt-12">
          <header className="mb-4">
            <h2 className="!text-2xl !leading-tight text-[#F5F1E6]">
              Trust-detail enumeration
            </h2>
            <p className="mt-2 max-w-2xl text-xs text-[rgba(245,241,230,0.62)] leading-snug">
              Every vouch chain rendered as its own row. This is the
              full-disclosure view that lives behind the badge — same six
              profiles, no summary score.
            </p>
          </header>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {SAMPLE_PROFILES.map((p) => (
              <EnumerationCard key={p.id} profile={p} />
            ))}
          </div>
        </section>

        <footer className="mt-12 text-[11px] text-[rgba(245,241,230,0.45)]">
          Sandbox only · no DB · sample data lives in
          <span className="font-mono ml-1">SAMPLE_PROFILES</span>
        </footer>
      </div>
    </div>
  );
}
