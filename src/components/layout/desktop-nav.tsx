"use client";

import { Search, Globe } from "lucide-react";
import { useUser, UserButton, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

export function DesktopNav() {
  const { isSignedIn } = useUser();

  return (
    <header className="hidden md:block sticky top-0 z-50 border-b border-border bg-white">
      <div className="mx-auto flex h-16 max-w-container items-center justify-between px-6">
        {/* Logo */}
        <Link href="/explore" className="flex items-center gap-2">
          <span className="text-xl font-bold text-brand">1° B&B</span>
        </Link>

        {/* Search pill */}
        <button className="flex items-center gap-3 rounded-full border border-border px-4 py-2 shadow-search hover:shadow-search-hover transition-shadow">
          <span className="text-sm font-medium">Anywhere</span>
          <span className="h-5 w-px bg-border" />
          <span className="text-sm font-medium">Any week</span>
          <span className="h-5 w-px bg-border" />
          <span className="text-sm text-muted-foreground">Add guests</span>
          <div className="rounded-full bg-brand p-2">
            <Search className="h-3.5 w-3.5 text-white" />
          </div>
        </button>

        {/* Right section */}
        <div className="flex items-center gap-4">
          <Link
            href="/explore"
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
