"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Close-the-loop toaster. Mounts once at the app layout and, on the
 * viewer's next page load after someone vouches them back, emits a
 * single low-key "B vouched for you back." toast per pair. Delivery
 * state lives on `vouch_back_notifications.delivered_at`; the POST
 * endpoint atomically fetches-and-marks so a re-mount (HMR, route
 * change) never replays the same toast.
 */
export function VouchBackToaster() {
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch("/api/vouch-back/notifications", {
          method: "POST",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          notifications: Array<{
            id: string;
            userId: string;
            userName: string;
          }>;
        };
        for (const n of data.notifications) {
          const first = n.userName.split(" ")[0] || n.userName;
          toast.success(`${first} vouched for you back.`);
        }
      } catch {
        // silent — not user-facing
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
