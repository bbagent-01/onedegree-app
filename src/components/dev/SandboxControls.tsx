// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.
"use client";

import { useEffect, useState } from "react";
import type { TokenSpec } from "@/lib/dev-theme/tokens";
import {
  clearAll,
  clearOverride,
  downloadFile,
  exportAsCssDiff,
  exportAsJson,
  isEnabled,
  readOverrides,
  SANDBOX_EVENT,
  setEnabled,
  setOverride,
} from "@/lib/dev-theme/sandbox";

interface Props {
  tokens: TokenSpec[];
}

/**
 * The sandbox panel. Lists every editable token with the appropriate
 * input (color picker for colors, text input for everything else),
 * with a per-token Reset and a global Reset all + Export buttons.
 *
 * Edits write to sessionStorage; the SandboxMount in (app)/layout
 * picks them up via the SANDBOX_EVENT and re-applies overrides
 * site-wide on the next render of any route.
 */
export function SandboxControls({ tokens }: Props) {
  const [on, setOn] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    setOn(isEnabled());
    setOverrides(readOverrides());
    const sync = () => {
      setOn(isEnabled());
      setOverrides(readOverrides());
    };
    window.addEventListener(SANDBOX_EVENT, sync);
    return () => window.removeEventListener(SANDBOX_EVENT, sync);
  }, []);

  const overriddenIds = Object.keys(overrides);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Sandbox theme</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit any token to preview it across every component. Overrides
          live in <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">sessionStorage</code>{" "}
          only — closing the tab clears them. Canonical files in{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">tailwind.config.ts</code>{" "}
          are never touched. When you&apos;re happy, click{" "}
          <strong>Export as CSS diff</strong> to copy the changes for
          permanent adoption.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-card space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setEnabled(!on)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              on ? "bg-purple-600 text-white" : "bg-muted text-foreground"
            }`}
          >
            Sandbox theme · {on ? "ON" : "OFF"}
          </button>
          <span className="text-sm text-muted-foreground">
            {overriddenIds.length} token
            {overriddenIds.length === 1 ? "" : "s"} overridden
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              onClick={() =>
                downloadFile(
                  "sandbox-overrides.json",
                  exportAsJson(overrides),
                  "application/json"
                )
              }
              disabled={overriddenIds.length === 0}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              Export as JSON
            </button>
            <button
              onClick={() =>
                downloadFile(
                  "sandbox-overrides.css",
                  exportAsCssDiff(overrides, tokens),
                  "text/css"
                )
              }
              disabled={overriddenIds.length === 0}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              Export as CSS diff
            </button>
            <button
              onClick={() => {
                if (confirm("Clear every sandbox override and turn it OFF?"))
                  clearAll();
              }}
              disabled={overriddenIds.length === 0 && !on}
              className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
            >
              Reset all
            </button>
          </div>
        </div>
        {!on && overriddenIds.length > 0 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
            You have overrides but sandbox is OFF — they won&apos;t apply
            anywhere until you flip the toggle on.
          </p>
        )}
      </div>

      <TokenList
        tokens={tokens}
        overrides={overrides}
        onChange={setOverride}
        onClear={clearOverride}
      />
    </section>
  );
}

function TokenList({
  tokens,
  overrides,
  onChange,
  onClear,
}: {
  tokens: TokenSpec[];
  overrides: Record<string, string>;
  onChange: (id: string, v: string) => void;
  onClear: (id: string) => void;
}) {
  const grouped = new Map<string, TokenSpec[]>();
  for (const t of tokens) {
    const arr = grouped.get(t.category) ?? [];
    arr.push(t);
    grouped.set(t.category, arr);
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category} className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {category}
          </h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {items.map((t) => {
              const val = overrides[t.id] ?? t.value;
              const overridden = t.id in overrides;
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 rounded-lg border p-2 ${
                    overridden ? "border-purple-400 bg-purple-50" : "bg-white"
                  }`}
                >
                  {t.category === "color" ? (
                    <input
                      type="color"
                      value={normalizeColor(val)}
                      onChange={(e) => onChange(t.id, e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded border"
                      aria-label={`Edit ${t.name}`}
                    />
                  ) : null}
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => onChange(t.id, e.target.value)}
                    className="min-w-0 flex-1 rounded border px-2 py-1 font-mono text-[12px]"
                    aria-label={`${t.name} value`}
                  />
                  <code className="hidden text-[11px] text-muted-foreground sm:block">
                    {t.name}
                  </code>
                  {overridden && (
                    <button
                      onClick={() => onClear(t.id)}
                      className="text-[11px] text-purple-700 underline"
                    >
                      reset
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// <input type="color"> only accepts 6-digit hex. Fall back to black so
// the picker doesn't refuse to render when a token is hsl/rgb/named.
function normalizeColor(v: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : "#000000";
}
