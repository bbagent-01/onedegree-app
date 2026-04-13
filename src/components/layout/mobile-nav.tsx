"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Heart,
  CalendarDays,
  MessageCircle,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/wishlists", label: "Wishlists", icon: Heart },
  { href: "/trips", label: "Trips", icon: CalendarDays },
  { href: "/inbox", label: "Inbox", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around h-14 px-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 text-xs transition-colors",
                active
                  ? "text-brand font-medium"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for notched phones */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
