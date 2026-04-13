"use client";

import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { UserButton, SignInButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function DesktopNav() {
  const { isSignedIn } = useUser();

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border hidden md:block">
      <div className="mx-auto max-w-container px-10 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/explore" className="flex items-center gap-1.5 shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white font-mono text-sm font-bold">
            1&deg;
          </span>
          <span className="text-lg font-bold text-foreground tracking-tight">
            B&B
          </span>
        </Link>

        {/* Search pill */}
        <button className="flex items-center border border-border rounded-pill shadow-search hover:shadow-search-hover transition-shadow px-4 py-2 gap-3 text-sm min-w-0 max-w-md flex-1 mx-8">
          <span className="font-medium text-foreground truncate">Anywhere</span>
          <span className="w-px h-5 bg-border" />
          <span className="font-medium text-foreground truncate">Any week</span>
          <span className="w-px h-5 bg-border" />
          <span className="text-muted-foreground truncate">Add guests</span>
          <span className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white shrink-0">
            <Search className="h-4 w-4" />
          </span>
        </button>

        {/* Right section */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/host"
            className="text-sm font-medium text-foreground hover:bg-surface rounded-pill px-3 py-2 transition-colors"
          >
            Become a Host
          </Link>
          {isSignedIn ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
          ) : (
            <SignInButton mode="modal">
              <Button size="sm" className="rounded-pill">
                Sign In
              </Button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>
  );
}
