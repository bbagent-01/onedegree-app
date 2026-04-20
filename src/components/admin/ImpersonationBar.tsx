// REMOVE BEFORE BETA — see CC-Dev1 recap. All files in
// src/lib/impersonation/, src/components/admin/Impersonation*.tsx, and
// src/app/api/admin/impersonate/ delete together. Env vars IMPERSONATION_*
// and the impersonation_log table + is_test_user column must also be removed.
"use client";

import { useCallback, useState } from "react";

interface Props {
  currentName: string;
  realUserName: string;
}

/**
 * Persistent purple bar — fixed-position so it doesn't reflow the
 * page layout. Only rendered when the server determined the session
 * is actively impersonating.
 */
export function ImpersonationBar({ currentName, realUserName }: Props) {
  const [busy, setBusy] = useState(false);

  const stop = useCallback(async () => {
    setBusy(true);
    try {
      await fetch("/api/admin/impersonate/stop", { method: "POST" });
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[95] flex items-center justify-center gap-3 bg-purple-600 px-4 py-1 text-xs font-medium text-white shadow-md"
      role="status"
    >
      <span className="truncate">
        Impersonating <strong>{currentName}</strong> (signed in as{" "}
        {realUserName})
      </span>
      <button
        type="button"
        onClick={stop}
        disabled={busy}
        className="rounded-md bg-white/15 px-2 py-0.5 text-white hover:bg-white/25 disabled:opacity-60"
      >
        {busy ? "Returning…" : "← Return to real user"}
      </button>
    </div>
  );
}
