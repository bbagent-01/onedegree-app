"use client";

/**
 * Thread card for the `__type:intro_made:<connector_id>__` message.
 * Posted to the guest ↔ host thread when a connector forwards an
 * intro via POST /api/trust/introduce. Both sides see a notification
 * card naming the connector — role-specific copy branches on
 * viewerRole.
 */

import Link from "next/link";
import { Handshake } from "lucide-react";

interface Props {
  viewerRole: "guest" | "host";
  connectorId: string;
  connectorName: string;
  otherFirstName: string;
}

export function IntroMadeCard({
  viewerRole,
  connectorId,
  connectorName,
  otherFirstName,
}: Props) {
  const connectorFirst = connectorName.split(" ")[0] || "a mutual";
  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border-2 border-violet-200 bg-violet-50/60 shadow-sm">
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-violet-700 shadow-sm">
          <Handshake className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
            New introduction
          </div>
          <div className="mt-0.5 text-sm font-semibold text-foreground">
            {viewerRole === "host"
              ? `${connectorFirst} introduced you to ${otherFirstName}`
              : `${connectorFirst} introduced you to ${otherFirstName}`}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {viewerRole === "host"
              ? `${otherFirstName} is interested in a stay. Reply to start the conversation.`
              : `Say hi — ${otherFirstName} is expecting to hear from you.`}
          </div>
          <div className="mt-2">
            <Link
              href={`/profile/${connectorId}`}
              className="text-xs font-medium text-violet-700 underline-offset-2 hover:underline"
            >
              View {connectorFirst}&rsquo;s profile →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
