// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable
// alongside Dev1 and Dev3.
//
// Client-only piece of the sandbox: re-applies the theme overrides
// on every page load and renders the SandboxIndicator. The server
// wrapper SandboxMount.tsx admin-gates this so non-admin users get
// nothing.
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
import { SandboxIndicator } from "./SandboxIndicator";

const DEFAULT_PRESET_ID = "green";

export default function SandboxClient() {
  useEffect(() => {
    // First mount in this tab: if Loren hasn't explicitly chosen a
    // preset yet (sessionStorage empty), auto-activate Green so a
    // fresh tab refresh lands in the new theme without a manual
    // click. Refreshing the same tab preserves whatever's set —
    // including "Default · Trustead" if Loren switched away. New
    // tab → empty sessionStorage → Green again.
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

  return <SandboxIndicator />;
}
