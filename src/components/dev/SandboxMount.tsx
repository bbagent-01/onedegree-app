// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.
//
// Site-wide mount: re-applies the sandbox CSS on every page load and
// renders the SandboxIndicator. Imported once from (app)/layout.tsx
// behind the same isImpersonationEnabled() gate that wraps the
// admin impersonation bar so prod bundles get nothing.
"use client";

import { useEffect } from "react";
import { applySandbox, SANDBOX_EVENT } from "@/lib/dev-theme/sandbox";
import { tokensByCategory } from "@/lib/dev-theme/tokens";
import { SandboxIndicator } from "./SandboxIndicator";

export default function SandboxMount() {
  useEffect(() => {
    const grouped = tokensByCategory();
    const all = [
      ...grouped.color,
      ...grouped.fontFamily,
      ...grouped.fontSize,
      ...grouped.spacing,
      ...grouped.radius,
      ...grouped.shadow,
      ...grouped.maxWidth,
    ];
    applySandbox(all);
    const sync = () => applySandbox(all);
    window.addEventListener(SANDBOX_EVENT, sync);
    return () => window.removeEventListener(SANDBOX_EVENT, sync);
  }, []);

  return <SandboxIndicator />;
}
