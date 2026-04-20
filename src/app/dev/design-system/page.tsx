// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.

import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { isAdmin, isImpersonationEnabled } from "@/lib/impersonation/session";
import { tokensByCategory } from "@/lib/dev-theme/tokens";
import { getUsageMap } from "@/lib/dev-theme/usage";
import { DesignSystemRoot } from "@/components/dev/DesignSystemRoot";

// Triple-gated. Both gates fall through to notFound() so an
// unauthorized visitor cannot infer the route exists.
export default async function DesignSystemPage() {
  if (!isImpersonationEnabled()) notFound();
  const { userId } = await auth();
  if (!isAdmin(userId)) notFound();

  const tokens = tokensByCategory();
  const allFragments = [
    ...tokens.color,
    ...tokens.fontFamily,
    ...tokens.fontSize,
    ...tokens.spacing,
    ...tokens.radius,
    ...tokens.shadow,
    ...tokens.maxWidth,
  ].map((t) => t.utilityFragment);
  const usage = await getUsageMap(allFragments);

  return <DesignSystemRoot tokens={tokens} usage={usage} />;
}
