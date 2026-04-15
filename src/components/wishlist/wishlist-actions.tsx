"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  wishlistId: string;
  initialName: string;
  canDelete: boolean;
}

export function WishlistActions({
  wishlistId,
  initialName,
  canDelete,
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  const submitRename = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/wishlists/${wishlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(error || "Couldn't rename");
        return;
      }
      toast.success("Renamed");
      setRenameOpen(false);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const deleteList = async () => {
    if (!canDelete) return;
    const ok = window.confirm(
      "Delete this wishlist? Saved places will be removed from it."
    );
    if (!ok) return;
    setMenuOpen(false);
    try {
      const res = await fetch(`/api/wishlists/${wishlistId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(error || "Couldn't delete");
        return;
      }
      toast.success("Deleted");
      router.push("/wishlists");
      router.refresh();
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white hover:bg-muted"
          aria-label="Wishlist options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-52 rounded-xl border border-border bg-white p-1 shadow-lg"
        >
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setRenameOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-muted"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
            Rename list
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={deleteList}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete list
            </button>
          )}
        </PopoverContent>
      </Popover>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename wishlist</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitRename} className="mt-2">
            <Label className="text-sm font-semibold">Name</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              className="mt-1.5"
              required
            />
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
