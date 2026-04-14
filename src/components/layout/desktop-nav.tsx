"use client";

import { Globe } from "lucide-react";
import { useUser, UserButton, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

export function DesktopNav() {
  const { isSignedIn } = useUser();

  return (
    <header className="hidden md:block sticky top-0 z-50 border-b border-border bg-white">
      <div className="flex h-20 w-full items-center justify-between gap-6 px-10 lg:px-20">
        {/* Logo */}
        <Link href="/browse" className="flex shrink-0 items-center" aria-label="One Degree B&B">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/1db-wordmark.svg" alt="One Degree B&B" className="h-8 w-auto" />
        </Link>

        {/* Middle slot — route-specific content rendered via portal */}
        <div id="nav-center-slot" className="flex min-w-0 flex-1 items-center justify-center" />

        {/* Right section */}
        <div className="flex shrink-0 items-center gap-4">
          {/* Right slot — route-specific content (price + Reserve on listing) */}
          <div id="nav-right-slot" className="flex items-center gap-3 empty:hidden" />
          <Link
            href="/browse"
            className="text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
          >
            Become a Host
          </Link>
          <button className="p-2 hover:bg-muted rounded-full transition-colors">
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
