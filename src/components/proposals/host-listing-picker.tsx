"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PickerListing {
  id: string;
  title: string;
  area_name: string;
  price_min: number | null;
  thumbnail_url: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Caller receives the chosen listing id and is responsible for the
   *  next step (POST /api/contact-requests/from-proposal/[threadId]). */
  onSelect: (listingId: string) => void;
}

/**
 * Host-side modal for picking which listing to send terms about, used
 * from the Trip Wish bridge in thread-view (S9d Task 5).
 *
 * Why a picker (vs auto-pick): a TW carries dates + guest count but no
 * listing — the host is the one selecting which property to offer.
 * The Host Offer side never needs this (HO already pins listing_id).
 */
export function HostListingPicker({ isOpen, onClose, onSelect }: Props) {
  const [listings, setListings] = useState<PickerListing[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    // Fetch on open so we always reflect the host's current active
    // listings (they could have published or unpublished one in
    // another tab while the thread was sitting open).
    let cancelled = false;
    setLoading(true);
    setQuery("");
    (async () => {
      try {
        const res = await fetch("/api/me/listings");
        const data = (await res.json().catch(() => ({}))) as {
          listings?: PickerListing[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          toast.error(data.error || "Couldn't load listings");
          setListings([]);
        } else {
          setListings(data.listings ?? []);
        }
      } catch {
        if (cancelled) return;
        toast.error("Network error");
        setListings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return listings ?? [];
    return (listings ?? []).filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.area_name.toLowerCase().includes(q)
    );
  }, [listings, query]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pick a listing for these stay terms</DialogTitle>
          <DialogDescription>
            Choose the property to offer. The guest&apos;s dates and party
            size from the Trip Wish are pre-filled on the next screen.
          </DialogDescription>
        </DialogHeader>

        {/* Search — useful once a host has more than a couple
            listings; harmless when they have one. Filters client-side
            against both title and area_name. */}
        {(listings?.length ?? 0) > 3 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by title or area"
              className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm focus:border-foreground focus:outline-none"
            />
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto -mx-1">
          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {!loading && (listings?.length ?? 0) === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <div className="text-sm font-semibold">
                You have no active listings
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Create one first to send stay terms to a guest.
              </div>
            </div>
          )}

          {!loading && (listings?.length ?? 0) > 0 && filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
              No listings match &ldquo;{query}&rdquo;.
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <ul className="space-y-2 px-1">
              {filtered.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(l.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-white p-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {l.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={l.thumbnail_url}
                          alt={l.title}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {l.title}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {l.area_name}
                      </div>
                    </div>
                    {typeof l.price_min === "number" && l.price_min > 0 && (
                      <div className="shrink-0 text-xs font-semibold text-foreground">
                        ${l.price_min}/night
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
