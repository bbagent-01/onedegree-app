/**
 * /dev/* gate (R13).
 *
 * Internal design-system + tooling routes. In production they're 404'd
 * to anyone who isn't in the impersonation admin allowlist; in dev /
 * preview environments anyone signed in (or out) can browse them.
 *
 * Pre-beta cleanup: when the impersonation infrastructure is ripped
 * out (per migration 022 ALPHA_REMOVAL_CHECKLIST), replace isAdmin()
 * with a dedicated DEV_ADMIN_USER_IDS env var or delete the /dev tree
 * entirely.
 */

import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/impersonation/session";

export default async function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "production") {
    const { userId } = await auth();
    if (!userId || !isAdmin(userId)) {
      notFound();
    }
  }
  return <>{children}</>;
}
