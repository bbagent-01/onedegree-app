// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.
"use client";

import { useMemo } from "react";
import type { TokenSpec } from "@/lib/dev-theme/tokens";

interface Props {
  title: string;
  tokens: TokenSpec[];
  usage: Record<string, number>;
  kind: "color" | "typography" | "spacing" | "radius" | "shadow";
}

export function TokenBrowser({ title, tokens, usage, kind }: Props) {
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
}: {
  token: TokenSpec;
  usageCount: number;
  kind: Props["kind"];
}) {
  return (
    <div className="rounded-xl border bg-white p-3 shadow-card">
      <div className="mb-2">
        <Preview token={token} kind={kind} />
      </div>
      <div className="space-y-0.5">
        <div className="flex items-center justify-between">
          <code className="font-mono text-[12px] font-medium">{token.name}</code>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {usageCount} {usageCount === 1 ? "file" : "files"}
          </span>
        </div>
        <code className="block truncate font-mono text-[11px] text-muted-foreground">
          {token.value}
        </code>
      </div>
    </div>
  );
}

function Preview({ token, kind }: { token: TokenSpec; kind: Props["kind"] }) {
  if (kind === "color") {
    return (
      <div
        className="h-16 rounded-lg border"
        style={{ background: token.value }}
      />
    );
  }
  if (kind === "typography") {
    if (token.category === "fontFamily") {
      return (
        <div
          className="rounded-lg border bg-muted/40 p-3 text-base"
          style={{ fontFamily: token.value }}
        >
          The quick brown fox · 0123
        </div>
      );
    }
    // fontSize: value is "size / lineHeight"
    const [size] = token.value.split("/").map((s) => s.trim());
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
          style={{ width: token.value, height: 16 }}
        />
        <span className="text-[11px] text-muted-foreground">{token.value}</span>
      </div>
    );
  }
  if (kind === "radius") {
    return (
      <div
        className="h-16 w-full bg-muted/40"
        style={{ borderRadius: token.value }}
      />
    );
  }
  if (kind === "shadow") {
    return (
      <div
        className="h-16 rounded-xl bg-white"
        style={{ boxShadow: token.value }}
      />
    );
  }
  return null;
}
