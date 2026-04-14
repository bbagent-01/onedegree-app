"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const LIMIT = 300;

export function DescriptionSection({ text }: { text: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const content = text?.trim() ?? "";

  if (!content) {
    return (
      <p className="text-sm text-muted-foreground">
        No description yet.
      </p>
    );
  }

  const needsTruncation = content.length > LIMIT;
  const display =
    !expanded && needsTruncation ? content.slice(0, LIMIT).trimEnd() + "…" : content;

  return (
    <div>
      <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
        {display}
      </p>
      {needsTruncation && !expanded && (
        <Button
          variant="ghost"
          onClick={() => setExpanded(true)}
          className="mt-3 h-auto p-0 font-semibold text-foreground underline hover:bg-transparent"
        >
          Show more
        </Button>
      )}
    </div>
  );
}
