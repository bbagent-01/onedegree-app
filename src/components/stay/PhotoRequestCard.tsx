"use client";

/**
 * Thread card for the `__type:photo_request:<id>__` structured
 * message. Three states:
 *
 *   pending   — responder sees an upload CTA; requester sees a
 *               "cancel request" link.
 *   submitted — shows the photo inline (thumbnail + click to view
 *               full-size in a lightbox).
 *   dismissed — small muted row, keeps the timeline honest without
 *               pulling focus.
 */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PhotoRequest } from "@/lib/photo-requests-data";

interface Props {
  request: PhotoRequest;
  /** Signed URL produced by the server detail fetcher. Null when
   *  status !== 'submitted' or signing failed. */
  photoUrl: string | null;
  viewerId: string;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PhotoRequestCard({ request, photoUrl, viewerId }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const isRequester = viewerId === request.requester_id;
  const isResponder = viewerId === request.responder_id;
  const isPending = request.status === "pending";
  const isSubmitted = request.status === "submitted";
  const isDismissed = request.status === "dismissed";

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Photo must be 10MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `/api/photo-requests/${request.id}/submit`,
        { method: "POST", body: fd }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      toast.success("Photo sent");
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inbox:thread-refresh"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const dismiss = async () => {
    if (dismissing) return;
    setDismissing(true);
    try {
      const res = await fetch(
        `/api/photo-requests/${request.id}/dismiss`,
        { method: "POST" }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      toast.success("Request cancelled");
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inbox:thread-refresh"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't cancel");
    } finally {
      setDismissing(false);
    }
  };

  const iconBg = isSubmitted
    ? "bg-[var(--tt-mint-mid)]/20 text-[var(--tt-mint)]"
    : isDismissed
      ? "bg-white/5 text-zinc-600"
      : "bg-sky-400/15 text-sky-200";

  const statusPill = (() => {
    if (isSubmitted)
      return { label: "Photo sent", cls: "bg-[var(--tt-mint-mid)]/20 text-[var(--tt-mint)]" };
    if (isDismissed)
      return { label: "Cancelled", cls: "bg-white/10 text-[var(--tt-cream-muted)]" };
    return { label: "Pending", cls: "bg-sky-400/15 text-sky-200" };
  })();

  return (
    <div className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border-2 border-border bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            iconBg
          )}
        >
          <Camera className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold">
              Photo requested
              {isRequester ? " · by you" : ""}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                statusPill.cls
              )}
            >
              {statusPill.label}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {fmtDate(request.created_at)}
          </div>
        </div>
      </div>

      <div className="p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {request.prompt}
        </p>
      </div>

      {isSubmitted && photoUrl && (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="block w-full overflow-hidden rounded-xl border border-border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt="Requested photo"
              className="max-h-80 w-full object-cover"
            />
          </button>
          {request.submitted_at && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Check className="h-3 w-3 text-[var(--tt-mint)]" />
              Sent {fmtDate(request.submitted_at)}
            </div>
          )}
        </div>
      )}

      {/* Footer actions */}
      {isPending && isResponder && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sky-400/30 bg-sky-400/10 px-4 py-3">
          <div className="text-xs text-sky-100">
            Take a photo or pick one from your camera roll.
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFilePicked}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                Send photo
              </>
            )}
          </button>
        </div>
      )}

      {isPending && isRequester && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-3 text-xs">
          <span className="text-muted-foreground">
            Waiting on a photo.
          </span>
          <button
            type="button"
            onClick={dismiss}
            disabled={dismissing}
            className="inline-flex items-center gap-1 font-semibold text-foreground underline-offset-2 hover:underline disabled:opacity-60"
          >
            {dismissing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cancelling…
              </>
            ) : (
              <>
                <X className="h-3.5 w-3.5" /> Cancel request
              </>
            )}
          </button>
        </div>
      )}

      {isDismissed && (
        <div className="flex items-center gap-2 border-t border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          Request cancelled.
        </div>
      )}

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogTitle className="sr-only">Requested photo</DialogTitle>
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="Requested photo"
              className="mx-auto max-h-[80vh] w-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
