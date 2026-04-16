"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Search,
  MessageCircle,
  Menu,
  LayoutGrid,
  Plus,
  Settings,
  LogOut,
  Heart,
  User,
  Globe,
  HelpCircle,
  Shield,
  UserPlus,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk, SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface Tab {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: (path: string) => boolean;
  isMenu?: boolean;
}

// Single unified bottom nav — the dashboard is the hub for both
// hosting and traveling. No mode switch.
const tabs: Tab[] = [
  {
    href: "/browse",
    label: "Explore",
    icon: Search,
    match: (p) => p.startsWith("/browse"),
  },
  {
    href: "/wishlists",
    label: "Wishlists",
    icon: Heart,
    match: (p) => p.startsWith("/wishlists"),
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutGrid,
    match: (p) =>
      p === "/dashboard" ||
      p.startsWith("/dashboard") ||
      p.startsWith("/hosting") ||
      p.startsWith("/trips"),
  },
  {
    href: "/inbox",
    label: "Inbox",
    icon: MessageCircle,
    match: (p) => p.startsWith("/inbox"),
  },
  { label: "Menu", icon: Menu, isMenu: true },
];

export function MobileNav() {
  const pathname = usePathname() || "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  // Look up Supabase user-row id so the "Profile" link can deep-link to
  // /profile/:id. Falls back to /profile/edit until it resolves.
  const [profileId, setProfileId] = useState<string | null>(null);
  useEffect(() => {
    if (!isSignedIn || profileId) return;
    fetch("/api/users/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.id) setProfileId(data.id);
      })
      .catch(() => {});
  }, [isSignedIn, profileId]);
  const profileHref = profileId ? `/profile/${profileId}` : "/profile/edit";

  // Publish the nav's actual measured height as a CSS variable so the
  // mobile reserve bar on listing pages can sit flush with it. Prevents
  // the 2–3px gap that would otherwise appear at the seam.
  const navRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const update = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty("--mobile-nav-h", `${h}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const closeMenu = () => setMenuOpen(false);
  const handleSignOut = () => {
    closeMenu();
    signOut({ redirectUrl: "/" });
  };

  return (
    <>
      <nav
        ref={navRef}
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white md:hidden"
        style={{
          // Extend the nav into the iOS home-indicator safe area so it
          // sits flush against the physical bottom of the screen instead
          // of floating above a blank strip. env() falls back to 0 on
          // browsers that don't support it.
          paddingBottom: "env(safe-area-inset-bottom)",
          // Force the nav onto its own compositing layer. Without this,
          // iOS Safari briefly hides fixed-bottom elements when the URL
          // bar collapses on scroll-down and restores them on scroll-up,
          // which reads as a flash of missing icons.
          WebkitTransform: "translate3d(0,0,0)",
          transform: "translate3d(0,0,0)",
          willChange: "transform",
          WebkitBackfaceVisibility: "hidden",
          backfaceVisibility: "hidden",
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
            <div className="mt-6 space-y-2">
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="w-full rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-background hover:bg-foreground/90"
                  onClick={closeMenu}
                >
                  Sign up
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="w-full rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold hover:bg-muted"
                  onClick={closeMenu}
                >
                  Sign in
                </button>
              </SignInButton>

              <Divider />

              <MenuLink
                href="/browse"
                icon={Search}
                label="Explore listings"
                onClick={closeMenu}
              />
              <MenuLink
                href="/help"
                icon={HelpCircle}
                label="Help Center"
                onClick={closeMenu}
              />
            </div>
          ) : (
            <div className="mt-4 space-y-1">
              <MenuLink
                href="/browse"
                icon={Search}
                label="Explore"
                onClick={closeMenu}
              />
              <MenuLink
                href="/wishlists"
                icon={Heart}
                label="Wishlists"
                onClick={closeMenu}
              />
              <MenuLink
                href="/dashboard"
                icon={LayoutGrid}
                label="Dashboard"
                onClick={closeMenu}
              />
              <MenuLink
                href="/dashboard?tab=traveling"
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
              <MenuLink
                href={profileHref}
                icon={User}
                label="Profile"
                onClick={closeMenu}
              />

              <Divider />

              <MenuLink
                href="/hosting/create"
                icon={Plus}
                label="Create a listing"
                onClick={closeMenu}
              />
              <MenuLink
                href="/vouch"
                icon={Shield}
                label="Vouch for a member"
                onClick={closeMenu}
              />
              <MenuLink
                href="/invite"
                icon={UserPlus}
                label="Invite someone"
                onClick={closeMenu}
              />

              <Divider />

              <MenuLink
                href="/settings"
                icon={Settings}
                label="Account settings"
                onClick={closeMenu}
              />
              <DisabledMenuItem icon={Globe} label="Languages & currency" />
              <MenuLink
                href="/help"
                icon={HelpCircle}
                label="Help Center"
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
