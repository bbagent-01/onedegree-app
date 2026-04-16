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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, Users } from "lucide-react";
import { toast } from "sonner";
import type { TrustPathUser } from "@/lib/trust-data";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Listing the viewer is trying to unlock. */
  listingId: string;
  listingTitle: string;
  /** The host's name — used in the default message body. */
  hostName: string;
  /** First-degree connectors who also know the host. */
  mutualConnections: TrustPathUser[];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Modal that lets a viewer ask one of their mutual connections to
 * introduce them to a listing's host. Picks a connector, composes a
 * prefilled message, and opens the resulting thread.
 */
export function RequestIntroDialog({
  open,
  onOpenChange,
  listingId,
  listingTitle,
  hostName,
  mutualConnections,
}: Props) {
  const router = useRouter();
  const [sendingId, setSendingId] = useState<string | null>(null);

  const sendTo = async (connector: TrustPathUser) => {
    if (sendingId) return;
    setSendingId(connector.id);
    try {
      const res = await fetch("/api/trust/request-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          connectorId: connector.id,
          hostName,
          listingTitle,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        threadId?: string;
        error?: string;
      };
      if (!res.ok || !data.threadId) {
        toast.error(data.error || "Couldn't send request");
        return;
      }
      toast.success(`Introduction request sent to ${connector.name.split(" ")[0]}`);
      onOpenChange(false);
      router.push(`/inbox/${data.threadId}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Users className="h-4 w-4 text-muted-foreground" />
            Request an introduction
          </DialogTitle>
          <DialogDescription>
            Ask a mutual connection to introduce you to {hostName.split(" ")[0]}.
            We&apos;ll pre-fill a message for you.
          </DialogDescription>
        </DialogHeader>

        {mutualConnections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            You don&apos;t share any connections with this host yet. Grow your
            network to find a mutual friend.
          </div>
        ) : (
          <ul className="max-h-[340px] space-y-2 overflow-y-auto">
            {mutualConnections.slice(0, 20).map((c) => {
              const isSending = sendingId === c.id;
              return (
                <li key={c.id}>
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-white p-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      {c.avatar_url && (
                        <AvatarImage src={c.avatar_url} alt={c.name} />
                      )}
                      <AvatarFallback>{initials(c.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {c.name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        Mutual connection
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!!sendingId}
                      onClick={() => sendTo(c)}
                      className="shrink-0 rounded-lg"
                    >
                      {isSending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MessageCircle className="h-3.5 w-3.5" />
                      )}
                      Ask
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
