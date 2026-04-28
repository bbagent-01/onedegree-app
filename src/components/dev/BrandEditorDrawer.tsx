// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable
// alongside Dev1 and Dev3.
//
// Live-site theme editor drawer. Slides in from the right, lists every
// editable token grouped by category, and writes overrides via the
// existing sandbox machinery (setOverride/clearOverride). Edits flash
// site-wide instantly because SandboxClient subscribes to SANDBOX_EVENT.
//
// Phase 1: text/color inputs only (parity with /dev/design-system
// SandboxControls). Phase 2 adds slider/shadow widgets.
"use client";

import { useEffect, useState } from "react";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import {
  clearAll,
  clearOverride,
  downloadFile,
  exportAsCssDiff,
  exportAsJson,
  readOverrides,
  SANDBOX_EVENT,
  setOverride,
  writeOverrides,
} from "@/lib/dev-theme/sandbox";
import { tokensByCategory } from "@/lib/dev-theme/tokens";
import type { TokenSpec, TokenCategory } from "@/lib/dev-theme/tokens";
import {
  TRUSTEAD_THEME_VARS,
  THEME_VAR_GROUPS,
  type ThemeVar,
} from "@/lib/dev-theme/theme-vars";

interface Props {
  open: boolean;
  onClose: () => void;
}

const CATEGORY_ORDER: TokenCategory[] = [
  "color",
  "fontFamily",
  "fontSize",
  "spacing",
  "radius",
  "shadow",
  "maxWidth",
];

const CATEGORY_LABEL: Record<TokenCategory, string> = {
  color: "Color",
  fontFamily: "Font family",
  fontSize: "Font size",
  spacing: "Spacing",
  radius: "Radius",
  shadow: "Shadow",
  maxWidth: "Max width",
};

