"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { useUser, UserButton, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function DesktopNav() {
  const { isSignedIn } = useUser();
  const pathname = usePathname();
  const isListing = pathname?.startsWith("/listings/") ?? false;

  // StickyAnchorBar toggles `listing-sticky-active` on <html> when the
  // listing sticky nav is visible. We mirror that flag here so the primary
  // nav contents (logo + profile cluster) hide at narrow viewports to
  // avoid overlapping the 1280-wide sticky nav.
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
      <div className="relative flex h-20 w-full items-center justify-between gap-6 px-6 lg:px-10">
        {/* Logo — on listing pages, hidden at narrow viewports once the
            sticky anchor bar is active so there's no overlap. */}
        <Link
          href="/browse"
          aria-label="One Degree B&B"
          className={cn(
            "shrink-0 items-center",
            hidePrimaryNarrow ? "hidden min-[1900px]:flex" : "flex"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/1db-wordmark.svg" alt="One Degree B&B" className="h-12 w-auto" />
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
          {/* "Become a Host" and the Globe icon follow Airbnb's pattern:
              they drop out below xl so the browse search pill (or listing
              sticky bar) has room to breathe at narrower desktops. */}
          <Link
            href="/hosting"
            className="hidden xl:inline-flex text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
          >
            Hosting
          </Link>
          <button className="hidden xl:inline-flex p-2 hover:bg-muted rounded-full transition-colors">
            <Globe className="h-4 w-4" />
          </button>

          {isSignedIn ? (
            <UserButton
              appearance={{
                elements: { avatarBox: "h-8 w-8" },
              }}
            />
          ) : (
            <SignInButton mode="modal">
              <button className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors">
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>
  );
}
