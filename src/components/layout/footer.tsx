"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Footer hidden on full-viewport routes that own the whole screen
 * (message threads, listing detail, create wizard, etc.). It still
 * renders on /browse so it naturally appears when you scroll past
 * all the cards.
 */
const HIDDEN_ROUTES = ["/inbox"];

interface FooterLink {
  label: string;
  href: string;
  /** When true, render as disabled with a "Soon" pill instead of a link. */
  soon?: boolean;
  /** When true, render as a plain <a> (mailto:, external, etc.) instead of Next Link. */
  external?: boolean;
}

interface Column {
  heading: string;
  links: FooterLink[];
}

const COLUMNS: Column[] = [
  {
    heading: "Support",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Contact us", href: "/help#contact" },
      { label: "Report a problem", href: "/help#contact" },
      { label: "Community guidelines", href: "#", soon: true },
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
      { label: "About", href: "#", soon: true },
      { label: "How it works", href: "#", soon: true },
      { label: "Careers", href: "#", soon: true },
      { label: "Press", href: "#", soon: true },
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

const LEGAL_LINKS: FooterLink[] = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Beta Status", href: "/legal-status" },
  { label: "Contact", href: "mailto:hello@staytrustead.com", external: true },
];

function FooterLinkItem({ link }: { link: FooterLink }) {
  if (link.soon) {
    return (
      <span
        aria-disabled="true"
        className={cn(
          "inline-flex cursor-not-allowed items-center gap-1.5 text-muted-foreground/50"
        )}
      >
        {link.label}
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
          Soon
        </span>
      </span>
    );
  }
  if (link.external) {
    return (
      <a
        href={link.href}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        {link.label}
      </a>
    );
  }
  return (
    <Link
      href={link.href}
      className="text-muted-foreground transition-colors hover:text-foreground"
    >
      {link.label}
    </Link>
  );
}

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
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <FooterLinkItem link={link} />
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
            {LEGAL_LINKS.map((link) => (
              <FooterLinkItem key={link.label} link={link} />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
