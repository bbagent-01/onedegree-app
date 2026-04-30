// D3 LAYOUT SANDBOX — LANDING (current-state proposal)
// ----------------------------------------------------------------
// There's no live landing today (/ redirects to /browse). This
// replica uses the messaging from /join (the closest "current" copy
// in the live app) to render a public landing surface we can vary
// from. No new product features — every element corresponds to
// something the app does today (invite-only positioning, vouches,
// host-controlled visibility, sign-in funnel).
// ----------------------------------------------------------------

import Link from "next/link";
import { Lock, Shield, Users, Eye } from "lucide-react";

export const runtime = "edge";

const VALUE_PROPS = [
  {
    icon: Shield,
    title: "Real-name vouches",
    body:
      "Every member is vouched for by someone already on the platform. No anonymous reviews — only first-degree references from people in your network.",
  },
  {
    icon: Eye,
    title: "Hosts choose who sees what",
    body:
      "Listings are visible only to the degrees of trust each host opts into. You see the homes of people who already know your people.",
  },
  {
    icon: Users,
    title: "Built on relationships",
    body:
      "Search a city, find friends-of-friends with a spare room, and message them directly. Same trust, less of the platform.",
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-12 lg:px-10">
      {/* Hero */}
      <section className="mt-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand">
          <Lock className="h-3 w-3" />
          Invite-only
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl font-serif text-5xl leading-[1.05] text-foreground md:text-6xl">
          Stay with people you trust.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
          Private home stays through trusted personal networks. Members vouch
          for the people they invite, so the network grows along real
          relationships.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:bg-primary/90"
          >
            I have an invite
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="#how"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-transparent px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-card/40"
          >
            How it works
          </Link>
        </div>
      </section>

      {/* Value props */}
      <section id="how" className="mt-24">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {VALUE_PROPS.map((vp) => {
            const Icon = vp.icon;
            return (
              <div
                key={vp.title}
                className="rounded-2xl border border-border bg-card/40 p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15 text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {vp.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {vp.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mt-24 rounded-2xl border border-brand/30 bg-brand/10 p-10 text-center md:p-14">
        <h2 className="font-serif text-3xl text-foreground md:text-4xl">
          Got an invite link?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground md:text-base">
          Open it directly — your token is already in there. We&rsquo;ll
          finish setting you up.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:bg-primary/90"
          >
            I have an invite
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-transparent px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-card/60"
          >
            Already a member? Sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
