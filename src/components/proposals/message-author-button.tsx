"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  /** Reserved for future analytics / deep-link threading on the
   *  recipient side — we send the viewer to their own inbox for now. */
  proposalId?: string;
  authorId: string;
  authorFirstName: string;
  /** Link to the host's listing for host_offer proposals — opens a
   *  listing-scoped thread. null for trip_wish → listingless DM. */
  listingId: string | null;
  kindLabel: "Trip Wish" | "Host Offer";
  title: string;
}

/**
 * Proposal "Message [name]" CTA.
 *
 * Opens the same thread as the rest of the app:
 *   - host_offer (has listing_id)  → listing-scoped thread via
 *                                    /api/message-threads
 *   - trip_wish  (no listing)      → listingless DM via
 *                                    /api/dm/open-thread
 *
 * Pre-fills a one-line first message with proposal context. The user
 * can edit it before actually sending.
 */
export function MessageAuthorButton({
  authorId,
  authorFirstName,
  listingId,
  kindLabel,
  title,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const prefill = `Hi ${authorFirstName}, I saw your ${kindLabel}: ${title}.`;

  const open = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let threadId: string | null = null;
      if (listingId) {
        const res = await fetch("/api/message-threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          threadId?: string;
          id?: string;
          error?: string;
        };
        threadId = data.threadId ?? data.id ?? null;
        if (!res.ok || !threadId) {
          toast.error(data.error || "Couldn't open conversation");
          return;
        }
      } else {
        const res = await fetch("/api/dm/open-thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ otherUserId: authorId }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          threadId?: string;
          error?: string;
        };
        threadId = data.threadId ?? null;
        if (!res.ok || !threadId) {
          toast.error(data.error || "Couldn't open conversation");
          return;
        }
      }
      const url = `/inbox/${threadId}?prefill=${encodeURIComponent(prefill)}`;
      router.push(url);
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3 text-xs font-semibold text-background hover:bg-foreground/90 disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <MessageCircle className="h-3.5 w-3.5" />
      )}
      Message {authorFirstName}
    </button>
  );
}
