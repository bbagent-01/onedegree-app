"use client";

import { useState } from "react";
import { OnboardingSwiper } from "@/components/onboarding/onboarding-swiper";

/**
 * Public design-preview route. Always shows the welcome swiper, no auth or
 * DB state involved. On close, the swiper closes locally and a tiny
 * "preview ended" card appears with a button to restart — so QA can scrub
 * through the flow as many times as they want without leaving the page.
 */
export default function OnboardingPreviewPage() {
  const [showing, setShowing] = useState(true);

  if (showing) {
    return <OnboardingSwiper onClose={() => setShowing(false)} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold text-foreground">Preview ended</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You closed the welcome flow. Click below to view it again.
        </p>
        <button
          type="button"
          onClick={() => setShowing(true)}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-6 text-sm font-semibold text-brand-foreground hover:bg-brand-600"
        >
          Replay preview
        </button>
      </div>
    </div>
  );
}
