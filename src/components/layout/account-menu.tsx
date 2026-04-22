"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  Menu,
  CalendarDays,
  MessageCircle,
  Plus,
  LayoutGrid,
  Search,
  LogOut,
  Settings,
  Heart,
  User,
  Globe,
  HelpCircle,
  Shield,
  UserPlus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MenuItem {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  disabled?: boolean;
}

interface MenuSection {
  items: MenuItem[];
}

function initials(name: string | null | undefined) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AccountMenu() {
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Look up the Supabase user row id so the "Profile" link can deep-link
  // straight to /profile/:id. We fetch lazily via a tiny /api/users/me
  // endpoint. If it's not ready yet we fall back to /profile/edit.
  useEffect(() => {
    if (!isSignedIn || profileId) return;
    fetch("/api/users/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.id) setProfileId(data.id);
      })
      .catch(() => {});
  }, [isSignedIn, profileId]);

  const close = () => setOpen(false);
  const handleSignOut = () => {
    close();
    signOut({ redirectUrl: "/" });
  };
  const profileHref = profileId ? `/profile/${profileId}` : "/profile/edit";

  // Logged-out users get a compact hamburger menu — no avatar
  // placeholder since there's no user to represent.
  if (!isSignedIn) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white transition-shadow hover:shadow-md"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-60 rounded-2xl border border-border bg-white p-2 shadow-lg"
        >
          <Link
            href="/sign-up"
            onClick={close}
            className="block w-full rounded-lg bg-foreground px-4 py-2.5 text-center text-sm font-semibold text-background hover:bg-foreground/90"
          >
            Sign up
          </Link>
          <Link
            href="/sign-in"
            onClick={close}
            className="mt-2 block w-full rounded-lg border border-border bg-white px-4 py-2.5 text-center text-sm font-semibold hover:bg-muted"
          >
            Sign in
          </Link>

          <div className="my-2 h-px bg-border" role="separator" />

          <Link
            href="/browse"
            onClick={close}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            Explore listings
          </Link>
          <Link
            href="/help"
            onClick={close}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            Help Center
          </Link>
        </PopoverContent>
      </Popover>
    );
  }

  // Unified menu — no mode switching. The dashboard is the single hub
  // for hosting, traveling, and network activity.
  const sections: MenuSection[] = [
    {
      items: [
        { href: "/browse", label: "Explore", icon: Search },
        { href: "/proposals", label: "Proposals", icon: MessageCircle },
        { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
        { href: "/inbox", label: "Messages", icon: MessageCircle },
        { href: "/wishlists", label: "Wishlists", icon: Heart },
        { href: profileHref, label: "Profile", icon: User },
      ],
    },
    {
      items: [
        { href: "/hosting/create", label: "Create a listing", icon: Plus },
        { href: "/proposals/new", label: "Post a proposal", icon: Plus },
        { href: "/alerts", label: "Proposal alerts", icon: MessageCircle },
        { href: "/dashboard?tab=traveling", label: "Trips", icon: CalendarDays },
        { href: "/vouch", label: "Vouch for a member", icon: Shield },
        { href: "/invite", label: "Invite someone", icon: UserPlus },
      ],
    },
    {
      items: [
        {
          href: "/settings",
          label: "Account settings",
          icon: Settings,
        },
        { label: "Languages & currency", icon: Globe, disabled: true },
        { href: "/help", label: "Help Center", icon: HelpCircle },
      ],
    },
    {
      items: [{ label: "Log out", icon: LogOut, onClick: handleSignOut }],
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-border bg-white py-1.5 pl-3 pr-1.5 text-sm font-medium transition-shadow hover:shadow-md"
        )}
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
        <Avatar className="h-7 w-7">
          {user?.imageUrl && <AvatarImage src={user.imageUrl} alt={user.fullName || ""} />}
          <AvatarFallback className="text-[10px]">
            {initials(user?.fullName || user?.firstName)}
          </AvatarFallback>
        </Avatar>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-64 rounded-2xl border border-border bg-white p-2 shadow-lg"
      >
        {sections.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {sectionIdx > 0 && (
              <div className="my-1 h-px bg-border" role="separator" />
            )}
            {section.items.map((item) => {
              const baseClass = "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-left";
              if (item.disabled) {
                return (
                  <div
                    key={item.label}
                    className={cn(
                      baseClass,
                      "cursor-not-allowed text-muted-foreground/60"
                    )}
                    aria-disabled="true"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground/50" />
                    {item.label}
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground/60">
                      Soon
                    </span>
                  </div>
                );
              }
              const className = cn(
                baseClass,
                "text-foreground transition-colors hover:bg-muted"
              );
              if (item.onClick) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className={className}
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </button>
                );
              }
              return (
                <Link
                  key={item.label}
                  href={item.href!}
                  onClick={close}
                  className={className}
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
