"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Portals children into the DesktopNav's `#nav-center-slot`. Used by route
 * pages (browse, listing) to render their own context bar inside the top
 * nav on desktop instead of below it. On mobile (where DesktopNav is
 * hidden), the portal target doesn't exist, so nothing renders — pages
 * should render their mobile equivalents separately.
 */
export function NavCenterPortal({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById("nav-center-slot"));
  }, []);
  if (!slot) return null;
  return createPortal(children, slot);
}
