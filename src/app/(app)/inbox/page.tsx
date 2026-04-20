import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getCurrentUser, getInboxForUser, getThreadDetail } from "@/lib/messaging-data";
import { InboxList } from "@/components/inbox/inbox-list";
import { ThreadView } from "@/components/inbox/thread-view";
import { ReservationSidebar } from "@/components/inbox/reservation-sidebar";
import { SectionNav } from "@/components/layout/section-nav";

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
    <>
      <SectionNav />
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6">
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
        <div className="grid h-[calc(100vh-180px)] grid-cols-1 overflow-hidden rounded-xl border border-border bg-white md:grid-cols-[360px_1fr] xl:grid-cols-[320px_1fr_340px]">
          {/* Left column: list. Hidden on mobile when a thread is in URL. */}
          <div className="border-r border-border md:overflow-y-auto">
            <InboxList
              threads={threads}
              currentUserId={currentUser.id}
              selectedId={selectedId}
            />
          </div>
          {/* Middle column: thread. Hidden on mobile (mobile uses /inbox/[id]). */}
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
          {/* Right column: reservation sidebar. Visible at xl+ (≥1280px)
              so the 2-column midtable view stays usable on narrower
              desktops. Mobile + narrow desktop fall back to the trip
              detail page for the same info. */}
          {selected && (
            <div className="hidden xl:flex xl:flex-col xl:overflow-hidden">
              <ReservationSidebar
                thread={selected}
                currentUserId={currentUser.id}
              />
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
}
