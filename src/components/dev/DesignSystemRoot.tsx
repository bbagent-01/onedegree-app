// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.
"use client";

import { useEffect, useState } from "react";
import type { TokenSpec, TokenCategory } from "@/lib/dev-theme/tokens";
import { applySandbox, isEnabled, SANDBOX_EVENT } from "@/lib/dev-theme/sandbox";
import { Sidebar, type Section } from "./Sidebar";
import { TokenBrowser } from "./TokenBrowser";
import { ComponentShowcase } from "./ComponentShowcase";
import { PatternShowcase } from "./PatternShowcase";
import { SandboxControls } from "./SandboxControls";
import { SandboxIndicator } from "./SandboxIndicator";

interface Props {
  tokens: Record<TokenCategory, TokenSpec[]>;
  usage: Record<string, number>;
}

const SECTIONS: Array<{ id: Section; label: string; group: string }> = [
  { id: "tokens-color", label: "Colors", group: "Tokens" },
  { id: "tokens-typography", label: "Typography", group: "Tokens" },
  { id: "tokens-spacing", label: "Spacing", group: "Tokens" },
  { id: "tokens-radius", label: "Radius", group: "Tokens" },
  { id: "tokens-shadow", label: "Shadows", group: "Tokens" },
  { id: "components-trust", label: "Trust components", group: "Components" },
  { id: "components-profile", label: "Profile badges", group: "Components" },
  { id: "components-listing", label: "Listing card (simple)", group: "Components" },
  { id: "components-listing-full", label: "Listing card (live, gated variants)", group: "Components" },
  { id: "components-proposals", label: "Proposals", group: "Components" },
  { id: "components-forms", label: "Forms & inputs", group: "Components" },
  { id: "components-nav", label: "Nav, header, footer", group: "Components" },
  { id: "components-inbox", label: "Inbox & messaging", group: "Components" },
  { id: "components-threads", label: "Thread structured cards", group: "Components" },
  { id: "components-timeline", label: "Trip timeline", group: "Components" },
  { id: "components-trips", label: "Trips & reviews", group: "Components" },
  { id: "pages-browse", label: "/browse", group: "Pages" },
  { id: "pages-listing", label: "/listings/[id]", group: "Pages" },
  { id: "pages-profile", label: "/profile/[id]", group: "Pages" },
  { id: "pages-inbox", label: "/inbox", group: "Pages" },
  { id: "pages-proposals", label: "/proposals", group: "Pages" },
  { id: "patterns", label: "Patterns", group: "Patterns" },
  { id: "sandbox", label: "Sandbox theme", group: "Sandbox" },
];

export function DesignSystemRoot({ tokens, usage }: Props) {
  const [active, setActive] = useState<Section>("tokens-color");
  const allTokens = [
    ...tokens.color,
    ...tokens.fontFamily,
    ...tokens.fontSize,
    ...tokens.spacing,
    ...tokens.radius,
    ...tokens.shadow,
    ...tokens.maxWidth,
  ];

  // Re-apply sandbox CSS on mount and whenever overrides change.
  useEffect(() => {
    applySandbox(allTokens);
    const onChange = () => applySandbox(allTokens);
    window.addEventListener(SANDBOX_EVENT, onChange);
    return () => window.removeEventListener(SANDBOX_EVENT, onChange);
  }, [allTokens]);

  // Confirmation when navigating away with sandbox ON. We use a
  // beforeunload guard — that catches tab close + reload + URL bar.
  // Internal link navigation in Next.js doesn't fire beforeunload, so
  // that case is handled separately inside SandboxIndicator.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEnabled()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return (
    <>
      <SandboxIndicator />
      <div className="flex min-h-screen">
        <Sidebar sections={SECTIONS} active={active} onSelect={setActive} />
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="mx-auto max-w-5xl p-6 md:p-10 space-y-12">
            <header className="border-b pb-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Dev · alpha-only · admin
              </p>
              <h1 className="mt-1 text-3xl font-semibold">Trustead Design System</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Live tokens, components, and patterns. Edit tokens in the
                Sandbox section to preview overrides without touching
                canonical theme files.
              </p>
            </header>

            {active === "tokens-color" && (
              <TokenBrowser
                title="Colors"
                tokens={tokens.color}
                usage={usage}
                kind="color"
              />
            )}
            {active === "tokens-typography" && (
              <TokenBrowser
                title="Typography"
                tokens={[...tokens.fontFamily, ...tokens.fontSize]}
                usage={usage}
                kind="typography"
              />
            )}
            {active === "tokens-spacing" && (
              <TokenBrowser
                title="Spacing"
                tokens={tokens.spacing}
                usage={usage}
                kind="spacing"
              />
            )}
            {active === "tokens-radius" && (
              <TokenBrowser
                title="Radius"
                tokens={tokens.radius}
                usage={usage}
                kind="radius"
              />
            )}
            {active === "tokens-shadow" && (
              <TokenBrowser
                title="Shadows"
                tokens={tokens.shadow}
                usage={usage}
                kind="shadow"
              />
            )}
            {active.startsWith("components-") && (
              <ComponentShowcase section={active} />
            )}
            {active.startsWith("pages-") && (
              <ComponentShowcase section={active} />
            )}
            {active === "patterns" && <PatternShowcase />}
            {active === "sandbox" && (
              <SandboxControls tokens={allTokens} />
            )}
          </div>
        </main>
      </div>
    </>
  );
}
