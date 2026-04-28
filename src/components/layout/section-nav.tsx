"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, Luggage, Users, MessageCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /**
   * Active-state predicate. Hosting is the canonical landing at
   * /dashboard (no ?tab= or ?tab=hosting), and /hosting/* redirects
   * into /dashboard — so either pathname counts. Trips + Network
   * both live behind /dashboard?tab= plus a top-level /trips route
   * that redirects.
   */
  isActive: (pathname: string, sp: URLSearchParams) => boolean;
}

const items: NavItem[] = [
  {
    key: "inbox",
    label: "Messages",
    href: "/inbox",
    icon: MessageCircle,
    isActive: (p) => p === "/inbox" || p.startsWith("/inbox/"),
  },
  {
    key: "hosting",
    label: "Hosting",
    href: "/dashboard",
    icon: Home,
    isActive: (p, sp) => {
      if (p === "/hosting" || p.startsWith("/hosting/")) return true;
      if (p !== "/dashboard") return false;
      const tab = sp.get("tab");
      return !tab || tab === "hosting";
    },
  },
  {
    key: "trips",
    label: "Trips",
    href: "/dashboard?tab=traveling",
    icon: Luggage,
    isActive: (p, sp) =>
      p.startsWith("/trips") ||
      (p === "/dashboard" && sp.get("tab") === "traveling"),
  },
  {
    key: "network",
    label: "Network",
    href: "/dashboard?tab=network",
    icon: Users,
    isActive: (p, sp) => p === "/dashboard" && sp.get("tab") === "network",
  },
  {
    key: "proposals",
    label: "Proposals",
    href: "/dashboard?tab=proposals",
    icon: Sparkles,
    isActive: (p, sp) =>
      p.startsWith("/proposals") ||
      (p === "/dashboard" && sp.get("tab") === "proposals"),
  },
];

/**
 * Secondary nav row shown at the top of the signed-in core pages
 * (dashboard, trips, hosting, inbox). Gives users a constant way to
 * move between the five major sections without needing the mobile
 * bottom nav or the account-menu fly-out. Pathname + ?tab= drive
 * the active highlight.
 */
export function SectionNav() {
  const pathname = usePathname() || "/";
  const sp = useSearchParams();
  // Network-item vouch-back nudge count. Fetched client-side so we
  // don't tax every server render on this shared-nav component.
  // Refreshes on route change so landing on /dashboard?tab=network
  // (which clears or updates the set) reflects immediately.
  const [vouchBackCount, setVouchBackCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/vouch-back/count", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d) => {
        if (!cancelled) setVouchBackCount(Number(d?.count ?? 0));
      })
      .catch(() => {
        if (!cancelled) setVouchBackCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, sp]);

  return (
    <nav
      aria-label="Sections"
      className="overflow-x-auto border-b border-border bg-white"
    >
      <ul className="mx-auto flex max-w-[1600px] gap-1 px-4 py-2 md:px-6">
        {items.map((item) => {
          const active = item.isActive(pathname, sp);
          const Icon = item.icon;
          const showNetworkBadge =
            item.key === "network" &&
            typeof vouchBackCount === "number" &&
            vouchBackCount > 0;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {showNetworkBadge && (
                  <span
                    aria-label={`${vouchBackCount} unanswered ${
                      vouchBackCount === 1 ? "vouch" : "vouches"
                    }`}
                    className={cn(
                      "inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none tabular-nums",
                      active
                        ? "bg-background text-foreground"
                        : "bg-brand text-white"
                    )}
                  >
                    {vouchBackCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
