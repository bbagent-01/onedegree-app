// D3 LAYOUT SANDBOX — DASHBOARD / VARIANT A
// ----------------------------------------------------------------
// Top-of-page metric tiles · proactive "next steps" panel · sections
// stacked beneath. Pulls you toward action.
//
// HARD RULE: NO new functionality. Every element (proposals,
// upcoming stays, vouches given/received, trust badge, "next step"
// prompts) already exists in the live app today. This is layout
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

const NEXT_STEPS = [
  {
    title: "Reply to Maya — Brooklyn proposal",
    body: "Maya sent dates and a price counter yesterday. Reply to keep the request alive.",
    action: "Open proposal",
    href: "/proposals",
  },
  {
    title: "Confirm details for your Brooklyn trip",
    body: "Stay starts in 12 days. Check arrival window and add a phone for Maya.",
    action: "Review trip",
    href: "/trips",
  },
  {
    title: "Vouch for someone you'd recommend",
    body: "You've received 5 vouches and given 5. Keep the network growing — vouch for a friend.",
    action: "Vouch a friend",
    href: "/vouch",
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
  { name: "Erin Q.", relation: "College roommate", date: "Apr 02" },
  { name: "Dev S.", relation: "Worked together at Studio", date: "Mar 18" },
  { name: "Renata V.", relation: "Friend from book club", date: "Feb 27" },
  { name: "Theo L.", relation: "Climbing partner", date: "Feb 10" },
  { name: "Aliyah J.", relation: "Old neighbor", date: "Jan 22" },
];

const VOUCHES_RECEIVED = [
  { name: "Maya R.", relation: "Said: trusted house guest", date: "Apr 18" },
  { name: "Sofía A.", relation: "Said: longtime friend", date: "Apr 03" },
  { name: "Jonas T.", relation: "Said: thoughtful traveler", date: "Mar 22" },
  { name: "Priya K.", relation: "Said: easygoing & clean", date: "Mar 09" },
  { name: "Diego M.", relation: "Said: would host again", date: "Feb 28" },
];

export default function DashboardAPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-10 lg:px-10">
      <SandboxBar />

      {/* Header + trust badge */}
      <div className="mt-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-serif text-4xl text-foreground md:text-5xl">
            Welcome back, {USER.firstName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your dashboard for hosting, traveling, and your trust network.
          </p>
        </div>
        <TrustBadge />
      </div>

      {/* Metrics — top row */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {METRICS.map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-border bg-card/40 p-5"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {m.label}
            </p>
            <p className="mt-2 font-serif text-4xl text-foreground">
              {m.value}
            </p>
            <p className="mt-1 text-xs text-subtle">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Proactive next steps — emphasized */}
      <section className="mt-10 rounded-2xl border border-brand/30 bg-brand/10 p-6 md:p-8">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl text-foreground">
            What to do next
          </h2>
          <span className="text-xs font-medium uppercase tracking-wider text-brand">
            {NEXT_STEPS.length} prompts
          </span>
        </div>
        <div className="mt-5 space-y-3">
          {NEXT_STEPS.map((s, i) => (
            <div
              key={s.title}
              className="flex flex-col items-start gap-3 rounded-xl border border-border bg-background/30 p-4 md:flex-row md:items-center md:justify-between md:p-5"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-brand-foreground">
                  {i + 1}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              </div>
              <Link
                href={s.href}
                className="shrink-0 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {s.action} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Two-column section: proposals + upcoming */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card/40 p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-foreground">
              Active proposals
            </h2>
            <Link
              href="/proposals"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all →
            </Link>
          </div>
          <div className="mt-4 divide-y divide-border/60">
            {PROPOSALS.map((p) => (
              <div key={p.listing} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {p.listing}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {p.city} · Hosted by {p.host}
                    </p>
                    <p className="mt-1 text-xs text-subtle">{p.dates}</p>
                  </div>
                  <span
                    className={
                      p.status === "Counter from host"
                        ? "shrink-0 rounded-full bg-warning/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-warning"
                        : "shrink-0 rounded-full bg-brand/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand"
                    }
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card/40 p-6">
          <h2 className="font-serif text-xl text-foreground">Upcoming stay</h2>
          <div className="mt-4 rounded-xl border border-border bg-background/30 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              {UPCOMING.listing}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {UPCOMING.city} · Hosted by {UPCOMING.host}
            </p>
            <p className="mt-3 text-xs font-medium text-brand">
              {UPCOMING.dates}
            </p>
          </div>
          <Link
            href="/trips"
            className="mt-4 inline-flex text-xs text-muted-foreground hover:text-foreground"
          >
            All trips →
          </Link>
        </section>
      </div>

      {/* Vouches — given + received */}
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        <VouchPanel
          title="Vouches given"
          subtitle="People you've vouched for"
          rows={VOUCHES_GIVEN}
          ctaLabel="Vouch someone"
          ctaHref="/vouch"
        />
        <VouchPanel
          title="Vouches received"
          subtitle="People who vouch for you"
          rows={VOUCHES_RECEIVED}
          ctaLabel="See trust profile"
          ctaHref="/profile"
        />
      </div>
    </div>
  );
}

function VouchPanel({
  title,
  subtitle,
  rows,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  subtitle: string;
  rows: { name: string; relation: string; date: string }[];
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/40 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-xl text-foreground">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Link
          href={ctaHref}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {ctaLabel} →
        </Link>
      </div>
      <ul className="mt-4 divide-y divide-border/60">
        {rows.map((r) => (
          <li
            key={r.name}
            className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
          >
            <div>
              <p className="font-medium text-foreground">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.relation}</p>
            </div>
            <span className="shrink-0 text-xs text-subtle">{r.date}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TrustBadge() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-brand/30 bg-brand/10 p-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-base font-bold text-brand-foreground">
        {USER.trust.score}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Trust score
        </p>
        <p className="text-sm font-semibold text-foreground">
          {USER.trust.label} · avg {USER.trust.degreeAvg}
        </p>
      </div>
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
