"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  /** First name of the person receiving the intro request. Copy is
   *  role-neutral — works whether the recipient is a host or a guest. */
  recipientFirstName: string;
}

/**
 * Direct intro request modal (S2a redesign).
 *
 * The sender writes a short message (20+ chars), optionally proposes a
 * non-binding date range, and submits. The recipient sees the full
 * profile + message in their Intros inbox and decides whether to
 * accept / reply / decline / ignore.
 *
 * Copy is role-neutral — the same modal is used regardless of
 * whether a guest is requesting intro on a host's listing, or a host
 * is requesting intro on a guest's profile. The word "host" /
 * "guest" is intentionally not used.
 */
export function RequestIntroDialog({
  open,
  onOpenChange,
  listingId,
  recipientFirstName,
}: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const trimmed = message.trim();
  const charCount = trimmed.length;
  const tooShort = charCount < 20;

  const submit = async () => {
    if (submitting || tooShort) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/trust/request-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          message: trimmed,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        threadId?: string;
        alreadyPending?: boolean;
        error?: string;
      };
      if (!res.ok || !data.threadId) {
        toast.error(data.error || "Couldn't send request");
        return;
      }
      toast.success(
        data.alreadyPending
          ? "You already have a pending intro — opening it"
          : `Intro sent to ${recipientFirstName}`
      );
      onOpenChange(false);
      router.push(`/inbox/${data.threadId}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            Introduce yourself to {recipientFirstName}
          </DialogTitle>
          <DialogDescription>
            They&apos;ll see your profile, how you&apos;re connected, and
            your message. Only they can decide whether to engage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Say hi, share a bit about yourself, and why you're reaching out to ${recipientFirstName}.`}
              rows={5}
              className="h-14 min-h-[120px] w-full resize-none rounded-xl border-2 border-border !bg-white px-4 py-3 text-sm font-medium shadow-sm focus:border-foreground/60 focus:outline-none"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span
                className={
                  tooShort ? "text-muted-foreground" : "text-emerald-600"
                }
              >
                {tooShort
                  ? `At least 20 characters (${charCount}/20)`
                  : `${charCount} characters`}
              </span>
            </div>
          </div>

          {/* Optional non-binding date range. Helps the recipient judge
              timing without any commitment — the intro doesn't book
              anything. */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dates you&apos;re exploring (optional)
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-14 flex-1 rounded-xl border-2 border-border !bg-white px-4 text-sm font-medium shadow-sm focus:border-foreground/60 focus:outline-none"
                aria-label="Start date"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                className="h-14 flex-1 rounded-xl border-2 border-border !bg-white px-4 text-sm font-medium shadow-sm focus:border-foreground/60 focus:outline-none"
                aria-label="End date"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Not a booking — just context for {recipientFirstName}.
            </p>
          </div>

          <Button
            type="button"
            onClick={submit}
            disabled={submitting || tooShort}
            className="h-11 w-full rounded-lg bg-brand font-semibold hover:bg-brand-600"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {submitting ? "Sending…" : "Send intro request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
