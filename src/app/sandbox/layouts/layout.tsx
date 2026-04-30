// D3 LAYOUT SANDBOX — SHARED CHROME
// ----------------------------------------------------------------
// Fixed low-profile top nav across every /sandbox/layouts/* route.
// Lets reviewers jump between page replicas without losing context.
// Sandbox routes are intentionally NOT wrapped in the live (app)
// layout — the goal is to see each surface as it lives today plus
// experiment with variations, without inheriting site-wide nav
// chrome that would distort the page-level layout exploration.
// ----------------------------------------------------------------

import Link from "next/link";

export const metadata = {
  title: "Layout sandbox — Trustead",
};

const ROUTES: { href: string; label: string }[] = [
  { href: "/sandbox/layouts", label: "Index" },
  { href: "/sandbox/layouts/landing", label: "Landing" },
  { href: "/sandbox/layouts/browse", label: "Browse" },
  { href: "/sandbox/layouts/listing", label: "Listing" },
  { href: "/sandbox/layouts/dashboard", label: "Dashboard" },
  { href: "/sandbox/layouts/network", label: "Network" },
  { href: "/sandbox/layouts/trips", label: "Trips" },
  { href: "/sandbox/layouts/proposals", label: "Proposals" },
  { href: "/sandbox/layouts/messages", label: "Messages" },
  { href: "/sandbox/layouts/vouch", label: "Vouch" },
  { href: "/sandbox/layouts/profile", label: "Profile" },
];

export default function SandboxLayoutsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SandboxNav />
      {/* Push content below the fixed nav — nav is 36px tall. */}
      <div className="pt-9">{children}</div>
    </>
  );
}

function SandboxNav() {
  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 h-9 border-b border-border/60 bg-background/85 backdrop-blur"
      aria-label="Sandbox variants"
    >
      <div className="mx-auto flex h-full w-full max-w-[1600px] items-center gap-3 px-4 md:px-6">
        <span className="shrink-0 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
          Sandbox
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {ROUTES.map((r) => (
            <SandboxNavLink key={r.href} href={r.href} label={r.label} />
          ))}
        </div>
      </div>
    </nav>
  );
}

// Server component can't read pathname directly without next/headers; using
// prefetch + active-state matching client-side via a tiny script is overkill.
// Instead, render plain links — the client SandboxNavLink uses pathname for
// active styling.
function SandboxNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-card/40 hover:text-foreground aria-[current=page]:bg-card/60 aria-[current=page]:text-foreground"
    >
      {label}
    </Link>
  );
}
