"use client";

// B4 chrome switcher. Renders one of two outer chromes based on
// pathname:
//   - SidebarShell: for /browse and /dashboard (interior "backend"
//     surfaces — Loren wants persistent left-rail nav there).
//   - DesktopNav + plain <main>: home (/) and every other route
//     (Loren backed off the sidebar on the homepage; the locked
//     hero + condensed search + marquees render against the
//     original top-nav chrome).
//
// To revert to top-nav across the board: empty SIDEBAR_SURFACES
// below (or delete the array). The sidebar surfaces immediately fall
// back to the original DesktopNav chrome with no other code changes.

import { usePathname } from "next/navigation";
import { DesktopNav } from "./desktop-nav";
import { SidebarShell } from "./sidebar-shell";

const SIDEBAR_SURFACES: Array<string | RegExp> = [
  "/browse",
  /^\/dashboard(\/.*)?$/,
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
