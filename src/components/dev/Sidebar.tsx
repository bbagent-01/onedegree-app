// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.
"use client";

import { cn } from "@/lib/utils";

export type Section =
  | "tokens-color"
  | "tokens-typography"
  | "tokens-spacing"
  | "tokens-radius"
  | "tokens-shadow"
  | "components-trust"
  | "components-listing"
  | "components-forms"
  | "components-nav"
  | "components-inbox"
  | "components-threads"
  | "components-timeline"
  | "components-trips"
  | "patterns"
  | "sandbox";

interface Props {
  sections: Array<{ id: Section; label: string; group: string }>;
  active: Section;
  onSelect: (s: Section) => void;
}

export function Sidebar({ sections, active, onSelect }: Props) {
  // Group adjacent items with the same `group` label.
  const grouped: Array<{
    group: string;
    items: Array<{ id: Section; label: string }>;
  }> = [];
  for (const s of sections) {
    const last = grouped[grouped.length - 1];
    if (last && last.group === s.group) last.items.push(s);
    else grouped.push({ group: s.group, items: [s] });
  }

  return (
    <aside className="hidden md:block w-60 shrink-0 border-r bg-surface/50">
      <div className="sticky top-0 max-h-screen overflow-y-auto p-4 space-y-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Dev2 · Design System
        </div>
        {grouped.map((g) => (
          <div key={g.group} className="space-y-1">
            <div className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {g.group}
            </div>
            {g.items.map((it) => (
              <button
                key={it.id}
                onClick={() => onSelect(it.id)}
                className={cn(
                  "block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  active === it.id
                    ? "bg-brand text-white"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {it.label}
              </button>
            ))}
          </div>
        ))}
        <div className="border-t pt-3 text-[11px] text-muted-foreground">
          <p>
            Mobile: scroll the page. The full nav is visible at &ge;768px.
          </p>
        </div>
      </div>
    </aside>
  );
}
