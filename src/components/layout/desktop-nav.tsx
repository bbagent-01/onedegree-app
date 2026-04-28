"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./account-menu";
import { TrusteadLogo } from "./trustead-logo";

export function DesktopNav() {
  const pathname = usePathname();
  const isListing = pathname?.startsWith("/listings/") ?? false;

  // StickyAnchorBar toggles `listing-sticky-active` on <html> when the
  // listing sticky nav is visible. We mirror that flag here so the primary
  // nav contents (logo + profile cluster) hide at narrow viewports to
  // avoid overlapping the sticky nav.
  const [stickyActive, setStickyActive] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const update = () =>
      setStickyActive(el.classList.contains("listing-sticky-active"));
    update();
    const mo = new MutationObserver(update);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  const hidePrimaryNarrow = isListing && stickyActive;

  return (
    <header className="hidden md:block sticky top-0 z-50 border-b border-border bg-white">
      {/* Primary nav is always full-width, extending to browser edges. The
          listing page's sticky anchor bar (portaled into #nav-center-slot)
          constrains itself to 1280 so it aligns with the listing column. */}
      <div className="relative flex h-20 w-full items-center justify-between gap-4 px-5 lg:gap-6 lg:px-10">
        {/* Logo — progressive: full wordmark at lg+, compact icon below
            so there's more room for the search pill at narrow desktop
            widths. Mirrors Airbnb's responsive logo behavior.
            On listing pages, hidden at narrow viewports once the sticky
            anchor bar is active so there's no overlap. */}
        <Link
          href="/browse"
          aria-label="Trustead"
          className={cn(
            "shrink-0 items-center",
            hidePrimaryNarrow ? "hidden min-[1900px]:flex" : "flex"
          )}
        >
          {/* Inline SVG for the wordmark — currentColor cascades from
              CSS so brand presets can flip the logo color. The .brand-logo
              class is the hook the dev2 brand-preset CSS targets. */}
          <TrusteadLogo className="brand-logo hidden h-7 w-auto text-foreground lg:block" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/trustead-favicon.svg"
            alt="Trustead"
            className="block h-9 w-auto lg:hidden"
          />
        </Link>

        {/* Middle slot — route-specific content rendered via portal.
            On listing pages, the slot is absolutely positioned and
            constrained to 1280 so the sticky anchor bar aligns with the
            listing column below. On other routes (e.g. browse) it uses
            flex so the search bar can fill the available center space. */}
        <div
          id="nav-center-slot"
          className={cn(
            isListing
              ? "pointer-events-none absolute inset-x-0 top-0 z-[1] mx-auto flex h-20 w-full max-w-[1280px] items-center justify-center [&>*]:pointer-events-auto"
              : "flex min-w-0 flex-1 items-center justify-center"
          )}
        />

        {/* Right section */}
        <div
          className={cn(
            "shrink-0 items-center gap-4",
            hidePrimaryNarrow ? "hidden min-[1900px]:flex" : "flex"
          )}
        >
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
