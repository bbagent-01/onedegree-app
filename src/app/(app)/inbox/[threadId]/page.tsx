import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import {
  getCurrentUser,
  getInboxForUser,
  getThreadDetail,
} from "@/lib/messaging-data";
import { InboxList } from "@/components/inbox/inbox-list";
import { ThreadDetailShell } from "@/components/inbox/thread-detail-shell";
import { SectionNav } from "@/components/layout/section-nav";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ threadId: string }>;
}

/**
 * Thread detail page. On desktop renders the same split layout as /inbox
 * (sidebar + selected thread). On mobile collapses to thread-only with a
 * back button. Both /inbox?thread=<id> and /inbox/<id> show the same UI on
 * desktop, so users always have the conversation list within reach.
 */
export default async function ThreadPage({ params }: PageProps) {
  const { threadId } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect(`/sign-in?redirect_url=/inbox/${threadId}`);
  }

  const [thread, threads] = await Promise.all([
    getThreadDetail(currentUser.id, threadId),
    getInboxForUser(currentUser.id),
  ]);
  if (!thread) notFound();

  return (
    <>
      <SectionNav />
      <div className="mx-auto w-full max-w-[1600px] md:px-6 md:py-6">
        <h1 className="mb-4 hidden text-2xl font-semibold md:block md:text-3xl">
          Messages
        </h1>

      {/* Mobile-only top bar with back button */}
      <div className="flex items-center gap-2 border-b border-border bg-white px-3 py-2 md:hidden">
        <Link
          href="/inbox"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Back to inbox"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 truncate text-sm font-semibold">
          {thread.other_user.name}
        </div>
      </div>

      {/*
        Heights match inbox-shell.tsx so the per-thread page doesn't
        overshoot the viewport. The S6 addendum fix (a9df1ca) only
        updated /inbox; this page was on the older 100vh-180px calc
        and the gap got newly visible once S9d added the origin
        proposal card + bridge action row at the top of the thread.
        - Desktop: 80 (nav) + 44 (section nav) + 48 (page py-6) + 52
          (h1 + mb-4) + 4 (buffer) = 228.
        - Mobile: no h1, but a 52px back bar replaces it; the
          original -160px figure remains close enough. Switch the
          unit to dvh so the iOS URL-bar collapse doesn't push the
          composer below the visible area.
      */}
      <div className="grid h-[calc(100dvh-160px)] max-h-[calc(100dvh-160px)] grid-cols-1 overflow-hidden md:h-[calc(100dvh-228px)] md:max-h-[calc(100dvh-228px)] md:grid-cols-[360px_1fr] md:rounded-xl md:border md:border-border md:bg-white xl:grid-cols-[320px_1fr_340px]">
        {/* Sidebar — hidden on mobile, visible on desktop */}
        <div className="hidden border-r border-border md:block md:overflow-y-auto">
          <InboxList
            threads={threads}
            currentUserId={currentUser.id}
            selectedId={threadId}
          />
        </div>
        {/* Thread + reservation sidebar live inside a client shell so
            nested cards' `inbox:thread-refresh` event re-fetches the
            thread and the sidebar/header chips catch up without a
            manual page reload. */}
        <ThreadDetailShell
          initialThread={thread}
          currentUserId={currentUser.id}
          currentUserName={currentUser.name || ""}
          currentUserAvatar={currentUser.avatar_url}
        />
      </div>
      </div>
    </>
  );
}
