"use client";

/**
 * Client wrapper for /inbox/[threadId]. Owns the ThreadDetail state
 * and listens for `inbox:thread-refresh` custom events fired by nested
 * action cards (Accept terms, Edit terms, Request edits, etc.) so the
 * sidebar badge + thread header badge + any other derived bits catch
 * up without a page reload.
 *
 * Same pattern as InboxShell (which covers /inbox list view). The
 * thread-detail route is its own entry point and needs the same
 * wiring; otherwise router.refresh() alone leaves the chips stale
 * until the user manually reloads.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ThreadDetail } from "@/lib/messaging-data";
import { ThreadView } from "./thread-view";
import { ReservationSidebar } from "./reservation-sidebar";

interface Props {
  initialThread: ThreadDetail;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string | null;
}

export function ThreadDetailShell({
  initialThread,
  currentUserId,
  currentUserName,
  currentUserAvatar,
}: Props) {
  const router = useRouter();
  const [thread, setThread] = useState<ThreadDetail>(initialThread);

  // Keep local state in sync when the RSC prop updates (e.g. after a
  // router.refresh() reruns the server component).
  useEffect(() => {
    setThread(initialThread);
  }, [initialThread]);

  // Listen for the custom refresh event and re-fetch the thread via
  // the JSON endpoint. Also kicks router.refresh() so any other
  // RSCs on the page (that read the same source) reconcile.
  useEffect(() => {
    const handler = () => {
      const id = thread.id;
      fetch(`/api/inbox/thread/${id}`, { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) return;
          const data = (await res.json()) as { thread?: ThreadDetail };
          if (data.thread && data.thread.id === id) {
            setThread(data.thread);
          }
        })
        .catch(() => {
          // Silent — nested card already surfaced its own toast.
        });
      router.refresh();
    };
    window.addEventListener("inbox:thread-refresh", handler);
    return () => window.removeEventListener("inbox:thread-refresh", handler);
  }, [thread.id, router]);

  return (
    <>
      <div className="flex flex-col overflow-hidden">
        <ThreadView
          thread={thread}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserAvatar={currentUserAvatar}
        />
      </div>
      <div className="hidden xl:flex xl:flex-col xl:overflow-hidden">
        <ReservationSidebar thread={thread} currentUserId={currentUserId} />
      </div>
    </>
  );
}
