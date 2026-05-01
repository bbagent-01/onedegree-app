"use client";

// B4 chrome switcher. Renders one of two outer chromes based on
// pathname:
//   - SidebarShell: for the "interior" surfaces — Messages, Network,
//     Trips, Listings, Wishlists, Host dashboard, Profile. Persistent
//     left-rail nav there per Loren.
//   - DesktopNav + plain <main>: the "front-of-house" surfaces —
//     Home, Browse, Proposals, Vouch. Discovery / hero pages render
//     against the original top-nav chrome with the locked design's
//     condensed search treatment.
//
// To revert to top-nav across the board: empty SIDEBAR_SURFACES
// below (or delete the array). The sidebar surfaces immediately
// fall back to DesktopNav with no other code changes.

import { usePathname } from "next/navigation";
import { DesktopNav } from "./desktop-nav";
import { SidebarShell } from "./sidebar-shell";

const SIDEBAR_SURFACES: Array<string | RegExp> = [
  /^\/dashboard(\/.*)?$/, // Network, Listings, Host dashboard live here behind tabs
  /^\/inbox(\/.*)?$/, // Messages
  /^\/trips(\/.*)?$/,
  /^\/wishlists(\/.*)?$/,
  /^\/profile(\/.*)?$/,
];

function isSidebarSurface(pathname: string): boolean {
  return SIDEBAR_SURFACES.some((m) =>
    typeof m === "string" ? m === pathname : m.test(pathname)
  );
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const useSidebar = isSidebarSurface(pathname);

  if (useSidebar) {
    return <SidebarShell>{children}</SidebarShell>;
  }

  return (
    <>
      <DesktopNav />
      <main
        className="flex-1 md:!pb-0"
        style={{
          paddingBottom: "calc(4rem + env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </main>
    </>
  );
}
