import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getCurrentUser, getInboxForUser, getThreadDetail } from "@/lib/messaging-data";
import { InboxShell } from "@/components/inbox/inbox-shell";
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
  // If none specified, default to the first thread. Initial render still
  // happens server-side so deep links stay fast and bookmarkable.
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
          <InboxShell
            threads={threads}
            initialSelected={selected}
            currentUserId={currentUser.id}
            currentUserName={currentUser.name || ""}
            currentUserAvatar={currentUser.avatar_url}
          />
        )}
      </div>
    </>
  );
}