export function BrandEditorDrawer({ open, onClose }: Props) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    // Trustead theme is first + open by default — these are the
    // values that actually control what Loren sees on screen. The
    // raw Tailwind token categories below are for finer-grained
    // utility class tweaks.
    Surfaces: true,
    Type: true,
    Accents: true,
    Effects: false,
    color: false,
    fontSize: false,
    fontFamily: false,
    spacing: false,
    radius: false,
    shadow: false,
    maxWidth: false,
  });
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setOverrides(readOverrides());
    const sync = () => setOverrides(readOverrides());
    window.addEventListener(SANDBOX_EVENT, sync);
    return () => window.removeEventListener(SANDBOX_EVENT, sync);
  }, []);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const grouped = tokensByCategory();
  const overriddenIds = Object.keys(overrides);
  const lower = filter.trim().toLowerCase();

  return (
    <>
      {/* No backdrop — the whole point is to edit while interacting
          with the live page behind. Click the X or press Escape to
          close. */}

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-label="Theme editor"
        className="fixed inset-y-0 right-0 z-[201] flex w-[440px] max-w-[100vw] flex-col border-l shadow-2xl"
        style={{
          background: "#0B2E26",
          borderColor: "rgba(245, 241, 230, 0.14)",
          color: "#F5F1E6",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "rgba(245, 241, 230, 0.14)" }}
        >
          <div>
            <h2 className="text-base font-semibold">Theme editor</h2>
            <p className="mt-0.5 text-[11px] opacity-60">
              Edits live in this tab only · clears on close
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close theme editor"
            className="flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter input */}
        <div
          className="shrink-0 border-b px-5 py-3"
          style={{ borderColor: "rgba(245, 241, 230, 0.14)" }}
        >
          <input
            type="text"
            placeholder="Filter tokens (e.g. brand, trust, font)…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:opacity-50 focus:outline-none focus:ring-1"
            style={{
              borderColor: "rgba(245, 241, 230, 0.14)",
              color: "#F5F1E6",
            }}
          />
        </div>

        {/* Token list — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Trustead theme — curated CSS variables that drive the
              visible look of the theme. Loren edits these to actually
              move what he sees on screen. */}
          <div
            className="border-b"
            style={{ borderColor: "rgba(245, 241, 230, 0.18)" }}
          >
            <div
              className="px-5 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "#BFE2D4" }}
            >
              Trustead theme
            </div>
            {THEME_VAR_GROUPS.map((group) => {
              const items = TRUSTEAD_THEME_VARS.filter(
                (v) => v.group === group
              ).filter(
                (v) =>
                  !lower ||
                  v.id.toLowerCase().includes(lower) ||
                  v.name.toLowerCase().includes(lower) ||
                  group.toLowerCase().includes(lower)
              );
              if (items.length === 0) return null;
              const isOpen = lower ? true : expanded[group];
              const overriddenInGroup = items.filter(
                (v) => v.id in overrides
              ).length;
              return (
                <div
                  key={group}
                  className="border-t"
                  style={{ borderColor: "rgba(245, 241, 230, 0.10)" }}
                >
                  <button
                    onClick={() =>
                      setExpanded((s) => ({ ...s, [group]: !s[group] }))
                    }
                    className="flex w-full items-center justify-between px-5 py-2.5 text-left transition hover:bg-white/5"
                  >
                    <span className="flex items-center gap-2 text-[12px] font-medium opacity-80">
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                      {group}
                    </span>
                    <span className="text-[11px] opacity-50">
                      {overriddenInGroup > 0
                        ? `${overriddenInGroup} edited / ${items.length}`
                        : `${items.length}`}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="space-y-1 px-3 pb-3">
                      {items.map((v) => (
                        <ThemeVarRow
                          key={v.id}
                          themeVar={v}
                          value={overrides[v.id] ?? v.default}
                          overridden={v.id in overrides}
                          onChange={(val) => setOverride(v.id, val)}
                          onClear={() => clearOverride(v.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tailwind tokens — finer-grained utility-class tweaks */}
          <div
            className="px-5 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-50"
          >
            Tailwind tokens
          </div>
          {CATEGORY_ORDER.map((cat) => {
            const items = grouped[cat] ?? [];
            const filtered = lower
              ? items.filter(
                  (t) =>
                    t.id.toLowerCase().includes(lower) ||
                    t.name.toLowerCase().includes(lower) ||
                    t.group.toLowerCase().includes(lower)
                )
              : items;
            if (filtered.length === 0) return null;
            const isOpen = lower ? true : expanded[cat];
            const overriddenInCat = filtered.filter(
              (t) => t.id in overrides
            ).length;
            return (
              <div
                key={cat}
                className="border-b"
                style={{ borderColor: "rgba(245, 241, 230, 0.10)" }}
              >
                <button
                  onClick={() =>
                    setExpanded((s) => ({ ...s, [cat]: !s[cat] }))
                  }
                  className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-white/5"
                >
                  <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider opacity-80">
                    {isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    {CATEGORY_LABEL[cat]}
                  </span>
                  <span className="text-[11px] opacity-50">
                    {overriddenInCat > 0
                      ? `${overriddenInCat} edited / ${filtered.length}`
                      : `${filtered.length}`}
                  </span>
                </button>
                {isOpen && (
                  <div className="space-y-1 px-3 pb-3">
                    {filtered.map((t) => (
                      <TokenRow
                        key={t.id}
                        token={t}
                        value={overrides[t.id] ?? t.value}
                        overridden={t.id in overrides}
                        onChange={(v) => setOverride(t.id, v)}
                        onClear={() => clearOverride(t.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div
          className="shrink-0 border-t px-5 py-3"
          style={{ borderColor: "rgba(245, 241, 230, 0.14)" }}
        >
          <div className="mb-2 flex items-center justify-between text-[11px] opacity-70">
            <span>
              {overriddenIds.length} token
              {overriddenIds.length === 1 ? "" : "s"} edited
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                downloadFile(
                  "green-overrides.css",
                  exportAsCssDiff(overrides, [
                    ...grouped.color,
                    ...grouped.fontFamily,
                    ...grouped.fontSize,
                    ...grouped.spacing,
                    ...grouped.radius,
                    ...grouped.shadow,
                    ...grouped.maxWidth,
                  ]),
                  "text/css"
                );
              }}
              disabled={overriddenIds.length === 0}
              className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-white/10 disabled:opacity-40"
              style={{ borderColor: "rgba(245, 241, 230, 0.20)" }}
            >
              Export CSS
            </button>
            <button
              onClick={() => {
                downloadFile(
                  "green-overrides.json",
                  exportAsJson(overrides),
                  "application/json"
                );
              }}
              disabled={overriddenIds.length === 0}
              className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-white/10 disabled:opacity-40"
              style={{ borderColor: "rgba(245, 241, 230, 0.20)" }}
            >
              Export JSON
            </button>
            <button
              onClick={() => {
                if (confirm("Clear all edited values?")) writeOverrides({});
              }}
              disabled={overriddenIds.length === 0}
              className="ml-auto rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-white/10 disabled:opacity-40"
              style={{ borderColor: "rgba(245, 241, 230, 0.20)" }}
            >
              Reset values
            </button>
            <button
              onClick={() => {
                if (confirm("Reset everything and turn sandbox off?")) {
                  clearAll();
                  onClose();
                }
              }}
              className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-red-500/20"
              style={{
                borderColor: "rgba(248, 113, 113, 0.30)",
                color: "#FCA5A5",
              }}
            >
              Reset all
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function TokenRow({
  token,
  value,
  overridden,
  onChange,
  onClear,
}: {
  token: TokenSpec;
  value: string;
  overridden: boolean;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  const numeric = parseNumericValue(value);
  const isNumericCategory =
    token.category === "fontSize" ||
    token.category === "spacing" ||
    token.category === "radius" ||
    token.category === "maxWidth";

  return (
    <div
      className="flex items-start gap-2 rounded-md border px-2 py-1.5"
      style={{
        background: overridden
          ? "rgba(191, 226, 212, 0.10)"
          : "rgba(7, 34, 27, 0.55)",
        borderColor: overridden
          ? "rgba(191, 226, 212, 0.35)"
          : "rgba(245, 241, 230, 0.08)",
      }}
    >
      {token.category === "color" && (
        <input
          type="color"
          value={normalizeColor(value)}
          onChange={(e) => onChange(e.target.value)}
          className="mt-0.5 h-7 w-9 shrink-0 cursor-pointer rounded border-0"
          aria-label={`Color picker for ${token.name}`}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[12px] font-medium">{token.name}</span>
          {overridden && (
            <button
              onClick={onClear}
              className="text-[10px] underline opacity-70 hover:opacity-100"
              style={{ color: "#BFE2D4" }}
            >
              reset
            </button>
          )}
        </div>
        {isNumericCategory && numeric ? (
          <NumericSlider
            num={numeric.num}
            unit={numeric.unit}
            category={token.category}
            onChange={(n) => onChange(`${n}${numeric.unit}`)}
          />
        ) : null}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-0.5 w-full rounded border bg-transparent px-1.5 py-0.5 font-mono text-[11px] focus:outline-none focus:ring-1"
          style={{
            borderColor: "rgba(245, 241, 230, 0.10)",
            color: "#F5F1E6",
          }}
        />
      </div>
    </div>
  );
}

function NumericSlider({
  num,
  unit,
  category,
  onChange,
}: {
  num: number;
  unit: string;
  category: TokenCategory;
  onChange: (n: number) => void;
}) {
  const range = sliderRange(category, unit, num);
  return (
    <div className="mt-1 flex items-center gap-2">
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={Math.min(Math.max(num, range.min), range.max)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-[#BFE2D4]"
      />
      <span
        className="w-14 shrink-0 text-right font-mono text-[10px] opacity-70"
        title={`${num}${unit}`}
      >
        {Number.isInteger(num) ? num : num.toFixed(2)}
        {unit}
      </span>
    </div>
  );
}

// Pick a range that's wide enough to be useful but tight enough to
// give the slider meaningful resolution. Uses the canonical value
// as a centerpoint when possible.
function sliderRange(
  category: TokenCategory,
  unit: string,
  current: number
): { min: number; max: number; step: number } {
  if (unit === "rem") {
    return { min: 0, max: Math.max(8, current * 2.5), step: 0.05 };
  }
  if (unit === "em") {
    return { min: 0, max: Math.max(4, current * 2.5), step: 0.05 };
  }
  if (unit === "%") {
    return { min: 0, max: 100, step: 1 };
  }
  // Default: px.
  switch (category) {
    case "fontSize":
      return { min: 8, max: Math.max(96, current * 2), step: 1 };
    case "spacing":
      return { min: 0, max: Math.max(64, current * 3), step: 1 };
    case "radius":
      return { min: 0, max: Math.max(48, current * 3), step: 1 };
    case "maxWidth":
      return { min: 240, max: Math.max(1920, current * 1.5), step: 8 };
    default:
      return { min: 0, max: Math.max(100, current * 2.5), step: 1 };
  }
}

// Try to peel a `<number><unit>` out of a token value. Returns null
// for non-trivial values (clamp(...), calc(...), comma-separated tuples).
function parseNumericValue(
  v: string
): { num: number; unit: string } | null {
  const trimmed = v.trim();
  // Reject anything that isn't a single number+unit.
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)(px|rem|em|%|)$/);
  if (!match) return null;
  return { num: parseFloat(match[1]), unit: match[2] || "px" };
}

function normalizeColor(v: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : "#000000";
}

function ThemeVarRow({
  themeVar,
  value,
  overridden,
  onChange,
  onClear,
}: {
  themeVar: ThemeVar;
  value: string;
  overridden: boolean;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  const numeric =
    themeVar.kind === "size" || themeVar.kind === "blur"
      ? parseNumericValue(value)
      : null;

  return (
    <div
      className="flex items-start gap-2 rounded-md border px-2 py-1.5"
      style={{
        background: overridden
          ? "rgba(191, 226, 212, 0.10)"
          : "rgba(7, 34, 27, 0.55)",
        borderColor: overridden
          ? "rgba(191, 226, 212, 0.35)"
          : "rgba(245, 241, 230, 0.08)",
      }}
    >
      {themeVar.kind === "color" && (
        <input
          type="color"
          value={normalizeColor(value)}
          onChange={(e) => onChange(e.target.value)}
          className="mt-0.5 h-7 w-9 shrink-0 cursor-pointer rounded border-0"
          aria-label={`Color picker for ${themeVar.name}`}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[12px] font-medium">
            {themeVar.name}
          </span>
          {overridden && (
            <button
              onClick={onClear}
              className="text-[10px] underline opacity-70 hover:opacity-100"
              style={{ color: "#BFE2D4" }}
            >
              reset
            </button>
          )}
        </div>
        {themeVar.hint && (
          <div className="mt-0.5 text-[10px] opacity-50">{themeVar.hint}</div>
        )}
        {numeric ? (
          <div className="mt-1 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={Math.max(48, numeric.num * 3)}
              step={1}
              value={numeric.num}
              onChange={(e) =>
                onChange(`${parseFloat(e.target.value)}${numeric.unit}`)
              }
              className="flex-1 accent-[#BFE2D4]"
            />
            <span className="w-14 shrink-0 text-right font-mono text-[10px] opacity-70">
              {numeric.num}
              {numeric.unit}
            </span>
          </div>
        ) : null}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-0.5 w-full rounded border bg-transparent px-1.5 py-0.5 font-mono text-[11px] focus:outline-none focus:ring-1"
          style={{
            borderColor: "rgba(245, 241, 230, 0.10)",
            color: "#F5F1E6",
          }}
        />
      </div>
    </div>
  );
}
