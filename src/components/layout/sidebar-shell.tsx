"use client";

// B4 sidebar shell. Wraps page content on /, /browse, /dashboard so
// the locked home-v4 layout (sidebar + collapsible nav + demo
// notifications panel) extends across the three highest-traffic
// authed surfaces.
//
// Desktop only — hidden on <md. Mobile users continue to see the
// existing MobileNav rendered by `(app)/layout.tsx`. Reverting is
// a one-line edit: empty SIDEBAR_SURFACES in `app-chrome.tsx`.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Calendar,
  Heart,
  HelpCircle,
  Home as HomeIcon,
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Plane,
  Search,
  Settings,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { TrusteadLogo } from "./trustead-logo";

type NavItem = {
  icon: typeof HomeIcon;
  label: string;
  href: string;
  matches?: (pathname: string, sp: URLSearchParams) => boolean;
};

// Two visible groups separated by a faint divider line:
//   1. "Front" — Home / Browse / Proposals / Vouch. These are
//      discovery surfaces that render against DesktopNav, NOT the
//      sidebar; they appear here so users on a sidebar surface have
//      a one-click path back to them. Clicking any of these takes
//      the user out of the sidebar shell (AppChrome handles that).
//   2. "Interior" — Messages / Network / Trips / Listings /
//      Wishlists / Host dashboard / Profile. These are the surfaces
//      that DO render with the sidebar. Order matches Loren's spec.
//
// A third group (Account / Help) sits below the second divider —
// account-keeping links Loren hasn't reordered.
//
// Network and Listings don't have dedicated routes in the live app
// — both live behind /dashboard tabs (?tab=network / ?tab=hosting).
// The searchParams-aware matchers below light up the right sidebar
// item depending on which tab is active.
const DASHBOARD_TAB_KEYS = ["network", "traveling", "proposals"] as const;

const NAV_GROUPS: { id: string; items: NavItem[] }[] = [
  {
    id: "front",
    items: [
      { icon: HomeIcon, label: "Home", href: "/", matches: (p) => p === "/" },
      { icon: Search, label: "Browse", href: "/browse" },
      { icon: Plane, label: "Proposals", href: "/proposals" },
      { icon: ShieldCheck, label: "Vouch", href: "/vouch" },
    ],
  },
  {
    id: "interior",
    items: [
      { icon: MessageCircle, label: "Messages", href: "/inbox" },
      {
        icon: Users,
        label: "Network",
        href: "/dashboard?tab=network",
        matches: (p, sp) => p === "/dashboard" && sp.get("tab") === "network",
      },
      {
        icon: Calendar,
        label: "Trips",
        href: "/trips",
        matches: (p, sp) =>
          p.startsWith("/trips") ||
          (p === "/dashboard" && sp.get("tab") === "traveling"),
      },
      {
        icon: ListChecks,
        label: "Listings",
        // No standalone /listings management page in the live app —
        // host listings render on the dashboard's hosting tab.
        href: "/dashboard?tab=hosting",
        matches: (p, sp) =>
          p === "/dashboard" && sp.get("tab") === "hosting",
      },
      { icon: Heart, label: "Wishlists", href: "/wishlists" },
      {
        icon: LayoutDashboard,
        label: "Host dashboard",
        href: "/dashboard",
        // Light up only when on /dashboard with no tab param — the
        // tab-specific items above (Network, Trips, Listings) own
        // their respective tab states.
        matches: (p, sp) => {
          if (p === "/hosting" || p.startsWith("/hosting/")) return true;
          if (p !== "/dashboard") return false;
          const tab = sp.get("tab");
          return !tab && !DASHBOARD_TAB_KEYS.includes(tab as never);
        },
      },
      { icon: User, label: "Profile", href: "/profile" },
    ],
  },
  {
    id: "account",
    items: [
      { icon: Settings, label: "Account settings", href: "/settings" },
      { icon: HelpCircle, label: "Help Center", href: "/help" },
    ],
  },
];

// Demo notifications — visibly tagged so reviewers know it's not a
// live feed. Real notifications system isn't wired yet; placeholder
// keeps the locked layout's structure intact without inventing a
// new data source.
const DEMO_NOTIFICATIONS = [
  { who: "Maya R.", body: "vouched for you", ago: "2h", actionable: true },
  {
    who: "Diego M.",
    body: "replied to your proposal",
    ago: "Yesterday",
    actionable: false,
  },
  { who: "Priya K.", body: "vouched for you", ago: "1w", actionable: true },
  {
    who: "Beatriz F.",
    body: "joined Trustead via Sofía A.",
    ago: "3d",
    actionable: false,
  },
];

function isActive(item: NavItem, pathname: string, sp: URLSearchParams) {
  if (item.matches) return item.matches(pathname, sp);
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export function SidebarShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const unread = DEMO_NOTIFICATIONS.filter((n) => n.actionable).length;
  const w = collapsed ? "w-[64px]" : "w-[240px]";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-1 md:min-h-screen">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card/30 transition-[width] duration-200 md:flex ${w}`}
        aria-label="Site navigation"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
          <Link
            href="/"
            className="flex min-w-0 items-center text-foreground"
            aria-label="Trustead"
          >
            {collapsed ? (
              <TrusteadLogo mark className="h-8 w-8 text-foreground" />
            ) : (
              <TrusteadLogo className="brand-logo h-6 w-auto text-foreground" />
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="ml-2 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-card/60 hover:text-foreground"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        <nav className="shrink-0 py-3">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.id}>
              {gi > 0 && (
                <div className="my-3 border-t border-border" aria-hidden />
              )}
              <ul className="space-y-0.5 px-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item, pathname, searchParams);
                  return (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className={
                          active
                            ? `flex items-center gap-3 rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background ${collapsed ? "justify-center px-2" : ""}`
                            : `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-card/60 hover:text-foreground ${collapsed ? "justify-center px-2" : ""}`
                        }
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* AccountMenu removed per Loren — sign-out / account links
            still reachable via the "Account settings" item in the
            account group below, and via DesktopNav on every non-
            sidebar surface. */}

        {collapsed ? (
          <div className="mt-2 flex flex-col items-center gap-2 px-2">
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-card/60 hover:text-foreground"
              aria-label={`Notifications (${unread} unread, demo)`}
              title="Notifications (demo)"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-black">
                  {unread}
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col border-t border-border">
            <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <h3 className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Notifications
                </h3>
                {unread > 0 && (
                  <span className="rounded-full bg-warning px-1.5 py-0 text-[9px] font-bold text-black">
                    {unread}
                  </span>
                )}
              </div>
              <span
                className="shrink-0 rounded-full border border-border/60 bg-background/40 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider text-muted-foreground"
                title="Demo data — placeholder until real notifications ship"
              >
                Demo
              </span>
            </div>
            <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
              {DEMO_NOTIFICATIONS.map((n, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border bg-background/40 p-2.5"
                >
                  <p className="text-[11px] leading-snug text-foreground">
                    <span className="font-semibold">{n.who}</span> {n.body}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {n.ago}
                    </span>
                    {n.actionable && (
                      <button
                        type="button"
                        className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        Vouch back
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            className="m-2 mt-auto inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-card/60 hover:text-foreground"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
