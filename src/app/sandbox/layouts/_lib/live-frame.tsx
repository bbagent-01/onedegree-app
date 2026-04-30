// Shared helper for /sandbox/layouts/* replica routes.
// Renders a same-origin iframe pointing at the matching live route
// so the sandbox shows the EXACT current page (visual fidelity, real
// nav chrome, real auth context if the viewer is signed in). When
// Loren picks a surface to iterate, we clone the relevant live
// components into a sibling route (e.g. /sandbox/layouts/browse-v2)
// and make changes there — that's where re-implementation actually
// matters.

import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function LiveFrame({
  src,
  liveLabel,
  note,
}: {
  src: string;
  liveLabel: string;
  note?: string;
}) {
  return (
    <div className="flex h-[calc(100vh-36px)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-background/95 px-4 py-2 backdrop-blur md:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Live current state
          </p>
          <p className="truncate font-mono text-xs text-foreground">
            {liveLabel}
          </p>
        </div>
        <Link
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card/60"
        >
          <ExternalLink className="h-3 w-3" />
          Open in new tab
        </Link>
      </div>
      {note && (
        <div className="border-b border-border/60 bg-warning/10 px-4 py-2 text-xs text-foreground md:px-6">
          {note}
        </div>
      )}
      <iframe
        src={src}
        className="flex-1 w-full border-0 bg-white"
        title={`Live ${liveLabel}`}
      />
    </div>
  );
}
