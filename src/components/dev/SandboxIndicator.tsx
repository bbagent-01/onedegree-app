// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.
"use client";

import { useEffect, useState } from "react";
import { isEnabled, SANDBOX_EVENT } from "@/lib/dev-theme/sandbox";

/**
 * Purple dashed border + corner badge that appears on every route
 * while the sandbox toggle is on. Mounted both inside the design
 * system page (so it's visible even before navigating) and from
 * (app)/layout via SandboxMount (so it follows you site-wide).
 */
export function SandboxIndicator() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(isEnabled());
    const sync = () => setOn(isEnabled());
    window.addEventListener(SANDBOX_EVENT, sync);
    return () => window.removeEventListener(SANDBOX_EVENT, sync);
  }, []);

  if (!on) return null;
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[80] border-2 border-dashed border-purple-500"
      />
      <div className="pointer-events-none fixed bottom-3 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-purple-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-md">
        Sandbox theme · ON
      </div>
    </>
  );
}
