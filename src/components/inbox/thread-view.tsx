"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarClock, CalendarPlus, MessageSquare, Pencil, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ThreadDetail, ThreadMessage } from "@/lib/messaging-data";
import {
  PaymentClaimedCard,
  PaymentConfirmedCard,
  PaymentDueCard,
  TERMS_ACCEPTED_PREFIX,
  TERMS_OFFERED_PREFIX,
  TermsOfferedCard,
  friendlyMessagePreview,
  parsePaymentEventId,
} from "@/components/booking/ThreadTermsCards";
import {
  REVIEW_PROMPT_PREFIX,
  INTRO_REQUEST_PREFIX,
  INTRO_ACCEPTED_PREFIX,
  INTRO_DECLINED_PREFIX,
  INTRO_REVOKED_PREFIX,
  RESERVATION_REQUEST_PREFIX,
  CHECKIN_REMINDER_PREFIX,
  TERMS_DECLINED_PREFIX,
  TERMS_EDITED_PREFIX,
  TERMS_EDITS_REQUESTED_PREFIX,
  RESERVATION_DECLINED_PREFIX,
  parseIssueReportId,
  parsePhotoRequestId,
} from "@/lib/structured-messages";
import { SystemMilestoneCard } from "@/components/inbox/SystemMilestoneCard";
import { ReviewPromptCard } from "@/components/booking/ReviewPromptCard";
import { HostReviewTermsInline } from "@/components/booking/HostReviewTermsInline";
import { MessageReportMenu } from "@/components/safety/message-report-menu";
import { IntroRequestCard } from "@/components/trust/IntroRequestCard";
import { IssueReportCard } from "@/components/stay/IssueReportCard";
import { PhotoRequestCard } from "@/components/stay/PhotoRequestCard";
import { ReportIssueButton } from "@/components/stay/ReportIssueButton";
import { RequestPhotoButton } from "@/components/stay/RequestPhotoButton";

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

function bookingBadge(
  status: string | undefined,
  termsAcceptedAt?: string | null
) {
  if (!status) return null;
  // S7 fix: host-accepted (terms sent) is still "Pending" until the
  // guest stamps terms_accepted_at. Only promote to Confirmed once
  // the guest has actually accepted the offer.
  const effective =
    status === "accepted" && !termsAcceptedAt ? "pending" : status;
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
  const m = map[effective];
  if (!m) return null;
  return <Badge className={m.className}>{m.label}</Badge>;
}

