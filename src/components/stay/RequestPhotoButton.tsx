"use client";

/**
 * Thread action: "Request a photo" — opens a small modal that
 * captures a prompt and posts a photo_requests row + structured
 * card into the thread. Available to either participant, no stage
 * gating (a host might ask about a lockbox photo before check-in).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  threadId: string;
}

export function RequestPhotoButton({ threadId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const disabled = submitting || prompt.trim().length < 3;

  const submit = async () => {
    if (disabled) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/photo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, prompt: prompt.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      toast.success("Photo request sent");
      setOpen(false);
      setPrompt("");
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inbox:thread-refresh"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted/50"
      >
        <Camera className="h-3.5 w-3.5" />
        Request a photo
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request a photo</DialogTitle>
            <DialogDescription>
              Ask for a photo of something specific. They&apos;ll get a
              card in the thread with a tap-to-send upload.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What would you like them to photograph?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="e.g. the thermostat, front door lock, or the A/C unit"
              className="h-28 w-full rounded-xl border-2 border-border !bg-white px-4 py-3 text-sm font-medium shadow-sm focus:border-foreground focus:outline-none"
            />
          </div>

          <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={disabled}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  Send request
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
