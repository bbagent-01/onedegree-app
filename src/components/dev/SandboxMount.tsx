// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable
// alongside Dev1 and Dev3.
//
// Server component that admin-gates the site-wide brand-preset
// circle. Mirrors ImpersonationMount: triple gate (build-time env
// flag set in (app)/layout.tsx + runtime env flag + isAdmin) so
// non-admin users never ship the client bundle nor see the float.

import { auth } from "@clerk/nextjs/server";
import { isImpersonationEnabled, isAdmin } from "@/lib/impersonation/session";
import SandboxClient from "./SandboxClient";

export default async function SandboxMount() {
  if (!isImpersonationEnabled()) return null;
  const { userId: clerkId } = await auth();
  if (!clerkId || !isAdmin(clerkId)) return null;
  return <SandboxClient />;
}
