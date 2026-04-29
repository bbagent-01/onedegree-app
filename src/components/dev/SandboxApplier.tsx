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
  SANDBOX_EVENT,
} from "@/lib/dev-theme/sandbox";
import { tokensByCategory } from "@/lib/dev-theme/tokens";

export default function SandboxApplier() {
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

  return null;
}
