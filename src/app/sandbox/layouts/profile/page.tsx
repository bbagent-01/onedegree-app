// D3 LAYOUT SANDBOX — PROFILE (replica of /profile/[id])
// ----------------------------------------------------------------
// Member profile — header card with avatar + trust path, About,
// listings grid, recent reviews, vouch counts. Rendered in
// "viewing-someone-else" mode (the more common case for browsing).
// ----------------------------------------------------------------

import Link from "next/link";
import {
  CheckCircle2,
  MapPin,
  Briefcase,
  Languages,
  ShieldCheck,
  MessageCircle,
  Star,
} from "lucide-react";

export const runtime = "edge";

const PROFILE = {
  name: "Maya Reyes",
  avatar: "https://picsum.photos/seed/maya-r/200/200",
  memberSince: "March 2025",
  location: "Park Slope, Brooklyn",
  occupation: "Architect",
  languages: ["English", "Spanish"],
  phoneVerified: true,
  bio: "Architect, weekend gardener, occasional host. I host because my own best travel memories were nights in friends' spare rooms. Two kids, one cat, plenty of plants.",
  trust: {
    label: "1° via Erin Q.",
    score: 84,
    degreeAvg: "1°",
    mutualConnections: 3,
  },
  vouchPower: 1.42,
  vouchesGiven: 18,
  vouchesReceived: 11,
  hostRating: 4.91,
  hostReviews: 23,
};

const LISTINGS = [
  {
    id: "1",
    title: "Sunlit brownstone garden floor",
    area: "Park Slope, Brooklyn",
    price: 145,
    photo: "https://picsum.photos/seed/brklyn-1/600/450",
  },
];

const PROPOSALS = [
  {
    kind: "Host Offer",
    title: "Garden floor open over July 4th — friends-of-friends only",
    dates: "Jul 04 → 08",
    ago: "5 days ago",
  },
];

const REVIEWS_OF = [
  {
    by: "Erin Q.",
    date: "Apr 02, 2026",
    rating: 5,
    body:
      "Maya was such a generous host. The brownstone was even better than the photos. Felt like staying with an old friend.",
  },
  {
    by: "Aliyah J.",
    date: "Mar 26, 2026",
    rating: 5,
    body:
      "Quiet block, clean space, and Maya checks in just enough without hovering. Will absolutely come back.",
  },
];

export default function ProfilePage() {
  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 py-6 md:px-6 md:py-10">
      {/* Header */}
      <section className="flex flex-col items-start gap-6 rounded-2xl border border-border bg-card/40 p-6 md:flex-row md:items-center md:p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PROFILE.avatar}
          alt={PROFILE.name}
          className="h-28 w-28 rounded-full object-cover md:h-32 md:w-32"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
            {PROFILE.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Member since {PROFILE.memberSince}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <InfoChip icon={MapPin} label={PROFILE.location} />
            <InfoChip icon={Briefcase} label={PROFILE.occupation} />
            <InfoChip
              icon={Languages}
              label={`Speaks ${PROFILE.languages.join(", ")}`}
            />
            {PROFILE.phoneVerified && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Phone verified
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/40 px-4 py-2 text-sm font-semibold text-foreground hover:bg-card/60">
            <ShieldCheck className="h-4 w-4" />
            Vouch for {PROFILE.name.split(" ")[0]}
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <MessageCircle className="h-4 w-4" />
            Message
          </button>
        </div>
      </section>

      {/* Trust */}
      <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-brand/30 bg-brand p-5 text-brand-foreground">
          <p className="text-xs font-medium uppercase tracking-wider opacity-80">
            Connection
          </p>
          <p className="mt-2 font-serif text-3xl">{PROFILE.trust.label}</p>
          <p className="mt-1 text-xs opacity-80">
            {PROFILE.trust.mutualConnections} mutual connection
            {PROFILE.trust.mutualConnections === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Vouches received
          </p>
          <p className="mt-2 font-serif text-3xl text-foreground">
            {PROFILE.vouchesReceived}
          </p>
          <p className="mt-1 text-xs text-subtle">
            Vouch power {PROFILE.vouchPower.toFixed(2)}× ·{" "}
            {PROFILE.vouchesGiven} given
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Host rating
          </p>
          <p className="mt-2 inline-flex items-baseline gap-1 font-serif text-3xl text-foreground">
            {PROFILE.hostRating.toFixed(2)}
            <Star className="h-4 w-4 fill-current" />
          </p>
          <p className="mt-1 text-xs text-subtle">
            {PROFILE.hostReviews} reviews
          </p>
        </div>
      </section>

      {/* About */}
      <Section title="About">
        <p className="text-sm leading-6 text-foreground">{PROFILE.bio}</p>
      </Section>

      {/* Listings */}
      <Section title={`${PROFILE.name.split(" ")[0]}'s listings`}>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {LISTINGS.map((l) => (
            <Link
              key={l.id}
              href="/sandbox/layouts/listing"
              className="group block"
            >
              <div className="overflow-hidden rounded-xl bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={l.photo}
                  alt={l.title}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="mt-2">
                <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
                  {l.area}
                </h3>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {l.title}
                </p>
                <p className="mt-1 text-sm text-foreground">
                  <span className="font-semibold">${l.price}</span>
                  <span className="text-muted-foreground"> / night</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* Proposals */}
      <Section title={`${PROFILE.name.split(" ")[0]}'s proposals`}>
        <ul className="space-y-3">
          {PROPOSALS.map((p) => (
            <li
              key={p.title}
              className="rounded-2xl border border-border bg-card/40 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand">
                  {p.kind}
                </span>
                <span className="text-xs text-subtle">{p.ago}</span>
              </div>
              <h3 className="mt-2 text-sm font-semibold text-foreground">
                {p.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{p.dates}</p>
            </li>
          ))}
        </ul>
        <Link
          href="/sandbox/layouts/proposals"
          className="mt-3 inline-flex text-sm font-semibold text-foreground hover:underline"
        >
          See all →
        </Link>
      </Section>

      {/* Reviews */}
      <Section title="Reviews">
        <div className="flex gap-2">
          <button className="rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background">
            About {PROFILE.name.split(" ")[0]} · {REVIEWS_OF.length}
          </button>
          <button className="rounded-full border border-border bg-card/40 px-4 py-1.5 text-xs font-medium text-foreground hover:bg-card/60">
            Written by {PROFILE.name.split(" ")[0]} · 6
          </button>
        </div>
        <ul className="mt-4 space-y-3">
          {REVIEWS_OF.map((r, i) => (
            <li
              key={i}
              className="rounded-2xl border border-border bg-card/40 p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {r.by}
                  </p>
                  <span className="inline-flex items-center text-xs text-muted-foreground">
                    {Array.from({ length: r.rating }).map((_, n) => (
                      <Star
                        key={n}
                        className="h-3 w-3 fill-current text-foreground"
                      />
                    ))}
                  </span>
                </div>
                <span className="text-xs text-subtle">{r.date}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                &ldquo;{r.body}&rdquo;
              </p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function InfoChip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/40 px-3 py-1 text-xs font-medium text-foreground">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      {label}
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-foreground md:text-xl">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
