// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.

import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { isAdmin, isImpersonationEnabled } from "@/lib/impersonation/session";
import { tokensByCategory } from "@/lib/dev-theme/tokens";
import { DesignSystemRoot } from "@/components/dev/DesignSystemRoot";
import usageCounts from "@/lib/dev-theme/usage-counts.json";

// Cloudflare Pages runs every route on the edge runtime. Usage counts
// can't be computed at request time (no fs on edge), so they're
// generated at build time via scripts/generate-token-usage.mjs and
// imported as a static JSON map.
export const runtime = "edge";

// Triple-gated. Both gates fall through to notFound() so an
// unauthorized visitor cannot infer the route exists.
export default async function DesignSystemPage() {
  if (!isImpersonationEnabled()) notFound();
  const { userId } = await auth();
  if (!isAdmin(userId)) notFound();

  const tokens = tokensByCategory();
  return (
    <DesignSystemRoot
      tokens={tokens}
      usage={usageCounts as Record<string, number>}
    />
  );
}
