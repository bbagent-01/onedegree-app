"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConnectionPopover } from "@/components/trust/connection-breakdown";
import { TrustTag } from "@/components/trust/trust-tag";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { InboxThread } from "@/lib/messaging-data";
import { friendlyMessagePreview } from "@/components/booking/ThreadTermsCards";

interface Props {
  threads: InboxThread[];
  currentUserId: string;
  selectedId: string | null;
  /**
   * When provided, desktop clicks call this instead of doing a full
   * RSC navigation. Lets the parent shell swap threads via
   * /api/inbox/thread/[id] without re-running the inbox RSC.
   * Mobile navigation still uses router.push regardless.
   */
  onSelectThread?: (threadId: string) => void;
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

type MailboxFilter = "all" | "hosting" | "traveling" | "support";
type Filter = MailboxFilter | "intros";

export function InboxList({ threads, selectedId, onSelectThread }: Props) {
  const router = useRouter();
  // Two independent pieces of state: which mailbox is selected in
  // the dropdown, and whether the Intros sibling tab overrides it.
  // "intros" as the filter short-circuits the dropdown selection
  // without clobbering it — flipping back to the dropdown restores
  // the last-used mailbox.
  const [mailbox, setMailbox] = useState<MailboxFilter>("all");
  const [tab, setTab] = useState<"mailbox" | "intros">("mailbox");
  const [query, setQuery] = useState("");

  // If the user landed on /inbox/<id> with an intro thread selected
  // (or deep-linked to one from a listing page), auto-switch to the
  // Intros tab so the list + right panel agree. Without this the
  // left list can show "no conversations match" while the right
  // shows a fully-rendered intro thread.
  useEffect(() => {
    if (!selectedId) return;
    const selectedThread = threads.find((t) => t.id === selectedId);
    if (selectedThread?.is_intro_request) {
      setTab("intros");
    }
    // Only on initial selection change — manual tab clicks must win.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Filter buckets.
  //   Hosting     — role === "host" and not an intro
  //   Traveling   — role === "guest" and not an intro
  //   Support     — reserved; empty for now
  //   All         — Hosting + Traveling (non-intros)
  //   Intros      — is_intro_request === true, split visually
  //                 into "Intro received" (role=host) and
  //                 "Intro sent" (role=guest)
  const nonIntros = useMemo(
    () => threads.filter((t) => !t.is_intro_request),
    [threads]
  );
  const hostingThreads = useMemo(
    () => nonIntros.filter((t) => t.role === "host"),
    [nonIntros]
  );
  const travelingThreads = useMemo(
    () => nonIntros.filter((t) => t.role === "guest"),
    [nonIntros]
  );
  const supportThreads = useMemo(() => [] as typeof threads, []);
  const introThreads = useMemo(
    () => threads.filter((t) => t.is_intro_request),
    [threads]
  );

  const filtered = useMemo(() => {
    let source: InboxThread[];
    if (tab === "intros") {
      source = introThreads;
    } else {
      source =
        mailbox === "hosting"
          ? hostingThreads
          : mailbox === "traveling"
            ? travelingThreads
            : mailbox === "support"
              ? supportThreads
              : nonIntros;
    }
    return source.filter((t) => {
      if (query.trim()) {
        const q = query.toLowerCase();
        const hay = `${t.other_user.name} ${t.listing?.title || ""} ${friendlyMessagePreview(t.last_message_preview)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    tab,
    mailbox,
    nonIntros,
    hostingThreads,
    travelingThreads,
    supportThreads,
    introThreads,
    query,
  ]);

  const mailboxOptions: { key: MailboxFilter; label: string; count: number }[] =
    [
      { key: "all", label: "All", count: nonIntros.length },
      { key: "hosting", label: "Hosting", count: hostingThreads.length },
      { key: "traveling", label: "Traveling", count: travelingThreads.length },
      { key: "support", label: "Support", count: supportThreads.length },
    ];
  const currentMailbox =
    mailboxOptions.find((o) => o.key === mailbox) ?? mailboxOptions[0];

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
        <div className="mt-3 flex items-center gap-2">
          {/* Mailbox dropdown — keeps All/Hosting/Traveling/Support off
              a crowded tab row. Scales to more mailbox types (Co-host,
              Support routing, etc.) without a layout change. */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                tab === "mailbox"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-foreground hover:bg-muted"
              )}
              onClick={() => setTab("mailbox")}
            >
              <span>{currentMailbox.label}</span>
              {currentMailbox.count > 0 && (
                <span
                  className={cn(
                    "text-xs",
                    tab === "mailbox"
                      ? "text-background/80"
                      : "text-muted-foreground"
                  )}
                >
                  {currentMailbox.count}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[200px]">
              {mailboxOptions.map((opt) => {
                const disabled = opt.key === "support" && opt.count === 0;
                const isSelected = mailbox === opt.key && tab === "mailbox";
                return (
                  <DropdownMenuItem
                    key={opt.key}
                    disabled={disabled}
                    onClick={() => {
                      // base-ui's MenuItem fires onClick (not
                      // onSelect — that's the Radix API). closeOnClick
                      // defaults to true so the menu closes itself.
                      setMailbox(opt.key);
                      setTab("mailbox");
                    }}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-2">
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <span className="h-3.5 w-3.5" />
                      )}
                      {opt.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {opt.count}
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Intros sibling tab — surfaces intro_requests separately
              from regular inbound/outbound messages. Clearly differ-
              entiated in the row rendering as "Intro sent" vs "Intro
              received" based on role. */}
          <button
            type="button"
            onClick={() => setTab("intros")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              tab === "intros"
                ? "border-foreground bg-foreground text-background"
                : "border-border text-foreground hover:bg-muted"
            )}
          >
            Intros
            {introThreads.length > 0 && (
              <span
                className={cn(
                  "text-xs",
                  tab === "intros"
                    ? "text-background/80"
                    : "text-muted-foreground"
                )}
              >
                {introThreads.length}
              </span>
            )}
          </button>
        </div>
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
                      // Desktop: swap via the shell's onSelectThread
                      // callback when present (no RSC round-trip). Fall
                      // back to router.push for legacy mounts that
                      // don't wire the callback.
                      // Mobile: always navigate to /inbox/[id] so the
                      // thread takes over the whole viewport.
                      const isDesktop =
                        typeof window !== "undefined" &&
                        window.matchMedia("(min-width: 768px)").matches;
                      if (isDesktop) {
                        if (onSelectThread) {
                          onSelectThread(t.id);
                        } else {
                          router.push(`/inbox?thread=${t.id}`);
                        }
                      } else {
                        router.push(`/inbox/${t.id}`);
                      }
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left transition-colors hover:bg-muted/60",
                      isSelected && "bg-muted",
                      t.is_intro_request && "bg-amber-50/40"
                    )}
                  >
                    <ConnectionPopover
                      targetUserId={t.other_user.id}
                      direction={t.role === "guest" ? "incoming" : "outgoing"}
                    >
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
                          {(t.trust_score > 0 || t.trust_is_direct) && (
                            <TrustTag
                              size="micro"
                              score={t.trust_score}
                              degree={t.trust_degree}
                              direct={t.trust_is_direct}
                              connectorPaths={t.trust_connector_paths}
                            />
                          )}
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {relTime(t.last_message_at)}
                        </span>
                      </div>
                      {t.is_intro_request && t.intro && (
                        <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                          {/* Role-neutral intro label — uses the
                              sender/recipient identity from the
                              intro row rather than guest/host. */}
                          {t.intro.sender_id === t.other_user.id
                            ? "Intro received"
                            : "Intro sent"}
                          {t.intro.status !== "pending" && (
                            <span className="opacity-80">
                              · {t.intro.status}
                            </span>
                          )}
                        </div>
                      )}
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
                        {friendlyMessagePreview(t.last_message_preview) ||
                          "No messages yet"}
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
