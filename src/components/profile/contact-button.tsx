"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * Profile page "Contact" button. Calls /api/dm/open-thread to
 * find-or-create a listing-less DM thread between the viewer and the
 * profile owner, then navigates to that thread. Before migration 034
 * this button just linked to /inbox and landed users on an empty
 * "Select a conversation" state — broken UX.
 */
export function ContactButton({
  targetUserId,
  targetName,
}: {
  targetUserId: string;
  targetName: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const open = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/dm/open-thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId: targetUserId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        threadId?: string;
        error?: string;
      };
      if (!res.ok || !data.threadId) {
        toast.error(data.error || "Couldn't open conversation");
        return;
      }
      router.push(`/inbox/${data.threadId}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={open}
      disabled={submitting}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
      aria-label={`Message ${targetName}`}
    >
      {submitting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageCircle className="h-4 w-4" />
      )}
      Contact
    </button>
  );
}
