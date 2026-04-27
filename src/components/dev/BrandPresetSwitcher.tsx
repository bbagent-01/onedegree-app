// REMOVE BEFORE BETA — Dev2 (design system page).
"use client";

import { useEffect, useState } from "react";
import {
  BRAND_PRESETS,
  getActivePresetId,
  getPresetById,
  setActivePresetId,
  type BrandPreset,
} from "@/lib/dev-theme/brand-presets";
import {
  SANDBOX_EVENT,
  clearAll,
  setEnabled,
  setOverride,
} from "@/lib/dev-theme/sandbox";
import { cn } from "@/lib/utils";

/**
 * Top-of-page brand-preset switcher. Picking a preset:
 *   1. Clears any previous overrides
 *   2. Bulk-applies the preset's override map via setOverride()
 *   3. Enables the sandbox CSS
 *   4. Persists the preset id to sessionStorage
 *
 * The "default" preset takes the inverse path — disable sandbox,
 * clear overrides — to restore the canonical alpha-c look.
 *
 * The switcher is mounted once in DesignSystemRoot's header so the
 * picker is always visible and the choice applies across every
 * showcase section + page preview.
 */
export function BrandPresetSwitcher() {
  const [active, setActive] = useState<string>("default");

  useEffect(() => {
    setActive(getActivePresetId());
    const sync = () => setActive(getActivePresetId());
    window.addEventListener(SANDBOX_EVENT, sync);
    return () => window.removeEventListener(SANDBOX_EVENT, sync);
  }, []);

  function applyPreset(preset: BrandPreset) {
    // Default = wipe everything.
    if (preset.id === "default") {
      clearAll();
      setActivePresetId("default");
      setActive("default");
      return;
    }
    // Other presets — clear, then re-apply this preset's overrides.
    clearAll();
    setActivePresetId(preset.id);
    for (const [tokenId, value] of Object.entries(preset.overrides)) {
      setOverride(tokenId, value);
    }
    setEnabled(true);
    setActive(preset.id);
  }

  const activePreset = getPresetById(active) ?? BRAND_PRESETS[0];

  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-surface/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Brand preset
        </p>
        <span className="text-[11px] text-muted-foreground">
          applies to every live component on every page
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {BRAND_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              active === p.id
                ? "border-brand bg-brand text-white"
                : "border-border bg-white hover:bg-muted"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {activePreset.blurb && (
        <p className="mt-2 text-xs text-muted-foreground">
          {activePreset.blurb}
        </p>
      )}
    </div>
  );
}
