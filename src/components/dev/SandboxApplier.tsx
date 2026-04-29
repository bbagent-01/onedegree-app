// Theme overlay listener. The Trustead look is now baked into
// globals.css + tailwind.config.ts as the canonical theme — this
// component no longer auto-enables anything on first mount. It
// stays mounted purely so the admin brand-switcher drawer can still
// inject overrides on top of the canonical CSS (e.g. for comparing
// to a legacy Attio look during dev). When sandbox is not enabled
// (the default state) this component does nothing visible.
"use client";

import { useEffect } from "react";
import {
  applySandbox,
  clearAll,
  SANDBOX_EVENT,
} from "@/lib/dev-theme/sandbox";
import { tokensByCategory } from "@/lib/dev-theme/tokens";

// One-time migration flag. Visitors who were here before the trustead
// canonicalization (commit f96547e) have `dev2.sandbox.enabled.v1` and
// the override map persisted in sessionStorage from when the applier
// auto-enabled trustead. Without this cleanup, applySandbox reads the
// stale flag and re-injects the overlay on top of the now-canonical
// CSS, leaving `data-theme="sandbox"` set on <html> and the user
// stuck with two layers of the same theme. Run clearAll once per
// fresh tab to drop the legacy state.
const CANONICAL_MIGRATION_KEY = "dev2.canonical-migrated.v1";

export default function SandboxApplier() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (sessionStorage.getItem(CANONICAL_MIGRATION_KEY) !== "1") {
          clearAll();
          sessionStorage.setItem(CANONICAL_MIGRATION_KEY, "1");
        }
      } catch {
        /* sessionStorage may be unavailable (private mode quirks) — fine */
      }
    }

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

  return null;
}