function formatStayDates(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const parse = (iso: string): Date | null => {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };
  const s = parse(start);
  const e = parse(end);
  if (!s || !e) return null;
  return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`;
}

export function ThreadView({
  thread,
  currentUserId,
}: Props) {
  const [messages, setMessages] = useState<ThreadMessage[]>(thread.messages);
  // Proposal "Message [name]" CTA redirects here with ?prefill=... so the
  // user lands with context already typed into the composer. They can edit
  // before sending. The effect below one-shot seeds the draft on mount
  // when the thread has no messages yet; we don't clobber an in-progress
  // reply on an active thread.
  const searchParams = useSearchParams();
  const prefillParam = searchParams?.get("prefill") ?? null;
  const [draft, setDraft] = useState("");
  useEffect(() => {
    if (prefillParam && thread.messages.length === 0) {
      setDraft(prefillParam);
    }
    // Intentionally only react to prefillParam/thread id — avoid re-seeding
    // on every messages update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillParam, thread.id]);
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Sync local messages state when the thread prop refreshes. The
  // InboxShell fires `inbox:thread-refresh` after a successful
  // accept/decline/accept-terms and re-fetches the thread; without
  // this sync, newly-inserted system messages (like terms_offered)
  // stay invisible until the user hard-reloads.
  //
  // Dep is a stable fingerprint of the incoming id list, not the
  // array reference itself — defends against parent re-renders
  // that would otherwise re-fire this effect on every pass.
  //
  // Merge strategy: take the server's list, but keep any local
  // optimistic rows (id starts with "temp-") that haven't been
  // reconciled yet — those will be replaced by their real rows on
  // the next send() round-trip.
  const serverMessageFingerprint = useMemo(
    () => thread.messages.map((m) => m.id).join("|"),
    [thread.messages]
  );
  useEffect(() => {
    setMessages((prev) => {
      const optimistic = prev.filter((m) => m.id.startsWith("temp-"));
      return [...thread.messages, ...optimistic];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverMessageFingerprint]);

  const isHost = thread.role === "host";
  const pendingBookingId =
    thread.booking && thread.booking.status === "pending"
      ? thread.booking.id
      : null;

  // Auto-scroll to bottom on new messages. Also runs after the
  // pending-review card renders for the host — the card is the
  // action item, so it should be on-screen when the thread loads.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // rAF so the DOM has laid out the inline review card before we
    // measure scrollHeight on first render.
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, pendingBookingId]);

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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Thread header — S5 click-model rule: avatar + name navigate
          to the counterparty's profile. Each gets its own Link so
          the hover affordance tells the viewer they're a navigation
          target: avatar gets a soft drop-shadow, name gets an
          underline. Trust detail lives on the TrustTag (not
          rendered here in the header). */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <Link
          href={`/profile/${thread.other_user.id}`}
          className="shrink-0 rounded-full transition-all hover:shadow-lg hover:ring-2 hover:ring-white"
          aria-label={`Open ${thread.other_user.name}'s profile`}
        >
          <Avatar className="h-10 w-10">
            {thread.other_user.avatar_url && (
              <AvatarImage
                src={thread.other_user.avatar_url}
                alt={thread.other_user.name}
              />
            )}
            <AvatarFallback>{initials(thread.other_user.name)}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${thread.other_user.id}`}
            className="block truncate text-base font-semibold hover:underline"
          >
            {thread.other_user.name}
          </Link>
          <div className="truncate text-xs text-muted-foreground">
            {thread.listing
              ? `${thread.role === "host" ? "Guest" : "Host"} · ${thread.listing.area_name}`
              : "Direct message"}
          </div>
        </div>
      </div>

      {/* Host awareness banner — just flags that a request is
          pending. The actual Review & send editor renders inline at
          the end of the thread so the host edits in context of the
          conversation. */}
      {isHost && pendingBookingId && thread.booking && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-sm font-semibold text-amber-900">
            Reservation request pending · review &amp; send terms below
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
            {bookingBadge(
              thread.booking?.status,
              thread.booking?.terms_accepted_at
            )}
          </Link>
        </div>
      )}

      {/* Messages. `min-h-0` is load-bearing — without it, the
          flex-1 child grows to content height and overflow-y-auto
          never kicks in. Classic flex-col scroll pitfall. */}
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
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
                // Structured system messages — rich inline cards for
                // major milestones (host approves, guest accepts).
                // Read live data from the thread's booking so the
                // card always reflects the current snapshot.
                if (
                  m.content.startsWith(TERMS_OFFERED_PREFIX) &&
                  thread.booking?.id &&
                  thread.reservation_sidebar?.cancellation_policy
                ) {
                  return (
                    <div key={m.id} className="py-1">
                      <TermsOfferedCard
                        bookingId={thread.booking.id}
                        threadId={thread.id}
                        checkIn={thread.booking.check_in}
                        checkOut={thread.booking.check_out}
                        guestCount={thread.booking.guest_count}
                        totalEstimate={thread.booking.total_estimate}
                        originalCheckIn={thread.booking.original_check_in}
                        originalCheckOut={thread.booking.original_check_out}
                        originalGuestCount={thread.booking.original_guest_count}
                        originalTotalEstimate={
                          thread.booking.original_total_estimate
                        }
                        policy={thread.reservation_sidebar.cancellation_policy}
                        originalPolicy={
                          thread.booking.original_cancellation_policy
                        }
                        paymentMethods={
                          thread.reservation_sidebar.host_payment_methods
                        }
                        nightlyRate={
                          thread.reservation_sidebar.listing_price_min
                        }
                        cleaningFee={
                          thread.reservation_sidebar.listing_cleaning_fee
                        }
                        viewerRole={thread.role}
                        termsAcceptedAt={thread.booking.terms_accepted_at}
                        termsDeclinedAt={thread.booking.terms_declined_at}
                        termsDeclinedBy={thread.booking.terms_declined_by}
                        editsRequestedAt={thread.booking.edits_requested_at}
                        hostFirstName={
                          (thread.role === "host"
                            ? "you"
                            : thread.other_user.name
                          ).split(" ")[0]
                        }
                        guestFirstName={
                          (thread.role === "guest"
                            ? "you"
                            : thread.other_user.name
                          ).split(" ")[0]
                        }
                      />
                    </div>
                  );
                }
                // Payment event cards. The thread is a timeline of
                // record — every event contributes one visible card
                // showing its CURRENT state (due / claimed /
                // confirmed). Render the card at the position of
                // the earliest `payment_due` message for the event
                // so Payment 1 stays above Payment 2 even after
                // Payment 1 transitions to confirmed (which would
                // otherwise post a newer message that sorts later).
                // Skip the claimed/confirmed history messages
                // entirely — they're just state signals.
                const paymentParse = parsePaymentEventId(m.content);
                if (paymentParse) {
                  // Only render on the payment_due anchor message.
                  if (paymentParse.kind !== "due") {
                    return null;
                  }
                  const ev = (thread.payment_events ?? []).find(
                    (e) => e.id === paymentParse.eventId
                  );
                  if (!ev) return null;
                  const total = (thread.payment_events ?? []).length;
                  const hostFirst = (
                    thread.role === "host" ? "you" : thread.other_user.name
                  ).split(" ")[0];
                  const guestFirst = (
                    thread.role === "guest" ? "you" : thread.other_user.name
                  ).split(" ")[0];
                  // Render the card component that matches the
                  // event's LIVE status. Anchor position is the
                  // payment_due message, so cards stay in
                  // schedule_index order even after later
                  // transitions post newer messages.
                  if (ev.status === "scheduled") {
                    return (
                      <div key={m.id} className="py-1">
                        <PaymentDueCard
                          event={ev}
                          totalEvents={total}
                          viewerRole={thread.role}
                          paymentMethods={
                            thread.reservation_sidebar
                              ?.host_payment_methods ?? []
                          }
                          hostFirstName={hostFirst}
                          guestFirstName={guestFirst}
                        />
                      </div>
                    );
                  }
                  if (ev.status === "claimed") {
                    return (
                      <div key={m.id} className="py-1">
                        <PaymentClaimedCard
                          event={ev}
                          totalEvents={total}
                          viewerRole={thread.role}
                          hostFirstName={hostFirst}
                          guestFirstName={guestFirst}
                        />
                      </div>
                    );
                  }
                  if (ev.status === "confirmed") {
                    return (
                      <div key={m.id} className="py-1">
                        <PaymentConfirmedCard
                          event={ev}
                          totalEvents={total}
                          viewerRole={thread.role}
                          hostFirstName={hostFirst}
                          guestFirstName={guestFirst}
                        />
                      </div>
                    );
                  }
                }
                // Suppress the standalone terms_accepted card —
                // the acceptance footer on the preceding
                // terms_offered card already confirms the guest
                // accepted. Row stays in the DB as a historical
                // marker but doesn't render anything in the feed.
                if (m.content.startsWith(TERMS_ACCEPTED_PREFIX)) {
                  return null;
                }
                // S7: host edited pending terms. Anchor a compact
                // milestone card so the timeline reads as "terms
                // updated on <date>"; the TermsOfferedCard above
                // reflects the new values via its existing diff
                // pills.
                if (m.content.startsWith(TERMS_EDITED_PREFIX)) {
                  const editor =
                    thread.role === "host" ? "You" : thread.other_user.name.split(" ")[0];
                  return (
                    <div key={m.id} className="py-1">
                      <SystemMilestoneCard
                        icon={Pencil}
                        tone="amber"
                        emphasizeBody
                        title={`${editor} updated the stay terms`}
                        subtitle="Scroll up to the terms card to review the latest details."
                      />
                    </div>
                  );
                }
                // S7: guest requested edits without declining. The
                // free-text reply the guest sends separately carries
                // the substance; this card is the timeline anchor.
                if (m.content.startsWith(TERMS_EDITS_REQUESTED_PREFIX)) {
                  const asker =
                    thread.role === "guest" ? "You" : thread.other_user.name.split(" ")[0];
                  return (
                    <div key={m.id} className="py-1">
                      <SystemMilestoneCard
                        icon={MessageSquare}
                        tone="amber"
                        emphasizeBody
                        title={`${asker} requested edits to the stay terms`}
                        subtitle="See the reply below for what they want changed."
                      />
                    </div>
                  );
                }
                // Same suppression for the decline lifecycle
                // markers — the red declined footer on the
                // preceding terms_offered card already shows the
                // outcome inline.
                if (
                  m.content.startsWith(TERMS_DECLINED_PREFIX) ||
                  m.content.startsWith(RESERVATION_DECLINED_PREFIX)
                ) {
                  return null;
                }

                // Issue-report card (S4 Chunk 5). Re-reads the row
                // from thread.issue_reports so the card always shows
                // the current status/resolution — no need for
                // per-transition message inserts.
                const issueId = parseIssueReportId(m.content);
                if (issueId) {
                  const report = (thread.issue_reports ?? []).find(
                    (r) => r.id === issueId
                  );
                  if (report) {
                    return (
                      <div key={m.id} className="py-1">
                        <IssueReportCard
                          report={report}
                          viewerId={currentUserId}
                        />
                      </div>
                    );
                  }
                }
                // Photo-request card.
                const photoId = parsePhotoRequestId(m.content);
                if (photoId) {
                  const req = (thread.photo_requests ?? []).find(
                    (r) => r.id === photoId
                  );
                  if (req) {
                    return (
                      <div key={m.id} className="py-1">
                        <PhotoRequestCard
                          request={req}
                          photoUrl={req.signed_photo_url}
                          viewerId={currentUserId}
                        />
                      </div>
                    );
                  }
                }

                // Intro-request card (S2a direct model).
                // Recipient sees Accept / Reply / Decline / Ignore.
                // Sender sees a read-only pending / accepted / etc.
                // state on the same card. Data comes from
                // thread.intro_detail (populated by getThreadDetail).
                if (
                  m.content.startsWith(INTRO_REQUEST_PREFIX) &&
                  thread.intro_detail
                ) {
                  // Recipient display name — the viewer's "other
                  // user" when they're the sender; their own name
                  // when they're the recipient. Server-side sender
                  // profile already carries the sender's name.
                  const recipientName =
                    thread.intro_detail.recipient_id === currentUserId
                      ? "you"
                      : thread.other_user.name;
                  return (
                    <div key={m.id} className="py-1">
                      <IntroRequestCard
                        threadId={thread.id}
                        intro={{
                          sender_id: thread.intro_detail.sender_id,
                          recipient_id: thread.intro_detail.recipient_id,
                          status: thread.intro_detail.status,
                          message: thread.intro_detail.message,
                          start_date: thread.intro_detail.start_date,
                          end_date: thread.intro_detail.end_date,
                          decided_at: thread.intro_detail.decided_at,
                        }}
                        viewerId={currentUserId}
                        sender={thread.intro_detail.sender_profile}
                        recipientName={recipientName}
                        senderListings={thread.intro_detail.sender_listings}
                        connectorPaths={thread.trust_connector_paths}
                        trustDegree={thread.trust_degree}
                        hasExistingBooking={thread.booking !== null}
                      />
                    </div>
                  );
                }

                // Intro lifecycle confirmations — rendered as plain
                // full-width status rows. Copy comes from
                // friendlyMessagePreview / structuredMessageLabel.
                if (
                  m.content.startsWith(INTRO_ACCEPTED_PREFIX) ||
                  m.content.startsWith(INTRO_DECLINED_PREFIX) ||
                  m.content.startsWith(INTRO_REVOKED_PREFIX)
                ) {
                  return (
                    <div key={m.id} className="py-1">
                      <div className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground">
                        {friendlyMessagePreview(m.content)}
                      </div>
                    </div>
                  );
                }

                // Review prompt — inline card with "Leave a review"
                // button that opens ReviewFlowDialog right here so
                // the reviewer never has to navigate to /trips.
                if (
                  m.content.startsWith(REVIEW_PROMPT_PREFIX) &&
                  thread.booking?.id
                ) {
                  return (
                    <div key={m.id} className="py-1">
                      <ReviewPromptCard
                        viewerRole={thread.role}
                        bookingId={thread.booking.id}
                        stayConfirmationId={
                          thread.reservation_sidebar
                            ?.stay_confirmation_id ?? null
                        }
                        reviewedByMe={
                          thread.reservation_sidebar
                            ?.stay_reviewed_by_me ?? false
                        }
                        otherUser={{
                          id: thread.other_user.id,
                          name: thread.other_user.name,
                        }}
                        listingTitle={thread.listing?.title ?? "your stay"}
                        alreadyVouched={
                          thread.reservation_sidebar?.viewer_has_vouched ??
                          false
                        }
                      />
                    </div>
                  );
                }
                // Structured reservation-request card. The card
                // reads live dates / guest count from thread.booking,
                // so no payload is embedded in the message itself.
                if (m.content.startsWith(RESERVATION_REQUEST_PREFIX)) {
                  const guestName =
                    thread.role === "host"
                      ? thread.other_user.name.split(" ")[0]
                      : "You";
                  const dates = formatStayDates(
                    thread.booking?.check_in ?? null,
                    thread.booking?.check_out ?? null
                  );
                  const guests = thread.booking?.guest_count;
                  const subtitle = [
                    dates,
                    typeof guests === "number"
                      ? `${guests} guest${guests === 1 ? "" : "s"}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <div key={m.id} className="py-1">
                      <SystemMilestoneCard
                        icon={CalendarPlus}
                        tone="brand"
                        title={`${guestName} requested to reserve`}
                        subtitle={subtitle || undefined}
                      />
                    </div>
                  );
                }

                // Structured check-in reminder card. The check_in
                // date column is a plain YYYY-MM-DD string — parsing
                // it with `new Date(str)` would coerce to UTC and
                // drift by the viewer's timezone offset (showing
                // Apr 22 for an Apr 23 booking in EDT). Split the
                // pieces and construct a local date instead.
                if (m.content.startsWith(CHECKIN_REMINDER_PREFIX)) {
                  const checkIn = thread.booking?.check_in;
                  let arrival: string | null = null;
                  if (checkIn) {
                    const [y, mo, d] = checkIn.slice(0, 10).split("-").map(Number);
                    if (y && mo && d) {
                      arrival = new Date(
                        y,
                        mo - 1,
                        d
                      ).toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      });
                    }
                  }
                  const roleHint =
                    thread.role === "host"
                      ? "Share check-in instructions, Wi-Fi, parking, and anything else your guest will need."
                      : "Confirm check-in instructions, Wi-Fi, parking, and anything else you need before arrival.";
                  const arrivalLine = arrival
                    ? `Arriving ${arrival}. `
                    : "";
                  return (
                    <div key={m.id} className="py-1">
                      <SystemMilestoneCard
                        icon={CalendarClock}
                        tone="amber"
                        title="Heads up — check-in is tomorrow"
                        subtitle={`${arrivalLine}${roleHint}`}
                      />
                    </div>
                  );
                }

                // Plain-text system messages (legacy request
                // announcements before the structured migration,
                // stray prompts). Styled as a full-width card to
                // match the rest of the timeline instead of a small
                // muted pill.
                return (
                  <div key={m.id} className="py-1">
                    <div className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground">
                      {friendlyMessagePreview(m.content)}
                    </div>
                  </div>
                );
              }
              const isMe = m.sender_id === currentUserId;
              // Report menu only on incoming messages from the other
              // party — not system messages (sender_id == null) and
              // not the viewer's own outgoing bubbles.
              const canReport = !isMe && Boolean(m.sender_id);
              return (
                <div
                  key={m.id}
                  className={cn(
                    "group flex items-end gap-1",
                    isMe ? "justify-end" : "justify-start"
                  )}
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
                  {canReport && (
                    <MessageReportMenu
                      threadId={thread.id}
                      messageId={m.id}
                      senderId={m.sender_id!}
                      senderName={thread.other_user.name}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Host's Review & send terms editor — inline at the end of
            the thread when the request is still pending. Drops out
            the moment the host approves (the terms_offered system
            message replaces it as the conversation's terms-of-
            record). */}
        {isHost &&
          pendingBookingId &&
          thread.booking &&
          thread.reservation_sidebar?.cancellation_policy && (
            <div className="pt-2">
              <HostReviewTermsInline
                bookingId={pendingBookingId}
                initialTotal={thread.booking.total_estimate}
                initialPolicy={thread.reservation_sidebar.cancellation_policy}
                checkIn={thread.booking.check_in}
                checkOut={thread.booking.check_out}
                guestCount={thread.booking.guest_count}
                nightlyRate={thread.reservation_sidebar.listing_price_min}
                cleaningFee={thread.reservation_sidebar.listing_cleaning_fee}
                guestFirstName={thread.other_user.name.split(" ")[0]}
              />
            </div>
          )}
      </div>

      {/* Input — hidden entirely for the intro sender after decline.
          The API would 403 them anyway; surfacing a dead composer
          just invites frustration. Recipient always keeps the
          composer (they drive the reopen flow). */}
      {(() => {
        const introSenderBlocked =
          thread.intro_detail?.status === "declined" &&
          thread.intro_detail.sender_id === currentUserId;
        if (introSenderBlocked) {
          return (
            <div className="shrink-0 border-t border-border bg-zinc-50 p-4 text-center text-xs text-muted-foreground">
              Messaging is paused in this thread. You can send a new
              intro request after 30 days.
            </div>
          );
        }
        // Stay-time action row (S4 Chunk 5).
        //   - "Report an issue" is always surfaced now: a bad-actor
        //     host or guest can pop up at any thread stage (pre-
        //     booking harassment, post-stay disputes), so gating
        //     behind check-in forced Loren to chase edge cases.
        //   - "Request a photo" still gates to an accepted booking —
        //     it's a scheduling concern, not a safety one.
        const booking = thread.booking;
        const hasAcceptedReservation =
          !!booking && booking.status === "accepted";
        const showPhotoRequest = hasAcceptedReservation;
        const showIssueReport = true;
        const showActions = showPhotoRequest || showIssueReport;
        return (
          <>
            {showActions && (
              <div className="shrink-0 border-t border-border bg-muted/20 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  {showIssueReport && (
                    <ReportIssueButton threadId={thread.id} />
                  )}
                  {showPhotoRequest && (
                    <RequestPhotoButton threadId={thread.id} />
                  )}
                </div>
              </div>
            )}
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
          </>
        );
      })()}
    </div>
  );
}
