"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, Trash2, Loader2, PenSquare } from "lucide-react";
import { toast } from "sonner";

interface Props {
  proposalId: string;
  status: "active" | "expired" | "closed";
}

/**
 * Author-only bar on /proposals/[id]: Edit → /proposals/[id]/edit (ships
 * later; link kept disabled), Close (flip status), Delete. Close and
 * Delete both route back to the feed on success.
 */
export function AuthorActions({ proposalId, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "close" | "delete">(null);

  const close = async () => {
    if (busy || status !== "active") return;
    if (!confirm("Close this proposal? It will disappear from feeds.")) return;
    setBusy("close");
    try {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error || "Couldn't close");
        return;
      }
      toast.success("Proposal closed");
      router.push("/proposals");
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const del = async () => {
    if (busy) return;
    if (!confirm("Delete this proposal? This cannot be undone.")) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error || "Couldn't delete");
        return;
      }
      toast.success("Deleted");
      router.push("/proposals?include_own=1");
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Link
        href={`/proposals/${proposalId}/edit`}
        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-sm font-semibold hover:bg-muted"
      >
        <PenSquare className="h-4 w-4" />
        Edit
      </Link>
      {status === "active" && (
        <button
          type="button"
          onClick={close}
          disabled={busy !== null}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-sm font-semibold hover:bg-muted disabled:opacity-60"
        >
          {busy === "close" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
          Close
        </button>
      )}
      <button
        type="button"
        onClick={del}
        disabled={busy !== null}
        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        {busy === "delete" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        Delete
      </button>
    </>
  );
}
