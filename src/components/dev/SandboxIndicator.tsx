// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.
"use client";

import { useEffect, useRef, useState } from "react";
import {
  isEnabled,
  SANDBOX_EVENT,
  setEnabled,
  setOverride,
  clearAll,
} from "@/lib/dev-theme/sandbox";
import {
  BRAND_PRESETS,
  getActivePresetId,
  getPresetById,
  setActivePresetId,
} from "@/lib/dev-theme/brand-presets";
import { ArrowRight, Check, Palette } from "lucide-react";

/**
 * Floating brand switcher mounted on every route via SandboxMount.
 *
 * Click the pill → a small menu opens with every brand preset (and a
 * "Default" option that disables sandbox entirely). One click flips
 * the entire site. Hidden in production by the same env gate that
 * wraps SandboxMount.
 *
 * Replaces the older non-interactive "SANDBOX THEME · ON" badge —
 * having a way to *exit* the sandbox without navigating to the
 * design-system page was the missing piece.
 */
export function SandboxIndicator() {
  const [active, setActive] = useState<string>("default");
  const [on, setOn] = useState(false);
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActive(getActivePresetId());
    setOn(isEnabled());
    const sync = () => {
      setActive(getActivePresetId());
      setOn(isEnabled());
    };
    window.addEventListener(SANDBOX_EVENT, sync);
    return () => window.removeEventListener(SANDBOX_EVENT, sync);
  }, []);

  // Close popover on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function applyPreset(id: string) {
    if (id === "default") {
      clearAll();
      setActivePresetId("default");
      setActive("default");
      setOn(false);
    } else {
      const preset = getPresetById(id);
      if (!preset) return;
      clearAll();
      setActivePresetId(id);
      for (const [tokenId, value] of Object.entries(preset.overrides)) {
        setOverride(tokenId, value);
      }
      setEnabled(true);
      setActive(id);
      setOn(true);
    }
    setOpen(false);
  }

  const activeLabel =
    getPresetById(active)?.label ?? "Default · Trustead";

  return (
    <>
      {/* Site-wide preview frame when a non-default preset is on —
          purple under default, mint under Guesty. Pointer-events
          off so it doesn't block clicks. */}
      {on && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[80] border-2 border-dashed"
          style={{
            borderColor:
              active === "guesty-forest" ? "#4FB191" : "#a855f7",
          }}
        />
      )}

      {/* Position-free wrapper. The parent admin-dock in (app)/layout
          .tsx places this in a flex row next to ImpersonationSwitcher,
          so the gap between the two icons is set by the dock's
          flex-gap, not a hardcoded `left-[17rem]` based on the old
          long pill width. `relative` keeps the popover anchor below
          working; `z-[90]` keeps the trigger above the dashed
          preview frame which is at z-[80]. */}
      <div ref={popoverRef} className="relative z-[90]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={`Brand preset · ${activeLabel}`}
          title={`Brand · ${activeLabel}`}
          className="flex h-10 w-10 items-center justify-center rounded-full border shadow-lg backdrop-blur transition hover:scale-105"
          style={{
            background:
              active === "guesty-forest"
                ? "rgba(11, 46, 38, 0.95)"
                : "rgba(24, 24, 27, 0.95)",
            borderColor:
              active === "guesty-forest"
                ? "rgba(191, 226, 212, 0.35)"
                : "rgba(255, 255, 255, 0.18)",
          }}
        >
          <Palette
            className="h-4 w-4"
            style={{
              color:
                active === "guesty-forest" ? "#BFE2D4" : "#a855f7",
            }}
          />
        </button>

        {open && (
          <div
            className="absolute bottom-[calc(100%+8px)] left-0 w-72 overflow-hidden rounded-xl border border-white/15 bg-zinc-900/95 shadow-2xl backdrop-blur-md"
          >
            <div className="border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/50">
              Brand · alpha admin
            </div>
            <div className="py-1">
              {BRAND_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
                >
                  <Check
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                      active === p.id ? "opacity-100" : "opacity-0"
                    }`}
                    style={{
                      color: active === "guesty-forest" ? "#BFE2D4" : "#a855f7",
                    }}
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium">
                      {p.label}
                    </span>
                    {p.blurb && (
                      <span className="block text-[11px] font-normal text-white/55">
                        {p.blurb}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
            <a
              href="/dev/design-system"
              className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2.5 text-xs font-medium text-white/85 transition hover:bg-white/10"
            >
              <span>Open design system</span>
              <ArrowRight className="h-3.5 w-3.5 text-white/60" />
            </a>
            <div className="border-t border-white/10 px-3 py-2 text-[10px] text-white/40">
              Persists in this tab only · clears on close
            </div>
          </div>
        )}
      </div>
    </>
  );
}
