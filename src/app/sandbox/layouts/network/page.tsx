// D3 LAYOUT SANDBOX — NETWORK (replica of /dashboard?tab=network)
// ----------------------------------------------------------------
// Vouch power, vouches given/received, pending invites, vouch-back
// prompts. Mirrors the live NetworkSection layout.
// ----------------------------------------------------------------

import Link from "next/link";
import {
  Shield,
  Star,
  UserPlus,
  Zap,
  Send,
  Clock,
} from "lucide-react";

export const runtime = "edge";

const STATS = {
  vouchPower: 1.42,
  avgGuestRating: 4.87,
  vouchesGiven: 5,
  vouchesReceived: 5,
};

const VOUCHES_RECEIVED = [
  {
    name: "Maya R.",
    relation: "Hosted me in Brooklyn",
    quote: "Trusted house guest. Would host again.",
    date: "Apr 18, 2026",
    yearsKnown: "1 year",
  },
  {
    name: "Sofía A.",
    relation: "Old friend from CDMX",
    quote: "Long-time friend. Thoughtful and respectful traveler.",
    date: "Apr 03, 2026",
    yearsKnown: "8 years",
  },
  {
    name: "Jonas T.",
    relation: "Hosted me in Austin",
    quote: "Easygoing, communicative, left the place spotless.",
    date: "Mar 22, 2026",
    yearsKnown: "1 year",
  },
];

const VOUCHES_GIVEN = [
  {
    name: "Erin Q.",
    relation: "College roommate",
    date: "Apr 02, 2026",
    yearsKnown: "10 years",
  },
  {
    name: "Dev S.",
    relation: "Worked together at Studio",
    date: "Mar 18, 2026",
    yearsKnown: "4 years",
  },
  {
    name: "Renata V.",
    relation: "Friend from book club",
    date: "Feb 27, 2026",
    yearsKnown: "3 years",
  },
];

const PENDING_INVITES = [
  { name: "Casey W.", email: "casey@example.com", sentAt: "Apr 24, 2026" },
  { name: "Beatriz F.", email: "bea@example.com", sentAt: "Apr 21, 2026" },
];

const VOUCH_BACK = [
  {
    name: "Priya K.",
    note: "vouched for you 3 days ago. Vouch back?",
  },
];

export default function NetworkPage() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 md:px-6 md:py-10">
      <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
        Your Network
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Vouches power what you can see and book on Trustead. Stronger network,
        more access.
      </p>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          icon={Zap}
          primary={`${STATS.vouchPower.toFixed(2)}×`}
          label="Vouch power"
          hint="Boosts the weight of every vouch you write. Derived from the avg guest rating of people you've vouched for."
        />
        <StatCard
          icon={Shield}
          primary={`${STATS.vouchesGiven} · ${STATS.vouchesReceived}`}
          label="Vouches given · received"
          hint="Track your network activity. Each vouch you receive raises your 1° score with everyone the voucher knows."
        />
        <StatCard
          icon={Star}
          primary={STATS.avgGuestRating.toFixed(2)}
          label="Avg guest rating"
          hint="Average rating across guests you've hosted. Drives your vouch power."
        />
      </div>

      {/* Vouch-back prompts */}
      {VOUCH_BACK.length > 0 && (
        <section className="mt-10 rounded-2xl border border-brand/30 bg-brand/10 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand">
            Vouch back
          </h2>
          <div className="mt-3 space-y-2">
            {VOUCH_BACK.map((v) => (
              <div
                key={v.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/30 p-4"
              >
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{v.name}</span> {v.note}
                </p>
                <button className="shrink-0 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                  Vouch back
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Vouches received */}
      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Vouches you&rsquo;ve received
          </h2>
          <span className="text-xs text-muted-foreground">
            {VOUCHES_RECEIVED.length} total
          </span>
        </div>
        <ul className="mt-4 space-y-3">
          {VOUCHES_RECEIVED.map((v) => (
            <li
              key={v.name}
              className="rounded-2xl border border-border bg-card/40 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {v.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {v.relation} · known {v.yearsKnown}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-subtle">{v.date}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                &ldquo;{v.quote}&rdquo;
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Vouches given */}
      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Vouches you&rsquo;ve given
          </h2>
          <Link
            href="/sandbox/layouts/vouch"
            className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background hover:bg-foreground/90"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Vouch for someone
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-border/60 rounded-2xl border border-border bg-card/40">
          {VOUCHES_GIVEN.map((v) => (
            <li
              key={v.name}
              className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
            >
              <div>
                <p className="font-semibold text-foreground">{v.name}</p>
                <p className="text-xs text-muted-foreground">
                  {v.relation} · known {v.yearsKnown}
                </p>
              </div>
              <span className="text-xs text-subtle">{v.date}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Pending invites */}
      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Pending invites
          </h2>
          <span className="text-xs text-muted-foreground">
            {PENDING_INVITES.length} sent
          </span>
        </div>
        <ul className="mt-4 divide-y divide-border/60 rounded-2xl border border-border bg-card/40">
          {PENDING_INVITES.map((p) => (
            <li
              key={p.email}
              className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/15 text-warning">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.email} · sent {p.sentAt}
                  </p>
                </div>
              </div>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card/60">
                <Send className="h-3 w-3" />
                Resend
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  primary,
  label,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  primary: string;
  label: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15 text-brand">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-4 font-serif text-3xl text-foreground">{primary}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-xs leading-relaxed text-subtle">{hint}</p>
    </div>
  );
}
