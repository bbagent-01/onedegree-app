import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getCurrentUser, getInboxForUser, getThreadDetail } from "@/lib/messaging-data";
import { InboxList } from "@/components/inbox/inbox-list";
import { ThreadView } from "@/components/inbox/thread-view";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ thread?: string }>;
}

export default async function InboxPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/sign-in?redirect_url=/inbox");
  }

  const threads = await getInboxForUser(currentUser.id);

  // Desktop split-view: optional ?thread=<id> selects a thread on the right.
  // If none specified, default to the first thread.
  const selectedId = sp.thread || threads[0]?.id || null;
  const selected = selectedId
    ? await getThreadDetail(currentUser.id, selectedId)
    : null;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-6">
      <h1 className="mb-4 text-2xl font-semibold md:text-3xl">Messages</h1>

      {threads.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">No messages yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Once you request a stay or someone reaches out about your listing,
            your conversations will live here.
          </p>
          <Link
            href="/browse"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Browse listings
          </Link>
        </div>
      ) : (
        <div className="grid h-[calc(100vh-180px)] grid-cols-1 overflow-hidden rounded-xl border border-border bg-white md:grid-cols-[360px_1fr]">
          {/* Left column: list. Hidden on mobile when a thread is in URL. */}
          <div className="border-r border-border md:overflow-y-auto">
            <InboxList
              threads={threads}
              currentUserId={currentUser.id}
              selectedId={selectedId}
            />
          </div>
          {/* Right column: thread. Hidden on mobile (mobile uses /inbox/[id]). */}
          <div className="hidden md:flex md:flex-col">
            {selected ? (
              <ThreadView
                key={selected.id}
                thread={selected}
                currentUserId={currentUser.id}
                currentUserName={currentUser.name || ""}
                currentUserAvatar={currentUser.avatar_url}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Select a conversation
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
