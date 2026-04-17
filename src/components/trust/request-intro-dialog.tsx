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
import { Loader2, MessageCircle, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import type { TrustPathUser } from "@/lib/trust-data";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle: string;
  hostName: string;
  /** Mutual connections — empty for the anonymous-to-host route. */
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
 * Two-mode intro request dialog.
 *
 *   When mutualConnections is non-empty: pick a connector. A pre-
 *   filled forwarding message is sent to them; they decide whether
 *   to forward or decline.
 *
 *   When mutualConnections is empty: viewer sends an anonymous intro
 *   message directly to the host. The host sees "Someone on 1° B&B"
 *   in their Intro Requests inbox until they reply — at which point
 *   identities reveal and the thread promotes to Messages.
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
  const [anonSending, setAnonSending] = useState(false);
  const [anonMessage, setAnonMessage] = useState("");
  const hostFirst = hostName.split(" ")[0];
  const hasMutuals = mutualConnections.length > 0;

  const sendToConnector = async (connector: TrustPathUser) => {
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
      toast.success(`Request sent to ${connector.name.split(" ")[0]}`);
      onOpenChange(false);
      router.push(`/inbox/${data.threadId}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSendingId(null);
    }
  };

  const sendAnonymous = async () => {
    if (anonSending) return;
    setAnonSending(true);
    try {
      const res = await fetch("/api/trust/request-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          hostName,
          listingTitle,
          message: anonMessage.trim() || undefined,
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
      toast.success("Intro message sent — your identity stays private");
      onOpenChange(false);
      router.push(`/inbox/${data.threadId}`);
    } catch {
      toast.error("Network error");
    } finally {
      setAnonSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {hasMutuals ? (
              <Users className="h-4 w-4 text-muted-foreground" />
            ) : (
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            )}
            {hasMutuals ? "Request an introduction" : "Send intro message"}
          </DialogTitle>
          <DialogDescription>
            {hasMutuals
              ? `Pick a mutual connection to pass a message along to ${hostFirst}.`
              : `No mutual connections yet. Send ${hostFirst} an anonymous intro — your identity stays private until they reply.`}
          </DialogDescription>
        </DialogHeader>

        {hasMutuals ? (
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
                        Via {c.name.split(" ")[0]}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        They decide whether to forward or decline
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!!sendingId}
                      onClick={() => sendToConnector(c)}
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
        ) : (
          <div className="space-y-3">
            <textarea
              value={anonMessage}
              onChange={(e) => setAnonMessage(e.target.value)}
              placeholder={`Tell ${hostFirst} why you'd like to connect…`}
              rows={5}
              maxLength={1000}
              className="w-full resize-none rounded-lg border-2 border-border bg-white p-3 text-sm shadow-sm focus:border-foreground/60 focus:outline-none"
            />
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">
                What {hostFirst} will see
              </div>
              <div className="mt-0.5">
                &ldquo;Someone on 1° B&amp;B&rdquo; + your message. Your name
                and profile appear only once they reply.
              </div>
            </div>
            <Button
              type="button"
              onClick={sendAnonymous}
              disabled={anonSending}
              className="h-10 w-full rounded-lg bg-brand font-semibold hover:bg-brand-600"
            >
              {anonSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Send intro message
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
