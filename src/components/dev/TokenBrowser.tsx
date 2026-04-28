// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.
"use client";

import { useEffect, useMemo, useState } from "react";
import type { TokenSpec } from "@/lib/dev-theme/tokens";
import {
  readOverrides,
  SANDBOX_EVENT,
  type SandboxOverrides,
} from "@/lib/dev-theme/sandbox";

interface Props {
  title: string;
  tokens: TokenSpec[];
  usage: Record<string, number>;
  kind: "color" | "typography" | "spacing" | "radius" | "shadow";
}

/**
 * Live-subscribe to sandbox overrides so the token previews
 * re-render whenever Loren edits a value. Without this, the
 * swatches hardcode `style={{ background: token.value }}` at
 * mount time and never reflect an override — which is what
 * tripped the first round of sandbox testing.
 */
function useSandboxOverrides(): SandboxOverrides {
  const [o, setO] = useState<SandboxOverrides>({});
  useEffect(() => {
    setO(readOverrides());
    const sync = () => setO(readOverrides());
    window.addEventListener(SANDBOX_EVENT, sync);
    return () => window.removeEventListener(SANDBOX_EVENT, sync);
  }, []);
  return o;
}

export function TokenBrowser({ title, tokens, usage, kind }: Props) {
  const overrides = useSandboxOverrides();
  const grouped = useMemo(() => {
    const m = new Map<string, TokenSpec[]>();
    for (const t of tokens) {
      const arr = m.get(t.group) ?? [];
      arr.push(t);
      m.set(t.group, arr);
    }
    return Array.from(m.entries());
  }, [tokens]);

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Auto-enumerated from{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
            tailwind.config.ts
          </code>
          . Usage counts come from a live grep over{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
            src/
          </code>
          .
        </p>
      </div>

      {grouped.map(([group, items]) => (
        <div key={group} className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {group}
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((t) => (
              <TokenCard
                key={t.id}
                token={t}
                usageCount={usage[t.utilityFragment] ?? 0}
                kind={kind}
                override={overrides[t.id]}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function TokenCard({
  token,
  usageCount,
  kind,
  override,
}: {
  token: TokenSpec;
  usageCount: number;
  kind: Props["kind"];
  override?: string;
}) {
  const hasOverride = typeof override === "string";
  const displayValue = override ?? token.value;
  return (
    <div
      className={`rounded-xl border bg-white p-3 shadow-card ${
        hasOverride ? "ring-2 ring-purple-400" : ""
      }`}
    >
      <div className="mb-2">
        <Preview token={token} value={displayValue} kind={kind} />
      </div>
      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <code className="font-mono text-[12px] font-medium">{token.name}</code>
          {hasOverride ? (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
              overridden
            </span>
          ) : usageCount > 0 ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {usageCount} {usageCount === 1 ? "file" : "files"}
            </span>
          ) : null}
        </div>
        <code className="block break-all font-mono text-[11px] leading-snug text-muted-foreground">
          {displayValue}
          {hasOverride && (
            <span className="ml-1 text-purple-600">
              (was {token.value})
            </span>
          )}
        </code>
      </div>
    </div>
  );
}

function Preview({
  token,
  value,
  kind,
}: {
  token: TokenSpec;
  value: string;
  kind: Props["kind"];
}) {
  if (kind === "color") {
    return (
      <div
        className="h-16 rounded-lg border"
        style={{ background: value }}
      />
    );
  }
  if (kind === "typography") {
    if (token.category === "fontFamily") {
      return (
        <div
          className="rounded-lg border bg-muted/40 p-3 text-base"
          style={{ fontFamily: value }}
        >
          The quick brown fox · 0123
        </div>
      );
    }
    // fontSize: value is "size / lineHeight"
    const [size] = value.split("/").map((s) => s.trim());
    return (
      <div
        className="rounded-lg border bg-muted/40 p-3"
        style={{ fontSize: size }}
      >
        Aa
      </div>
    );
  }
  if (kind === "spacing") {
    return (
      <div className="flex items-center gap-3">
        <div
          className="rounded bg-brand"
          style={{ width: value, height: 16 }}
        />
        <span className="text-[11px] text-muted-foreground">{value}</span>
      </div>
    );
  }
  if (kind === "radius") {
    return (
      <div className="flex h-16 w-full items-center justify-center border bg-muted/40">
        <div
          className="h-12 w-20 bg-brand-100"
          style={{ borderRadius: value }}
          aria-label={`radius ${value}`}
        />
        <span className="ml-3 font-mono text-[11px] text-muted-foreground">
          {value}
        </span>
      </div>
    );
  }
  if (kind === "shadow") {
    return (
      <div
        className="h-16 rounded-xl bg-white"
        style={{ boxShadow: value }}
      />
    );
  }
  return null;
}
