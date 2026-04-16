"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConnectionPopover } from "@/components/trust/connection-breakdown";
import { TrustBadge } from "@/components/trust-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { InboxThread } from "@/lib/messaging-data";

interface Props {
  threads: InboxThread[];
  currentUserId: string;
  selectedId: string | null;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function relTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  const diff = (now.getTime() - d.getTime()) / 86400000;
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type Filter = "all" | "host" | "guest";

export function InboxList({ threads, selectedId }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return threads.filter((t) => {
      if (filter === "host" && t.role !== "host") return false;
      if (filter === "guest" && t.role !== "guest") return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const hay = `${t.other_user.name} ${t.listing?.title || ""} ${t.last_message_preview || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [threads, filter, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search messages"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-full rounded-full border border-border bg-muted/40 pl-9 pr-3 text-sm focus:border-foreground focus:bg-white focus:outline-none"
          />
        </div>
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as Filter)}
          className="mt-3 !flex-col"
        >
          <TabsList
            variant="line"
            className="h-auto w-full justify-start gap-4 border-b border-border !rounded-none bg-transparent p-0"
          >
            <TabsTrigger
              value="all"
              className="!h-auto !flex-none !px-0 pb-2 text-sm !rounded-none data-active:!bg-transparent data-active:after:!opacity-100 after:!bottom-[-1px] after:!h-0.5 after:!bg-foreground"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="host"
              className="!h-auto !flex-none !px-0 pb-2 text-sm !rounded-none data-active:!bg-transparent data-active:after:!opacity-100 after:!bottom-[-1px] after:!h-0.5 after:!bg-foreground"
            >
              Hosting
            </TabsTrigger>
            <TabsTrigger
              value="guest"
              className="!h-auto !flex-none !px-0 pb-2 text-sm !rounded-none data-active:!bg-transparent data-active:after:!opacity-100 after:!bottom-[-1px] after:!h-0.5 after:!bg-foreground"
            >
              Traveling
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No conversations match.
          </div>
        ) : (
          <ul>
            {filtered.map((t) => {
              const isSelected = t.id === selectedId;
              const isUnread = t.unread_count > 0;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      // Desktop: stay on /inbox?thread=…
                      // Mobile: navigate to /inbox/[id]
                      if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
                        router.push(`/inbox?thread=${t.id}`);
                      } else {
                        router.push(`/inbox/${t.id}`);
                      }
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left transition-colors hover:bg-muted/60",
                      isSelected && "bg-muted"
                    )}
                  >
                    <ConnectionPopover targetUserId={t.other_user.id}>
                      <Avatar className="h-12 w-12 shrink-0 cursor-pointer">
                        {t.other_user.avatar_url && (
                          <AvatarImage
                            src={t.other_user.avatar_url}
                            alt={t.other_user.name}
                          />
                        )}
                        <AvatarFallback>
                          {initials(t.other_user.name)}
                        </AvatarFallback>
                      </Avatar>
                    </ConnectionPopover>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className={cn(
                              "truncate text-sm",
                              isUnread ? "font-semibold" : "font-medium"
                            )}
                          >
                            {t.other_user.name}
                          </span>
                          {t.trust_score > 0 && (
                            <TrustBadge score={t.trust_score} size="sm" />
                          )}
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {relTime(t.last_message_at)}
                        </span>
                      </div>
                      {t.listing && (
                        <div className="truncate text-xs text-muted-foreground">
                          {t.listing.title}
                        </div>
                      )}
                      <div
                        className={cn(
                          "mt-0.5 line-clamp-1 text-xs",
                          isUnread
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {t.last_message_preview || "No messages yet"}
                      </div>
                    </div>
                    {isUnread && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Mobile-only — tapping a thread leaves the list, but we still keep
          the inbox link for Link prefetching. */}
      <Link href="/inbox" className="hidden" aria-hidden>
        Inbox
      </Link>
    </div>
  );
}
