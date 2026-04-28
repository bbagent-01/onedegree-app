// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable
// alongside Dev1 and Dev3.
//
// Client-only piece of the sandbox: re-applies the theme overrides
// on every page load and renders the SandboxIndicator. The server
// wrapper SandboxMount.tsx admin-gates this so non-admin users get
// nothing.
"use client";

import { useEffect } from "react";
import { applySandbox, SANDBOX_EVENT } from "@/lib/dev-theme/sandbox";
import { tokensByCategory } from "@/lib/dev-theme/tokens";
import { SandboxIndicator } from "./SandboxIndicator";

export default function SandboxClient() {
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
