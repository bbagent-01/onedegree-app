"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Home,
  Luggage,
  Users,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /**
   * Exact-match pathnames + optional search param predicate for the
   * active state. Some items (Network, Hosting tab) live behind
   * ?tab= on /dashboard, so we need to consult searchParams too.
   */
  isActive: (pathname: string, sp: URLSearchParams) => boolean;
}

const items: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    isActive: (p, sp) =>
      p === "/dashboard" && sp.get("tab") !== "traveling" && sp.get("tab") !== "network",
  },
  {
    key: "trips",
    label: "Trips",
    href: "/trips",
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
    key: "hosting",
    label: "Hosting",
    href: "/hosting",
    icon: Home,
    isActive: (p) => p === "/hosting" || p.startsWith("/hosting/"),
  },
  {
    key: "inbox",
    label: "Messages",
    href: "/inbox",
    icon: MessageCircle,
    isActive: (p) => p === "/inbox" || p.startsWith("/inbox/"),
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

  return (
    <nav
      aria-label="Sections"
      className="overflow-x-auto border-b border-border bg-white"
    >
      <ul className="mx-auto flex max-w-[1600px] gap-1 px-4 py-2 md:px-6">
        {items.map((item) => {
          const active = item.isActive(pathname, sp);
          const Icon = item.icon;
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
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
