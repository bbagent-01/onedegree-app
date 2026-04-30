// D3 LAYOUT SANDBOX — LANDING / VARIANT A
// ----------------------------------------------------------------
// Centered hero · 3-column value props · single strong CTA.
//
// HARD RULE: NO new functionality. Every element already exists in
// the live app today (invite-only positioning, vouch-based trust,
// sign-in flow). This is layout rearrangement + visual treatment
// only.
// ----------------------------------------------------------------

import Link from "next/link";

export const runtime = "edge";

const HERO = {
  eyebrow: "Invite-only",
  title: "Stay with people you trust.",
  sub:
    "Private home stays through trusted personal networks. Members vouch for the people they invite, so the network grows along real relationships.",
  ctaLabel: "I have an invite",
  ctaHref: "/sign-in",
};

const VALUE_PROPS = [
  {
    title: "Real-name vouches",
    body:
      "Every member is vouched for by name. No anonymous reviews — only first-degree references from people in your network.",
  },
  {
    title: "Hosts choose who sees what",
    body:
      "Listings are visible only to the degrees of trust each host opts into. You see the homes of people who already know your people.",
  },
  {
    title: "Built on relationships",
    body:
      "Search a city, find friends-of-friends with a spare room, and message them directly. Same trust, less of the platform.",
  },
];

const SOCIAL_PROOF = [
  {
    quote:
      "Found a place to stay in Mexico City through someone my college roommate vouches for. The whole stay felt like visiting a friend.",
    name: "Sample Member",
    context: "Brooklyn → Mexico City",
  },
  {
    quote:
      "I host less often than Airbnb, and I host the right people. The vouches do the screening for me.",
    name: "Sample Host",
    context: "Austin",
  },
];

export default function LandingAPage() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-12 lg:px-10">
      <SandboxBar />

      {/* Hero — centered */}
      <section className="mt-16 text-center">
        <span className="inline-block rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand">
          {HERO.eyebrow}
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl font-serif text-5xl leading-[1.05] text-foreground md:text-6xl">
          {HERO.title}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {HERO.sub}
        </p>
        <div className="mt-10 flex justify-center">
          <Link
            href={HERO.ctaHref}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:bg-primary/90"
          >
            {HERO.ctaLabel}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* Value props — 3-column grid */}
      <section className="mt-24">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {VALUE_PROPS.map((vp, i) => (
            <div
              key={vp.title}
              className="rounded-2xl border border-border bg-card/40 p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15 text-base font-semibold text-brand">
                {i + 1}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {vp.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {vp.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof — 2-up testimonials */}
      <section className="mt-24">
        <h2 className="font-serif text-3xl text-foreground">
          From members
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {SOCIAL_PROOF.map((s) => (
            <figure
              key={s.name}
              className="rounded-2xl border border-border bg-card/40 p-6"
            >
              <blockquote className="text-base leading-relaxed text-foreground">
                &ldquo;{s.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{s.name}</span>
                {" · "}
                {s.context}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Closing CTA — same single CTA, repeated */}
      <section className="mt-24 rounded-2xl border border-brand/30 bg-brand/10 p-10 text-center">
        <h2 className="font-serif text-3xl text-foreground">
          Got an invite link?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Open it directly — your token is already in there. We&rsquo;ll
          finish setting you up.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href={HERO.ctaHref}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:bg-primary/90"
          >
            {HERO.ctaLabel}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
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
