"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Plus, Star, Pencil, CalendarDays } from "lucide-react";
import type { HostingListing } from "@/lib/hosting-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function ToggleSwitch({
  active,
  onChange,
  disabled,
}: {
  active: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        onChange(!active);
      }}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        active ? "bg-brand" : "bg-zinc-300",
        disabled && "opacity-60"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
          active ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

function ListingCard({
  listing,
  onToggle,
  pending,
}: {
  listing: HostingListing;
  onToggle: (id: string, active: boolean) => void;
  pending: boolean;
}) {
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-white transition-shadow hover:shadow-md">
      {/* Photo + title + stats area is a single clickable link to the
          public listing page. Only the action buttons at the bottom
          (toggle, calendar, edit) break out of this link. */}
      <Link
        href={`/listings/${listing.id}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {listing.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.thumbnail_url}
              alt={listing.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No photo
            </div>
          )}
          <div className="absolute left-3 top-3">
            {listing.is_active ? (
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                Active
              </Badge>
            ) : (
              <Badge className="bg-zinc-900/80 text-white hover:bg-zinc-900/80">
                Paused
              </Badge>
            )}
          </div>
        </div>

        <div className="px-4 pt-4">
          <p className="truncate text-xs uppercase tracking-wide text-muted-foreground">
            {listing.area_name}
          </p>
          <h3 className="mt-0.5 line-clamp-1 font-semibold text-foreground">
            {listing.title}
          </h3>

          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {listing.upcoming_bookings} upcoming
              {listing.upcoming_bookings === 1 ? " booking" : " bookings"}
            </span>
            {listing.avg_rating !== null && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-current text-amber-500" />
                {listing.avg_rating.toFixed(1)} ({listing.review_count})
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="flex items-center justify-between px-4 pb-4 pt-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ToggleSwitch
            active={listing.is_active}
            disabled={pending}
            onChange={(v) => onToggle(listing.id, v)}
          />
          <span>{listing.is_active ? "Listed" : "Paused"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/hosting/listings/${listing.id}/edit?tab=availability`}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground/30"
            title="Calendar"
          >
            <CalendarDays className="h-3 w-3" />
            Calendar
          </Link>
          <Link
            href={`/hosting/listings/${listing.id}/edit`}
            className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ListingsSection({ listings }: { listings: HostingListing[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  const handleToggle = (id: string, active: boolean) => {
    setOptimistic((prev) => ({ ...prev, [id]: active }));
    startTransition(async () => {
      try {
        const res = await fetch(`/api/listings/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: active }),
        });
        if (!res.ok) throw new Error("Failed");
        toast.success(active ? "Listing is now active" : "Listing paused");
        router.refresh();
      } catch {
        toast.error("Couldn't update listing");
        setOptimistic((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    });
  };

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold text-foreground">Your listings</h2>
        <Link
          href="/hosting/create"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" />
          New listing
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {listings.map((listing) => {
          const merged: HostingListing =
            listing.id in optimistic
              ? { ...listing, is_active: optimistic[listing.id] }
              : listing;
          return (
            <ListingCard
              key={listing.id}
              listing={merged}
              onToggle={handleToggle}
              pending={isPending}
            />
          );
        })}

        {/* Create new listing card */}
        <Link
          href="/hosting/create"
          className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 text-center transition-colors hover:border-brand hover:bg-brand/5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-sm">
            <Plus className="h-6 w-6 text-brand" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            Create a new listing
          </p>
          <p className="text-xs text-muted-foreground">
            List another place for guests
          </p>
        </Link>
      </div>
    </section>
  );
}
