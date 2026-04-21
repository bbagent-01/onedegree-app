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
  reportedUserId: string;
  reportedUserName: string;
}

export function ProfileSafetyMenu({
  reportedUserId,
  reportedUserName,
}: Props) {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More actions"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-foreground hover:bg-muted"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onClick={() => setReportOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Flag className="mr-2 h-4 w-4" />
            Report user
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportUserModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        reportedUserId={reportedUserId}
        reportedUserName={reportedUserName}
        sourceContext={{ source: "profile" }}
      />
    </>
  );
}
