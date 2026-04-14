"use client";

import { Globe } from "lucide-react";
import { useUser, UserButton, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function DesktopNav() {
  const { isSignedIn } = useUser();
  const pathname = usePathname();
  // Listings use a fixed-width content column (Airbnb-style). The nav bar
  // stays full-width but its inner row constrains to the same column so
  // sticky anchor + reserve align with the listing content.
  const isListing = pathname?.startsWith("/listings/") ?? false;

  return (
    <header className="hidden md:block sticky top-0 z-50 border-b border-border bg-white">
      <div
        className={cn(
          "flex h-24 items-center justify-between gap-6",
          isListing
            ? "mx-auto w-full max-w-[1280px] px-6"
            : "w-full px-10 lg:px-20"
        )}
      >
        {/* Logo — on listing pages, hidden below xl so the sticky anchor bar
            can reclaim the nav width. */}
        <Link
          href="/browse"
          aria-label="One Degree B&B"
          className={cn(
            "shrink-0 items-center",
            isListing ? "hidden xl:flex" : "flex"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/1db-wordmark.svg" alt="One Degree B&B" className="h-16 w-auto" />
        </Link>

        {/* Middle slot — route-specific content rendered via portal */}
        <div id="nav-center-slot" className="flex min-w-0 flex-1 items-center justify-center" />

        {/* Right section */}
        <div className="flex shrink-0 items-center gap-4">
          {/* Right slot — route-specific content (price + Reserve on listing) */}
          <div id="nav-right-slot" className="flex items-center gap-3 empty:hidden" />
          <Link
            href="/browse"
            className={cn(
              "text-sm font-medium text-foreground hover:text-foreground/80 transition-colors",
              isListing && "hidden xl:inline-flex"
            )}
          >
            Become a Host
          </Link>
          <button
            className={cn(
              "p-2 hover:bg-muted rounded-full transition-colors",
              isListing && "hidden xl:inline-flex"
            )}
          >
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
