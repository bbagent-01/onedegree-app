"use client";

import { useState } from "react";
import { Flag, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportUserModal } from "./report-user-modal";

interface Props {
  threadId: string;
  messageId: string;
  senderId: string;
  senderName: string;
}

/**
 * Per-message dropdown shown on incoming messages. "Block user" is
 * deferred to a follow-up session until a blocks endpoint exists;
 * today the only action is "Report message", which opens the shared
 * ReportUserModal prefilled with source_context pointing back to
 * this thread + message.
 */
export function MessageReportMenu({
  threadId,
  messageId,
  senderId,
  senderName,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Message actions"
          className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-muted focus:opacity-100 group-hover:opacity-100"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuItem
            onClick={() => setOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Flag className="mr-2 h-3.5 w-3.5" />
            Report message
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportUserModal
        open={open}
        onOpenChange={setOpen}
        reportedUserId={senderId}
        reportedUserName={senderName}
        sourceContext={{
          source: "thread",
          thread_id: threadId,
          message_id: messageId,
        }}
      />
    </>
  );
}
