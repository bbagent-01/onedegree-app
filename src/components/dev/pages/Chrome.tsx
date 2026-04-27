// REMOVE BEFORE BETA — Dev2 (design system page).
//
// Mock global chrome (nav + footer) used to wrap each page preview.
// The real DesktopNav / Footer are server components coupled to
// Clerk + route data; we substitute a markup-only stand-in that
// matches the visual structure but skips the auth/data plumbing.
"use client";

import Link from "next/link";

export function PageChrome({
  children,
  variant = "desktop",
}: {
  children: React.ReactNode;
  variant?: "desktop" | "mobile";
}) {
  return (
    <div className="bg-white">
      <NavStub variant={variant} />
      <div className="min-h-[60vh]">{children}</div>
      {variant === "desktop" ? <FooterStub /> : <MobileBottomNavStub />}
    </div>
  );
}

function NavStub({ variant }: { variant: "desktop" | "mobile" }) {
  return (
    <div
      className={
        variant === "mobile"
          ? "flex items-center justify-between border-b bg-white/95 px-4 py-3 backdrop-blur"
          : "flex items-center justify-between border-b bg-white/95 px-4 py-3 backdrop-blur md:px-10 lg:px-20"
      }
    >
      <Link href="#" className="text-base font-semibold text-brand">
        Trustead
      </Link>
      {variant === "desktop" && (
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <span className="cursor-pointer hover:text-foreground">Browse</span>
          <span className="cursor-pointer hover:text-foreground">
            Proposals
          </span>
          <span className="cursor-pointer hover:text-foreground">Inbox</span>
          <span className="cursor-pointer hover:text-foreground">Trips</span>
          <span className="cursor-pointer hover:text-foreground">Hosting</span>
        </nav>
      )}
      <div className="flex items-center gap-2">
        {variant === "desktop" && (
          <button className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted">
            Vouch
          </button>
        )}
        <div className="h-7 w-7 rounded-full bg-muted" />
      </div>
    </div>
  );
}

function FooterStub() {
  return (
    <div className="mt-12 border-t bg-muted/30 px-4 py-8 text-xs text-muted-foreground md:px-10 lg:px-20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>© 2026 Trustead</span>
        <div className="flex gap-4">
          <span className="cursor-pointer hover:text-foreground">About</span>
          <span className="cursor-pointer hover:text-foreground">Help</span>
          <span className="cursor-pointer hover:text-foreground">Terms</span>
          <span className="cursor-pointer hover:text-foreground">Privacy</span>
        </div>
      </div>
    </div>
  );
}

function MobileBottomNavStub() {
  return (
    <div className="sticky bottom-0 border-t bg-white px-4 py-2">
      <div className="flex items-center justify-around text-[10px] text-muted-foreground">
        {["Browse", "Proposals", "Inbox", "Trips", "Profile"].map((l, i) => (
          <span key={l} className={i === 0 ? "text-brand font-medium" : ""}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
