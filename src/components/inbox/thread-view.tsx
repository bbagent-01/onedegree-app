"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Send, Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ConnectionPopover } from "@/components/trust/connection-breakdown";
import { getSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ThreadDetail, ThreadMessage } from "@/lib/messaging-data";

interface Props {
  thread: ThreadDetail;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string | null;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dayStart.getTime() === today.getTime()) return "Today";
  if (dayStart.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function bookingBadge(status: string | undefined) {
  if (!status) return null;
  const map: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
    },
    accepted: {
      label: "Confirmed",
      className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
    },
    declined: {
      label: "Declined",
      className: "bg-red-100 text-red-800 hover:bg-red-100",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
    },
  };
  const m = map[status];
  if (!m) return null;
  return <Badge className={m.className}>{m.label}</Badge>;
}

function formatStayDates(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`;
}

export function ThreadView({
  thread,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<ThreadMessage[]>(thread.messages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [actingOn, setActingOn] = useState<null | "accepted" | "declined">(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const isHost = thread.role === "host";
  const pendingBookingId =
    thread.booking && thread.booking.status === "pending"
      ? thread.booking.id
      : null;

  const respondToBooking = async (action: "accepted" | "declined") => {
    if (!pendingBookingId || actingOn) return;
    setActingOn(action);
    try {
      const res = await fetch(`/api/contact-requests/${pendingBookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Couldn't update reservation");
        return;
      }
      toast.success(
        action === "accepted" ? "Reservation approved" : "Reservation declined"
      );
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setActingOn(null);
    }
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Subscribe to realtime inserts on this thread
  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel(`thread:${thread.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${thread.id}`,
        },
        (payload) => {
          const m = payload.new as ThreadMessage;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [thread.id]);

  // Group consecutive messages into day buckets
  const grouped = useMemo(() => {
    const groups: { dayKey: string; label: string; items: ThreadMessage[] }[] = [];
    for (const m of messages) {
      const day = new Date(m.created_at);
      const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
      const last = groups[groups.length - 1];
      if (last?.dayKey === dayKey) {
        last.items.push(m);
      } else {
        groups.push({ dayKey, label: dayLabel(m.created_at), items: [m] });
      }
    }
    return groups;
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);

    // Optimistic insert
    const tempId = `temp-${Date.now()}`;
    const optimistic: ThreadMessage = {
      id: tempId,
      thread_id: thread.id,
      sender_id: currentUserId,
      content: text,
      is_system: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    try {
      const res = await fetch(`/api/message-threads/${thread.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: ThreadMessage;
        error?: string;
      };
      if (!res.ok || !data.message) {
        toast.error(data.error || "Couldn't send message");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setDraft(text);
        return;
      }
      // Replace optimistic with the real row
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data.message! : m))
      );
    } catch {
      toast.error("Network error");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const stayDates = formatStayDates(
    thread.booking?.check_in || null,
    thread.booking?.check_out || null
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Thread header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <ConnectionPopover targetUserId={thread.other_user.id}>
          <Avatar className="h-10 w-10 cursor-pointer">
            {thread.other_user.avatar_url && (
              <AvatarImage
                src={thread.other_user.avatar_url}
                alt={thread.other_user.name}
              />
            )}
            <AvatarFallback>{initials(thread.other_user.name)}</AvatarFallback>
          </Avatar>
        </ConnectionPopover>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold">
            {thread.other_user.name}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {thread.role === "host" ? "Guest" : "Host"}
            {thread.listing ? ` · ${thread.listing.area_name}` : ""}
          </div>
        </div>
      </div>

      {/* Host action panel — only visible to the host while a booking is pending */}
      {isHost && pendingBookingId && thread.booking && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-amber-900">
                Reservation request pending
              </div>
              <div className="mt-0.5 text-xs text-amber-800">
                {formatStayDates(thread.booking.check_in, thread.booking.check_out)}
                {" · "}
                {thread.booking.guest_count} guest
                {thread.booking.guest_count === 1 ? "" : "s"}
                {typeof thread.booking.total_estimate === "number" &&
                  thread.booking.total_estimate > 0 && (
                    <>
                      {" · "}${thread.booking.total_estimate.toLocaleString()}{" "}
                      estimated
                    </>
                  )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={actingOn !== null}
                onClick={() => respondToBooking("declined")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" />
                {actingOn === "declined" ? "Declining…" : "Decline"}
              </button>
              <button
                type="button"
                disabled={actingOn !== null}
                onClick={() => respondToBooking("accepted")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" />
                {actingOn === "accepted" ? "Approving…" : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Listing context card */}
      {thread.listing && (
        <div className="shrink-0 border-b border-border bg-muted/30 px-4 py-3">
          <Link
            href={`/listings/${thread.listing.id}`}
            className="flex items-center gap-3 hover:opacity-90"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
              {thread.listing.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thread.listing.thumbnail_url}
                  alt={thread.listing.title}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {thread.listing.title}
              </div>
              {stayDates && (
                <div className="truncate text-xs text-muted-foreground">
                  {stayDates}
                  {thread.booking?.guest_count
                    ? ` · ${thread.booking.guest_count} guest${thread.booking.guest_count === 1 ? "" : "s"}`
                    : ""}
                </div>
              )}
            </div>
            {bookingBadge(thread.booking?.status)}
          </Link>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollerRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {grouped.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No messages yet. Say hello!
          </div>
        )}
        {grouped.map((g) => (
          <div key={g.dayKey} className="space-y-2">
            <div className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {g.label}
            </div>
            {g.items.map((m) => {
              if (m.is_system) {
                return (
                  <div
                    key={m.id}
                    className="mx-auto max-w-md rounded-full bg-muted px-4 py-1.5 text-center text-xs text-muted-foreground"
                  >
                    {m.content}
                  </div>
                );
              }
              const isMe = m.sender_id === currentUserId;
              return (
                <div
                  key={m.id}
                  className={cn("flex", isMe ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                      isMe
                        ? "rounded-br-sm bg-brand text-white"
                        : "rounded-bl-sm bg-muted text-foreground"
                    )}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {m.content}
                    </div>
                    <div
                      className={cn(
                        "mt-1 text-[10px]",
                        isMe ? "text-white/70" : "text-muted-foreground"
                      )}
                    >
                      {timeLabel(m.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a message…"
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl border border-border bg-muted/40 px-4 py-2 text-sm focus:border-foreground focus:bg-white focus:outline-none"
          />
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim() || sending}
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
              draft.trim() && !sending
                ? "bg-brand text-white hover:bg-brand-600"
                : "bg-muted text-muted-foreground"
            )}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
