"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Search,
  CalendarDays,
  MessageCircle,
  Menu,
  LayoutGrid,
  Plus,
  Settings,
  ArrowLeftRight,
  LogOut,
  Heart,
  User,
  Globe,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk, SignInButton } from "@clerk/nextjs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getNavMode, modeSwitchHref } from "@/lib/nav-mode";

interface Tab {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: (path: string) => boolean;
  isMenu?: boolean;
}

const travelingTabs: Tab[] = [
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/trips", label: "Trips", icon: CalendarDays },
  { href: "/inbox", label: "Inbox", icon: MessageCircle, match: (p) => p.startsWith("/inbox") },
  { label: "Menu", icon: Menu, isMenu: true },
];

const hostingTabs: Tab[] = [
  {
    href: "/hosting",
    label: "Today",
    icon: LayoutGrid,
    match: (p) => p === "/hosting",
  },
  {
    href: "/hosting/create",
    label: "Create",
    icon: Plus,
    match: (p) => p.startsWith("/hosting/create"),
  },
  { href: "/inbox", label: "Inbox", icon: MessageCircle, match: (p) => p.startsWith("/inbox") },
  { label: "Menu", icon: Menu, isMenu: true },
];

export function MobileNav() {
  const pathname = usePathname() || "/";
  const mode = getNavMode(pathname);
  const tabs = mode === "hosting" ? hostingTabs : travelingTabs;
  const [menuOpen, setMenuOpen] = useState(false);
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  const closeMenu = () => setMenuOpen(false);
  const handleSignOut = () => {
    closeMenu();
    signOut({ redirectUrl: "/" });
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white md:hidden"
        style={{
          // Extend the nav into the iOS home-indicator safe area so it
          // sits flush against the physical bottom of the screen instead
          // of floating above a blank strip. env() falls back to 0 on
          // browsers that don't support it.
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex items-center justify-around py-2">
          {tabs.map((tab) => {
            const isActive = tab.href
              ? tab.match
                ? tab.match(pathname)
                : pathname === tab.href
              : tab.isMenu
              ? menuOpen
              : false;
            const className = cn(
              "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px]",
              isActive ? "text-brand" : "text-muted-foreground"
            );
            const Inner = (
              <>
                <tab.icon className={cn("h-5 w-5", isActive && "text-brand")} />
                <span className="font-medium">{tab.label}</span>
              </>
            );
            if (tab.isMenu) {
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className={className}
                >
                  {Inner}
                </button>
              );
            }
            return (
              <Link key={tab.label} href={tab.href!} className={className}>
                {Inner}
              </Link>
            );
          })}
        </div>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger className="hidden">trigger</SheetTrigger>
        <SheetContent side="right" className="w-[88%] max-w-[360px] p-6">
          <SheetHeader className="p-0">
            <SheetTitle className="text-2xl font-semibold">Menu</SheetTitle>
          </SheetHeader>

          {!isSignedIn ? (
            <div className="mt-6">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  Sign in
                </button>
              </SignInButton>
            </div>
          ) : (
            <div className="mt-4 space-y-1">
              {/* Hosting summary cards (purely visual for now) */}
              {mode === "hosting" && (
                <div className="mb-3 grid grid-cols-2 gap-3">
                  <Link
                    href="/hosting"
                    onClick={closeMenu}
                    className="rounded-2xl border border-border bg-white p-4 hover:bg-muted/30"
                  >
                    <div className="text-sm font-semibold">Earnings</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      This month
                    </div>
                    <div className="mt-3 text-2xl font-semibold">$0</div>
                  </Link>
                  <Link
                    href="/hosting"
                    onClick={closeMenu}
                    className="rounded-2xl border border-border bg-white p-4 hover:bg-muted/30"
                  >
                    <div className="text-sm font-semibold">Insights</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Listing performance
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Coming soon
                    </div>
                  </Link>
                </div>
              )}

              {mode === "hosting" && (
                <Link
                  href="/hosting/create"
                  onClick={closeMenu}
                  className="mb-2 flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm font-semibold hover:bg-muted"
                >
                  <Plus className="h-4 w-4" />
                  Create a new listing
                </Link>
              )}

              {mode === "traveling" && (
                <>
                  <MenuLink
                    href="/explore"
                    icon={Search}
                    label="Explore"
                    onClick={closeMenu}
                  />
                  <MenuLink
                    href="/trips"
                    icon={CalendarDays}
                    label="Trips"
                    onClick={closeMenu}
                  />
                  <MenuLink
                    href="/inbox"
                    icon={MessageCircle}
                    label="Messages"
                    onClick={closeMenu}
                  />
                  <DisabledMenuItem icon={Heart} label="Wishlists" />
                  <DisabledMenuItem icon={User} label="Profile" />
                </>
              )}

              {mode === "hosting" && (
                <DisabledMenuItem icon={User} label="Profile" />
              )}

              <Divider />

              <MenuLink
                href="/settings/notifications"
                icon={Settings}
                label="Account settings"
                onClick={closeMenu}
              />
              <DisabledMenuItem icon={Globe} label="Languages & currency" />
              <DisabledMenuItem icon={HelpCircle} label="Help Center" />

              <Divider />

              <MenuLink
                href={modeSwitchHref(mode)}
                icon={ArrowLeftRight}
                label={
                  mode === "hosting"
                    ? "Switch to traveling"
                    : "Switch to hosting"
                }
                onClick={closeMenu}
              />

              <Divider />

              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
                Log out
              </button>

              {user && (
                <p className="mt-6 text-center text-[11px] text-muted-foreground">
                  Signed in as {user.primaryEmailAddress?.emailAddress}
                </p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Divider() {
  return <div className="my-2 h-px bg-border" role="separator" />;
}

interface MenuLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}

function MenuLink({ href, icon: Icon, label, onClick }: MenuLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
    </Link>
  );
}

function DisabledMenuItem({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div
      aria-disabled="true"
      className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground/60"
    >
      <Icon className="h-4 w-4 text-muted-foreground/50" />
      {label}
      <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground/60">
        Soon
      </span>
    </div>
  );
}
