// D3 LAYOUT SANDBOX — DASHBOARD / VARIANT B
// ----------------------------------------------------------------
// Side-rail metrics · main column passive activity recap timeline ·
// calmer feel. No proactive prompts up top.
//
// HARD RULE: NO new functionality. Every element (proposals,
// upcoming stays, vouches given/received, trust badge, recent
// activity) already exists in the live app today. This is layout
// rearrangement + visual treatment only.
// ----------------------------------------------------------------

import Link from "next/link";

export const runtime = "edge";

const USER = {
  firstName: "Sample",
  trust: { score: 84, label: "Solid", degreeAvg: "1.7°" },
};

const METRICS = [
  { label: "Active proposals", value: 2, sub: "1 awaiting host reply" },
  { label: "Upcoming stays", value: 1, sub: "Brooklyn · in 12 days" },
  { label: "Vouches given", value: 5, sub: "5 in last 90 days" },
  { label: "Vouches received", value: 5, sub: "+1 this week" },
];

const RECAP = [
  {
    when: "Yesterday",
    icon: "✉",
    title: "Maya R. countered your Brooklyn proposal",
    sub: "May 14 → 16 · countered $145/night",
  },
  {
    when: "2 days ago",
    icon: "✿",
    title: "Maya R. vouched for you",
    sub: "Said: trusted house guest",
  },
  {
    when: "3 days ago",
    icon: "→",
    title: "You sent a proposal to Diego M.",
    sub: "Roma Norte · Jun 02 → 07",
  },
  {
    when: "Last week",
    icon: "✓",
    title: "Booking confirmed — Brooklyn",
    sub: "Stay starts in 12 days",
  },
  {
    when: "Last week",
    icon: "✿",
    title: "You vouched for Erin Q.",
    sub: "College roommate",
  },
  {
    when: "Apr 03",
    icon: "✿",
    title: "Sofía A. vouched for you",
    sub: "Said: longtime friend",
  },
];

const PROPOSALS = [
  {
    host: "Maya R.",
    listing: "Sunlit brownstone garden floor",
    city: "Brooklyn, NY",
    status: "Counter from host",
    dates: "May 14 → 16",
  },
  {
    host: "Diego M.",
    listing: "Roma Norte courtyard apartment",
    city: "Mexico City, MX",
    status: "Awaiting host",
    dates: "Jun 02 → 07",
  },
];

const UPCOMING = {
  host: "Maya R.",
  listing: "Sunlit brownstone garden floor",
  city: "Brooklyn, NY",
  dates: "May 14 → 16 (in 12 days)",
};

const VOUCHES_GIVEN = [
  { name: "Erin Q.", relation: "College roommate" },
  { name: "Dev S.", relation: "Worked together at Studio" },
  { name: "Renata V.", relation: "Friend from book club" },
  { name: "Theo L.", relation: "Climbing partner" },
  { name: "Aliyah J.", relation: "Old neighbor" },
];

const VOUCHES_RECEIVED = [
  { name: "Maya R.", relation: "Said: trusted house guest" },
  { name: "Sofía A.", relation: "Said: longtime friend" },
  { name: "Jonas T.", relation: "Said: thoughtful traveler" },
  { name: "Priya K.", relation: "Said: easygoing & clean" },
  { name: "Diego M.", relation: "Said: would host again" },
];

export default function DashboardBPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-10 lg:px-10">
      <SandboxBar />

      <div className="mt-6">
        <h1 className="font-serif text-4xl text-foreground md:text-5xl">
          Welcome back, {USER.firstName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your dashboard for hosting, traveling, and your trust network.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Side rail — metrics + trust badge */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-brand/30 bg-brand p-5 text-brand-foreground">
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">
              Trust score
            </p>
            <p className="mt-2 font-serif text-5xl">{USER.trust.score}</p>
            <p className="mt-1 text-xs opacity-80">
              {USER.trust.label} · avg {USER.trust.degreeAvg}
            </p>
            <Link
              href="/profile"
              className="mt-3 inline-flex text-xs underline decoration-brand-foreground/40 underline-offset-4 hover:decoration-brand-foreground"
            >
              See trust profile →
            </Link>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card/40 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              At a glance
            </p>
            {METRICS.map((m) => (
              <div
                key={m.label}
                className="flex items-baseline justify-between gap-3 border-t border-border/60 pt-3 first:border-t-0 first:pt-0"
              >
                <div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-[10px] text-subtle">{m.sub}</p>
                </div>
                <p className="font-serif text-2xl text-foreground">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Upcoming sticky-ish card */}
          <div className="rounded-2xl border border-border bg-card/40 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Next up
            </p>
            <h3 className="mt-2 text-sm font-semibold text-foreground">
              {UPCOMING.listing}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {UPCOMING.city} · {UPCOMING.host}
            </p>
            <p className="mt-2 text-xs font-medium text-brand">
              {UPCOMING.dates}
            </p>
          </div>
        </aside>

        {/* Main column — passive recap + supporting sections */}
        <div className="space-y-10">
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-2xl text-foreground">
                Recent activity
              </h2>
              <Link
                href="/inbox"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Open inbox →
              </Link>
            </div>
            <ol className="relative mt-5 space-y-5 border-l border-border/70 pl-6">
              {RECAP.map((r, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[33px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-[11px] text-foreground">
                    {r.icon}
                  </span>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-subtle">
                    {r.when}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-foreground">
                    {r.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.sub}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">
              Active proposals
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {PROPOSALS.map((p) => (
                <div
                  key={p.listing}
                  className="rounded-2xl border border-border bg-card/40 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      {p.listing}
                    </h3>
                    <span
                      className={
                        p.status === "Counter from host"
                          ? "shrink-0 rounded-full bg-warning/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning"
                          : "shrink-0 rounded-full bg-brand/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand"
                      }
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.city} · Hosted by {p.host}
                  </p>
                  <p className="mt-2 text-xs text-subtle">{p.dates}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <VouchPanel
              title="Vouches given"
              rows={VOUCHES_GIVEN}
              ctaLabel="Vouch someone"
              ctaHref="/vouch"
            />
            <VouchPanel
              title="Vouches received"
              rows={VOUCHES_RECEIVED}
              ctaLabel="Trust profile"
              ctaHref="/profile"
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function VouchPanel({
  title,
  rows,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  rows: { name: string; relation: string }[];
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-lg text-foreground">{title}</h3>
        <Link
          href={ctaHref}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {ctaLabel} →
        </Link>
      </div>
      <ul className="mt-3 divide-y divide-border/60">
        {rows.map((r) => (
          <li
            key={r.name}
            className="py-2.5 text-sm first:pt-0 last:pb-0"
          >
            <p className="font-medium text-foreground">{r.name}</p>
            <p className="text-xs text-muted-foreground">{r.relation}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SandboxBar() {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-warning">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" />
        Sample data — sandbox only
      </span>
      <Link
        href="/sandbox/layouts"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← All variants
      </Link>
    </div>
  );
}
