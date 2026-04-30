// D3 LAYOUT SANDBOX — VOUCH (replica of /vouch)
// ----------------------------------------------------------------
// Search-by-name flow that lets a member vouch for someone they
// trust. Funnels into invite if the person isn't on Trustead yet.
// ----------------------------------------------------------------

import Link from "next/link";
import {
  Search,
  Shield,
  UserCheck,
  UserPlus,
} from "lucide-react";

export const runtime = "edge";

const RESULTS = [
  {
    id: "1",
    name: "Erin Quinn",
    avatar: "https://picsum.photos/seed/erin-q/80/80",
    contact: "+1 (415) 555-0142 · erin@example.com",
    alreadyVouched: true,
  },
  {
    id: "2",
    name: "Erin Park",
    avatar: "https://picsum.photos/seed/erin-p/80/80",
    contact: "erin.park@example.com",
    alreadyVouched: false,
  },
  {
    id: "3",
    name: "Erin Salazar",
    avatar: "https://picsum.photos/seed/erin-s/80/80",
    contact: "+52 55 5555 0193",
    alreadyVouched: false,
  },
];

export default function VouchPage() {
  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-8 md:px-6 md:py-12">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Shield className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground md:text-3xl">
          Vouch for someone
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Search by name, email, or phone. If they&rsquo;re not on Trustead
          yet, you can invite them.
        </p>
      </div>

      <div className="relative mt-8">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          defaultValue="Erin"
          placeholder="Search by name, email, or phone…"
          className="h-14 w-full rounded-xl border-2 border-border bg-background/40 pl-11 pr-4 text-base font-medium text-foreground shadow-sm focus:border-brand focus:outline-none"
        />
      </div>

      {/* Results */}
      <div className="mt-4 divide-y divide-border/60 rounded-xl border border-border bg-card/40">
        {RESULTS.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 px-4 py-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r.avatar}
              alt={r.name}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-transparent transition-all hover:ring-brand/30"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {r.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {r.contact}
              </p>
            </div>
            {r.alreadyVouched ? (
              <button className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card/60">
                <UserCheck className="h-3.5 w-3.5" />
                Update vouch
              </button>
            ) : (
              <button className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                <Shield className="h-3.5 w-3.5" />
                Vouch
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Invite tail */}
      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Don&rsquo;t see who you&rsquo;re looking for?
        </p>
        <Link
          href="#"
          className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Invite them to join
        </Link>
      </div>
    </div>
  );
}
