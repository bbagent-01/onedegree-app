"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { InboxList } from "./inbox-list";
import { ThreadView } from "./thread-view";
import { ReservationSidebar } from "./reservation-sidebar";
import type { InboxThread, ThreadDetail } from "@/lib/messaging-data";

interface Props {
  threads: InboxThread[];
  initialSelected: ThreadDetail | null;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string | null;
}

/**
 * Client-side shell that owns split-view state and swaps threads
 * without a full RSC round-trip. Thread switches hit
 * /api/inbox/thread/[id] instead of navigating — the inbox list,
 * trust paths, and initial render still happen server-side on first
 * load, so deep links to /inbox?thread=X still render fully.
 *
 * Background: a click used to call router.push('/inbox?thread=X')
 * which re-ran getInboxForUser + getThreadDetail + both trust batch
 * queries every time. Felt sluggish. Now only the detail query runs.
 */
export function InboxShell({
  threads,
  initialSelected,
  currentUserId,
  currentUserName,
  currentUserAvatar,
}: Props) {
  const [selected, setSelected] = useState<ThreadDetail | null>(initialSelected);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  // Tracks the most recent click so a slow earlier request doesn't
  // overwrite the newer one if the user flips threads quickly.
  const latestRequestId = useRef<string | null>(initialSelected?.id ?? null);

  const handleSelect = useCallback(
    (threadId: string) => {
      if (selected?.id === threadId || loadingId === threadId) return;

      latestRequestId.current = threadId;
      setLoadingId(threadId);
      // Update URL without kicking off an RSC navigation.
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `/inbox?thread=${threadId}`);
      }

      fetch(`/api/inbox/thread/${threadId}`, { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) throw new Error(`Failed (${res.status})`);
          const data = (await res.json()) as { thread: ThreadDetail };
          if (latestRequestId.current !== threadId) return;
          setSelected(data.thread);
          setLoadingId(null);
        })
        .catch(() => {
          if (latestRequestId.current !== threadId) return;
          setLoadingId(null);
          toast.error("Couldn't load that conversation");
        });
    },
    [selected?.id, loadingId]
  );

  // The row visually marked as selected should follow the clicked
  // id immediately, even before the fetch settles. Otherwise the
  // list stays on the old highlight for the duration of the fetch.
  const visuallySelectedId = loadingId ?? selected?.id ?? null;

  return (
    <div className="grid h-[calc(100vh-180px)] grid-cols-1 overflow-hidden rounded-xl border border-border bg-white md:grid-cols-[360px_1fr] xl:grid-cols-[320px_1fr_340px]">
      <div className="border-r border-border md:overflow-y-auto">
        <InboxList
          threads={threads}
          currentUserId={currentUserId}
          selectedId={visuallySelectedId}
          onSelectThread={handleSelect}
        />
      </div>
      <div className="relative hidden min-h-0 overflow-hidden md:flex md:flex-col">
        {selected ? (
          <div
            className={
              loadingId
                ? "flex min-h-0 flex-1 flex-col overflow-hidden opacity-60 transition-opacity"
                : "flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity"
            }
          >
            <ThreadView
              key={selected.id}
              thread={selected}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserAvatar={currentUserAvatar}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a conversation
          </div>
        )}
        {loadingId && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </div>
          </div>
        )}
      </div>
      {selected && (
        <div className="hidden xl:flex xl:flex-col xl:overflow-hidden">
          <ReservationSidebar thread={selected} currentUserId={currentUserId} />
        </div>
      )}
    </div>
  );
}
