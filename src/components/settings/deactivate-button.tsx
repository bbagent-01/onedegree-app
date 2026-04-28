"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { toast } from "sonner";

export function DeactivateButton() {
  const { signOut } = useClerk();
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (pending) return;
    const confirmed = window.confirm(
      "Deactivate your account? Your listings will be hidden and you'll be signed out."
    );
    if (!confirmed) return;

    setPending(true);
    try {
      const res = await fetch("/api/users/deactivate", { method: "POST" });
      if (!res.ok) {
        toast.error("Couldn't deactivate account");
        setPending(false);
        return;
      }
      toast.success("Account deactivated. Signing you out…");
      setTimeout(() => signOut({ redirectUrl: "/" }), 800);
    } catch {
      toast.error("Network error");
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-lg border border-destructive/40 bg-white px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
    >
      {pending ? "Deactivating…" : "Deactivate account"}
    </button>
  );
}
