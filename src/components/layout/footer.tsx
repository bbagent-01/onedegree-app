"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Footer hidden on full-viewport routes that own the whole screen
 * (message threads, listing detail, create wizard, etc.). It still
 * renders on /browse so it naturally appears when you scroll past
 * all the cards.
 */
const HIDDEN_ROUTES = ["/inbox"];

interface Column {
  heading: string;
  links: { label: string; href: string }[];
}

const COLUMNS: Column[] = [
  {
    heading: "Support",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Contact us", href: "/help#contact" },
      { label: "Report a problem", href: "/help#contact" },
      { label: "Community guidelines", href: "#" },
    ],
  },
  {
    heading: "Hosting",
    links: [
      { label: "Become a host", href: "/hosting" },
      { label: "Create a listing", href: "/hosting/create" },
      { label: "Host dashboard", href: "/hosting" },
      { label: "Hosting resources", href: "/help" },
    ],
  },
  {
    heading: "One Degree B&B",
    links: [
      { label: "About", href: "#" },
      { label: "How it works", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press", href: "#" },
    ],
  },
  {
    heading: "Travel",
    links: [
      { label: "Explore", href: "/browse" },
      { label: "Wishlists", href: "/wishlists" },
      { label: "Trips", href: "/trips" },
      { label: "Messages", href: "/inbox" },
    ],
  },
];

export function Footer() {
  const pathname = usePathname() || "";
  const hidden = HIDDEN_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );
  if (hidden) return null;

  return (
    <footer className="hidden md:block border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-[1440px] px-10 py-12 lg:px-20">
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-semibold text-foreground">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} One Degree B&B. All rights
            reserved.
          </p>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
