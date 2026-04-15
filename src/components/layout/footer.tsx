"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Routes that own their full viewport (search + map layouts, message
 * threads, etc) and shouldn't have a footer peeking at the bottom.
 */
const HIDDEN_ROUTES = ["/browse", "/inbox"];

export function Footer() {
  const pathname = usePathname() || "";
  const hidden = HIDDEN_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );
  if (hidden) return null;

  return (
    <footer className="hidden md:block border-t border-border bg-surface">
      <div className="w-full px-10 lg:px-20 py-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} One Degree B&B. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
