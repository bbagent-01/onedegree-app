"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { OnboardingSwiper } from "./onboarding-swiper";

/**
 * Mounts on the app shell. On first sign-in we GET /api/users/onboarding and
 * show the swiper if seen=false. Dismissing or finishing POSTs to mark seen
 * and optimistically hides the overlay so it doesn't flash on the next nav.
 *
 * The "Replay onboarding" link in Settings sets the row back to NULL and
 * navigates back into the app — this component re-fetches on mount of the
 * next app-shell render and the flow re-shows.
 */
export function OnboardingGate() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user?.id) {
      setChecked(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/onboarding", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          setChecked(true);
          return;
        }
        const data = (await res.json()) as { seen?: boolean };
        if (!cancelled) {
          setOpen(!data.seen);
          setChecked(true);
        }
      } catch {
        if (!cancelled) setChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user?.id]);

  async function handleClose() {
    setOpen(false);
    try {
      await fetch("/api/users/onboarding", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Best-effort. If the write fails, the next mount will just show the
      // flow again — better than blocking the user behind the overlay.
    }
  }

  if (!checked || !open) return null;
  return <OnboardingSwiper onClose={handleClose} />;
}
