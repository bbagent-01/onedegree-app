// Always-rendered theme applier. Mounts for EVERY user on the (app)
// layout — not admin-gated — so the Trustead theme renders as the
// site's default look at trustead.app, not just for admin sessions.
// Admin-only editor UI (palette circle + drawer) is in a separate
// admin-gated tree (SandboxMount → SandboxClient).
//
// Lives in the dev/ folder for now since it depends on the sandbox
// machinery, but the file itself is permanent: when dev tooling is
// removed pre-beta, the override layer in sandbox.ts simplifies but
// this applier (or its successor) stays.
"use client";

import { useEffect } from "react";
import {
  applySandbox,
  SANDBOX_EVENT,
  setEnabled,
  setOverride,
} from "@/lib/dev-theme/sandbox";
import { tokensByCategory } from "@/lib/dev-theme/tokens";
import {
  getPresetById,
  setActivePresetId,
  STORAGE_KEY as PRESET_STORAGE_KEY,
} from "@/lib/dev-theme/brand-presets";

const DEFAULT_PRESET_ID = "trustead";

export default function SandboxApplier() {
  useEffect(() => {
    // First mount in this tab: if no preset has been explicitly
    // chosen yet, activate Trustead so the page renders in the new
    // theme. Reloading the same tab preserves whatever's set —
    // including "Legacy · Attio Light" if the user (admin) switched
    // away. New tab → empty sessionStorage → Trustead again.
    const hasExplicitChoice =
      sessionStorage.getItem(PRESET_STORAGE_KEY) !== null;
    if (!hasExplicitChoice) {
      const preset = getPresetById(DEFAULT_PRESET_ID);
      if (preset) {
        setActivePresetId(DEFAULT_PRESET_ID);
        for (const [id, value] of Object.entries(preset.overrides)) {
          setOverride(id, value);
        }
        setEnabled(true);
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
