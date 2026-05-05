"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DeactivateButton() {
  const { signOut } = useClerk();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/users/deactivate", { method: "POST" });
      if (!res.ok) {
        toast.error("Couldn't deactivate account");
        setPending(false);
        return;
      }
      setOpen(false);
      toast.success("Account deactivated. Signing you out…");
      setTimeout(() => signOut({ redirectUrl: "/" }), 800);
    } catch {
      toast.error("Network error");
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-destructive/40 bg-white px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Deactivate account
      </button>
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              Deactivate your account?
            </DialogTitle>
            <DialogDescription>
              Your listings will be hidden, your trip history stays in
              place, and you&apos;ll be signed out. We don&apos;t delete
              your data — email{" "}
              <a href="mailto:hello@trustead.app">hello@trustead.app</a>{" "}
              if you need a full deletion.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={pending}
            >
              {pending ? "Deactivating…" : "Yes, deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
