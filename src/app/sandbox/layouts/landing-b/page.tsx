// D3 LAYOUT SANDBOX — LANDING / VARIANT B
// ----------------------------------------------------------------
// Split hero (text left + visual right) · vertical stacked value
// props with iconography · primary + secondary CTA.
//
// HARD RULE: NO new functionality. Every element already exists in
// the live app today. This is layout rearrangement + visual
// treatment only.
// ----------------------------------------------------------------

import Link from "next/link";

export const runtime = "edge";

const HERO = {
  eyebrow: "Invite-only · trusted networks",
  title: "Stay with people you trust.",
  sub:
    "Private home stays through trusted personal networks. Members vouch for the people they invite, so the network grows along real relationships.",
  primary: { label: "I have an invite", href: "/sign-in" },
  secondary: { label: "How it works", href: "#how" },
  visual:
    "https://picsum.photos/seed/trustead-hero/900/700",
};

const VALUE_PROPS = [
  {
    glyph: "⌘",
    title: "Real-name vouches",
    body:
      "Every member is vouched for by name. No anonymous reviews — only first-degree references from people in your network.",
  },
  {
    glyph: "◉",
    title: "Hosts choose who sees what",
    body:
      "Listings are visible only to the degrees of trust each host opts into. You see the homes of people who already know your people.",
  },
  {
    glyph: "✦",
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

export default function LandingBPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-12 lg:px-10">
      <SandboxBar />

      {/* Hero — split: text left, visual right */}
      <section className="mt-12 grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
        <div>
          <span className="inline-block rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand">
            {HERO.eyebrow}
          </span>
          <h1 className="mt-6 font-serif text-5xl leading-[1.05] text-foreground md:text-6xl">
            {HERO.title}
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
            {HERO.sub}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={HERO.primary.href}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:bg-primary/90"
            >
              {HERO.primary.label}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href={HERO.secondary.href}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-transparent px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-card/40"
            >
              {HERO.secondary.label}
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 -z-0 translate-x-3 translate-y-3 rounded-3xl bg-brand/30" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO.visual}
            alt="Sample home"
            className="relative aspect-[4/5] w-full rounded-3xl object-cover shadow-modal"
          />
        </div>
      </section>

      {/* Value props — vertical stack with iconography */}
      <section id="how" className="mt-28">
        <h2 className="font-serif text-3xl text-foreground md:text-4xl">
          How Trustead works
        </h2>
        <div className="mt-8 space-y-4">
          {VALUE_PROPS.map((vp, i) => (
            <div
              key={vp.title}
              className="flex items-start gap-5 rounded-2xl border border-border bg-card/40 p-6 md:p-8"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/15 font-serif text-2xl text-brand">
                {vp.glyph}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs uppercase tracking-wider text-subtle">
                    Step {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-1 text-lg font-semibold text-foreground md:text-xl">
                  {vp.title}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                  {vp.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="mt-28">
        <h2 className="font-serif text-3xl text-foreground md:text-4xl">
          From members
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
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

      {/* Closing — primary + secondary CTA */}
      <section className="mt-28 rounded-2xl border border-border bg-card/40 p-10 md:p-14">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-lg">
            <h2 className="font-serif text-3xl text-foreground md:text-4xl">
              Ready when your invite is.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground md:text-base">
              Open the link your friend sent — your token is already in there.
              Or sign in if you&rsquo;re already a member.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={HERO.primary.href}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:bg-primary/90"
            >
              {HERO.primary.label}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-transparent px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-card/60"
            >
              Already a member? Sign in
            </Link>
          </div>
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
