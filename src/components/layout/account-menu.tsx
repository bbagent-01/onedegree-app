"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  ArrowLeftRight,
  Heart,
  User,
  Globe,
  HelpCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getNavMode, modeSwitchHref } from "@/lib/nav-mode";

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
  const pathname = usePathname();
  const mode = getNavMode(pathname);
  const [open, setOpen] = useState(false);

  if (!isSignedIn) return null;

  const close = () => setOpen(false);
  const handleSignOut = () => {
    close();
    signOut({ redirectUrl: "/" });
  };

  // Build mode-aware menu sections. Only include links to routes that
  // actually exist in the app today — easier to extend later than to leave
  // dead links lying around.
  const travelingSections: MenuSection[] = [
    {
      items: [
        { href: "/explore", label: "Explore", icon: Search },
        { href: "/trips", label: "Trips", icon: CalendarDays },
        { href: "/inbox", label: "Messages", icon: MessageCircle },
        { label: "Wishlists", icon: Heart, disabled: true },
        { label: "Profile", icon: User, disabled: true },
      ],
    },
    {
      items: [
        {
          href: "/settings/notifications",
          label: "Account settings",
          icon: Settings,
        },
        { label: "Languages & currency", icon: Globe, disabled: true },
        { label: "Help Center", icon: HelpCircle, disabled: true },
      ],
    },
    {
      items: [
        {
          href: modeSwitchHref("traveling"),
          label: "Switch to hosting",
          icon: ArrowLeftRight,
        },
      ],
    },
    {
      items: [
        { label: "Log out", icon: LogOut, onClick: handleSignOut },
      ],
    },
  ];

  const hostingSections: MenuSection[] = [
    {
      items: [
        { href: "/hosting", label: "Hosting dashboard", icon: LayoutGrid },
        { href: "/hosting/create", label: "Create a new listing", icon: Plus },
        { href: "/inbox", label: "Messages", icon: MessageCircle },
        { label: "Profile", icon: User, disabled: true },
      ],
    },
    {
      items: [
        {
          href: "/settings/notifications",
          label: "Account settings",
          icon: Settings,
        },
        { label: "Languages & currency", icon: Globe, disabled: true },
        { label: "Help Center", icon: HelpCircle, disabled: true },
      ],
    },
    {
      items: [
        {
          href: modeSwitchHref("hosting"),
          label: "Switch to traveling",
          icon: ArrowLeftRight,
        },
      ],
    },
    {
      items: [
        { label: "Log out", icon: LogOut, onClick: handleSignOut },
      ],
    },
  ];

  const sections = mode === "hosting" ? hostingSections : travelingSections;

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
