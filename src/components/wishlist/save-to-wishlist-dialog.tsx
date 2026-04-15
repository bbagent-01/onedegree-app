"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Heart, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Wishlist {
  id: string;
  name: string;
  is_default: boolean;
  is_member: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle: string;
  /** Called with the final set of wishlist IDs containing this listing. */
  onSaved?: (savedIn: string[]) => void;
}

export function SaveToWishlistDialog({
  open,
  onOpenChange,
  listingId,
  listingTitle,
  onSaved,
}: Props) {
  const [lists, setLists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/wishlists?listingId=${encodeURIComponent(listingId)}`
      );
      if (!res.ok) {
        toast.error("Couldn't load your wishlists");
        return;
      }
      const data = (await res.json()) as { wishlists: Wishlist[] };
      setLists(data.wishlists);
      // If the user has no lists at all, immediately show the
      // "Create your first wishlist" form.
      if (data.wishlists.length === 0) setShowNewForm(true);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (open) {
      setShowNewForm(false);
      setNewName("");
      fetchLists();
    }
  }, [open, fetchLists]);

  const toggleList = async (wishlistId: string) => {
    if (pendingId) return;
    setPendingId(wishlistId);

    // Optimistic flip
    setLists((prev) =>
      prev.map((l) =>
        l.id === wishlistId ? { ...l, is_member: !l.is_member } : l
      )
    );

    try {
      const res = await fetch("/api/wishlists/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, wishlistId, action: "toggle" }),
      });
      if (!res.ok) {
        toast.error("Couldn't update wishlist");
        setLists((prev) =>
          prev.map((l) =>
            l.id === wishlistId ? { ...l, is_member: !l.is_member } : l
          )
        );
        return;
      }
      const data = (await res.json()) as { saved_in: string[] };
      onSaved?.(data.saved_in);
    } catch {
      toast.error("Network error");
      setLists((prev) =>
        prev.map((l) =>
          l.id === wishlistId ? { ...l, is_member: !l.is_member } : l
        )
      );
    } finally {
      setPendingId(null);
    }
  };

  const createList = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/wishlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, listingId }),
      });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(error || "Couldn't create list");
        return;
      }
      const data = (await res.json()) as {
        wishlist: { id: string; name: string; is_default: boolean };
      };
      toast.success(`Saved to "${name}"`);
      setLists((prev) => [
        ...prev,
        { ...data.wishlist, is_member: true },
      ]);
      setNewName("");
      setShowNewForm(false);

      // Refresh membership state so the calling card updates correctly.
      const refresh = await fetch(
        `/api/wishlists?listingId=${encodeURIComponent(listingId)}`
      );
      if (refresh.ok) {
        const refreshed = (await refresh.json()) as {
          wishlists: Wishlist[];
        };
        onSaved?.(
          refreshed.wishlists.filter((w) => w.is_member).map((w) => w.id)
        );
      }
    } catch {
      toast.error("Network error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="border-b border-border px-6 pb-4 pt-5">
          <DialogTitle className="text-base font-semibold">
            Save to a wishlist
          </DialogTitle>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {listingTitle}
          </p>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <>
              {lists.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleList(l.id)}
                  disabled={pendingId === l.id}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors",
                    "hover:bg-muted disabled:opacity-60"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      l.is_member ? "bg-brand/10" : "bg-muted"
                    )}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4",
                        l.is_member
                          ? "fill-red-500 text-red-500"
                          : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {l.name}
                      {l.is_default && (
                        <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  {l.is_member && (
                    <Check className="h-4 w-4 shrink-0 text-brand" />
                  )}
                </button>
              ))}

              {showNewForm ? (
                <form onSubmit={createList} className="px-4 pt-3">
                  <label className="text-xs font-semibold text-muted-foreground">
                    New wishlist name
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value.slice(0, 60))}
                      placeholder="e.g. Summer 2026"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewForm(false)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                      aria-label="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={creating || !newName.trim()}
                    className="mt-3 w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-60"
                  >
                    {creating ? "Creating…" : "Create & save"}
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewForm(true)}
                  className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-muted"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-semibold">
                    Create new wishlist
                  </div>
                </button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
