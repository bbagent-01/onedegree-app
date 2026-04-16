/**
 * Determines whether the user is in the "hosting" or "traveling" experience
 * based on the current pathname. The /dashboard routes are hosting mode;
 * everything else is traveling.
 */

export type NavMode = "hosting" | "traveling";

export function getNavMode(pathname: string | null | undefined): NavMode {
  if (!pathname) return "traveling";
  if (
    pathname === "/hosting" ||
    pathname.startsWith("/hosting/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/")
  ) {
    return "hosting";
  }
  return "traveling";
}

/** Default destination when toggling to the other mode. */
export function modeSwitchHref(currentMode: NavMode): string {
  return currentMode === "hosting" ? "/browse" : "/dashboard";
}
