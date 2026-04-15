"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavMode, modeSwitchHref } from "@/lib/nav-mode";

/**
 * Inline "Switch to hosting" / "Switch to traveling" link that lives in the
 * desktop nav alongside the hamburger menu. Mirrors Airbnb's persistent
 * mode-switch affordance.
 */
export function ModeToggle() {
  const pathname = usePathname();
  const mode = getNavMode(pathname);
  const label = mode === "hosting" ? "Switch to traveling" : "Switch to hosting";
  const href = modeSwitchHref(mode);
  return (
    <Link
      href={href}
      className="hidden lg:inline-flex rounded-full px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
    >
      {label}
    </Link>
  );
}
