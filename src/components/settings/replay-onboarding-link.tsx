"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, PlayCircle } from "lucide-react";

export function ReplayOnboardingLink() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/users/onboarding", {
        method: "DELETE",
        credentials: "include",
      });
      router.push("/browse");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-muted/40 disabled:opacity-60"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <PlayCircle className="h-4 w-4 text-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">Replay onboarding</div>
        <div className="text-xs text-muted-foreground">
          Show the welcome tour again from the start.
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
