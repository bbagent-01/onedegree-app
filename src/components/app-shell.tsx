"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  Search,
  User,
  Home,
  Plus,
  ChevronLeft,
  Menu,
  X,
  Star,
  UserPlus,
  Mail,
  LayoutDashboard,
  MapPin,
  Wrench,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  currentUser?: {
    id: string;
    name: string;
    avatar_url: string | null;
    guest_rating: number | null;
    guest_review_count: number;
    has_listings: boolean;
  };
}

export function AppShell({ children, currentUser }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user: clerkUser } = useUser();

  const navItems = [
    { label: "Browse Listings", href: "/listings", icon: Search },
    ...(currentUser?.has_listings
      ? [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }]
      : []),
    { label: "My Trips", href: "/my-trips", icon: MapPin },
    {
      label: "My Profile",
      href: currentUser ? `/profile/${currentUser.id}` : "/listings",
      icon: User,
    },
    ...(currentUser?.has_listings
      ? [{ label: "My Listings", href: "/my-listings", icon: Home }]
      : []),
    { label: "Create Listing", href: "/listings/create", icon: Plus },
    ...(currentUser?.has_listings
      ? [{ label: "Tools", href: "/tools", icon: Wrench }]
      : []),
    { label: "Invite Someone", href: "/invite", icon: UserPlus },
    { label: "My Invites", href: "/my-invites", icon: Mail },
  ];

  const displayName = currentUser?.name || clerkUser?.fullName || "Member";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-white/70 backdrop-blur-xl transition-all duration-200",
          collapsed ? "w-16" : "w-60",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo area */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <Link href="/listings" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-top to-primary-bot">
                <span className="font-mono text-xs font-bold text-white">
                  1°
                </span>
              </div>
              <span className="text-sm font-semibold text-foreground">
                One Degree
              </span>
            </Link>
          )}
          {collapsed && (
            <Link
              href="/listings"
              className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-top to-primary-bot"
            >
              <span className="font-mono text-xs font-bold text-white">
                1°
              </span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-lg p-1 text-foreground-secondary transition-colors hover:bg-background-mid hover:text-foreground lg:block"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed && "rotate-180"
              )}
            />
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1 text-foreground-secondary lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-light text-primary border border-primary-border"
                    : "text-foreground-secondary hover:bg-background-mid hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8",
                  },
                }}
              />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {displayName}
                </p>
                {currentUser?.guest_rating ? (
                  <p className="flex items-center gap-1 text-[10px] text-foreground-secondary">
                    <Star className="size-2.5 fill-amber-400 text-amber-400" />
                    {currentUser.guest_rating.toFixed(1)} ·{" "}
                    {currentUser.guest_review_count} stay
                    {currentUser.guest_review_count !== 1 ? "s" : ""}
                  </p>
                ) : (
                  <p className="text-[10px] text-foreground-secondary">
                    New member
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-200",
          collapsed ? "lg:pl-16" : "lg:pl-60"
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1 text-foreground-secondary hover:text-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-white/90 backdrop-blur-xl px-2 py-2 lg:hidden">
        {[
          { label: "Browse", href: "/listings", icon: Search },
          { label: "My Trips", href: "/my-trips", icon: MapPin },
          ...(currentUser?.has_listings
            ? [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }]
            : [{ label: "Create", href: "/listings/create", icon: Plus }]),
          {
            label: "Profile",
            href: currentUser ? `/profile/${currentUser.id}` : "/listings",
            icon: User,
          },
        ].map((item) => {
          const isActive =
            pathname === item.href ||
            pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-foreground-tertiary"
              )}
            >
              <item.icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
