import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser, getThreadDetail } from "@/lib/messaging-data";
import { ThreadView } from "@/components/inbox/thread-view";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ threadId: string }>;
}

export default async function ThreadPage({ params }: PageProps) {
  const { threadId } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect(`/sign-in?redirect_url=/inbox/${threadId}`);
  }

  const thread = await getThreadDetail(currentUser.id, threadId);
  if (!thread) notFound();

  return (
    <div className="mx-auto flex h-[calc(100vh-60px)] w-full max-w-[1280px] flex-col md:h-[calc(100vh-100px)] md:px-6 md:py-6">
      {/* Mobile-only header bar with back button */}
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

      <div className="flex flex-1 flex-col overflow-hidden md:rounded-xl md:border md:border-border md:bg-white">
        <ThreadView
          thread={thread}
          currentUserId={currentUser.id}
          currentUserName={currentUser.name || ""}
          currentUserAvatar={currentUser.avatar_url}
        />
      </div>
    </div>
  );
}
