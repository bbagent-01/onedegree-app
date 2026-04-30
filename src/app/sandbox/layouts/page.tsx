// D3 LAYOUT SANDBOX — INDEX
// ----------------------------------------------------------------
// Six full-page layout variants (2 each for landing, browse,
// dashboard). Loren picks one variant per surface; B4 integration
// session ports the locked layouts into the real app surfaces.
//
// HARD RULE: NO new functionality. Every element in every variant
// must already exist somewhere in the live app — this is
// rearrangement + visual treatment, not product spec.
// ----------------------------------------------------------------

import Link from "next/link";

export const runtime = "edge";

type Variant = {
  href: string;
  surface: "Landing" | "Browse" | "Dashboard";
  letter: "A" | "B";
  name: string;
  blurb: string;
  contrast: string;
};

const VARIANTS: Variant[] = [
  {
    href: "/sandbox/layouts/landing-a",
    surface: "Landing",
    letter: "A",
    name: "Centered hero · 3-col value props",
    blurb: "Single strong CTA, value props in a tight three-column grid.",
    contrast: "vs B: centered hero, one CTA, horizontal value-prop grid.",
  },
  {
    href: "/sandbox/layouts/landing-b",
    surface: "Landing",
    letter: "B",
    name: "Split hero · stacked value props",
    blurb: "Hero text left + visual right; value props stack vertically with iconography.",
    contrast: "vs A: split hero, primary + secondary CTA, vertical stack.",
  },
  {
    href: "/sandbox/layouts/browse-a",
    surface: "Browse",
    letter: "A",
    name: "Large 4:3 cards · top filter bar",
    blurb: "Roomy three-column grid, photo-forward, filter chips across the top.",
    contrast: "vs B: large cards, top filters, photo-forward feel.",
  },
  {
    href: "/sandbox/layouts/browse-b",
    surface: "Browse",
    letter: "B",
    name: "Compact list · inline filter chips",
    blurb: "Dense list-style cards with 16:9 thumbnails, scrollable filter chips inline.",
    contrast: "vs A: compact list, inline chips, scan-many-fast feel.",
  },
  {
    href: "/sandbox/layouts/dashboard-a",
    surface: "Dashboard",
    letter: "A",
    name: "Top metrics · proactive next steps",
    blurb: "Metric tiles top-of-page, then a prompt-driven 'do this next' panel.",
    contrast: "vs B: metrics top, proactive prompts pull you to action.",
  },
  {
    href: "/sandbox/layouts/dashboard-b",
    surface: "Dashboard",
    letter: "B",
    name: "Side-rail metrics · activity recap",
    blurb: "Metrics in a left side-rail, main column shows a passive recap timeline.",
    contrast: "vs A: side-rail metrics, recap-driven, calmer vibe.",
  },
];

export default function SandboxLayoutsIndex() {
  const grouped: Record<string, Variant[]> = {
    Landing: VARIANTS.filter((v) => v.surface === "Landing"),
    Browse: VARIANTS.filter((v) => v.surface === "Browse"),
    Dashboard: VARIANTS.filter((v) => v.surface === "Dashboard"),
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-12 lg:px-10">
      <SampleDataBadge />
      <h1 className="mt-6 font-serif text-4xl text-foreground md:text-5xl">
        Layout sandbox
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Six full-page layout variants — two each for{" "}
        <span className="text-foreground">landing</span>,{" "}
        <span className="text-foreground">browse</span>, and{" "}
        <span className="text-foreground">dashboard</span>. Pick one per
        surface; the B4 integration session ports the locked layouts into the
        real app routes.
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Sample data only. No real users, no DB queries, no new features —
        every element in every variant already exists in the live app today.
        This is rearrangement and visual treatment, nothing else.
      </p>

      <div className="mt-12 space-y-12">
        {(["Landing", "Browse", "Dashboard"] as const).map((surface) => (
          <section key={surface}>
            <h2 className="font-serif text-2xl text-foreground">{surface}</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {grouped[surface].map((v) => (
                <Link
                  key={v.href}
                  href={v.href}
                  className="group rounded-2xl border border-border bg-card/40 p-6 transition-colors hover:border-brand/40 hover:bg-card/60"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-brand">
                      {surface} · Variant {v.letter}
                    </span>
                    <span className="text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                      open →
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {v.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {v.blurb}
                  </p>
                  <p className="mt-3 text-xs italic text-subtle">
                    {v.contrast}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function SampleDataBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-warning">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" />
      Sample data — sandbox only
    </span>
  );
}
