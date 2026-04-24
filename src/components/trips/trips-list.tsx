"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, MessageCircle, Star, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ReviewModal } from "./review-modal";
import { categorizeTrip, type TripCard, type TripTab } from "@/lib/trips-data";
import { TrustTagPopover } from "@/components/trust/trust-tag-popover";
import { ConnectionPopover } from "@/components/trust/connection-breakdown";

interface Props {
  trips: TripCard[];
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
    accepted: { label: "Connected", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" },
    declined: { label: "Declined", className: "bg-red-100 text-red-800 hover:bg-red-100" },
    cancelled: { label: "Cancelled", className: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100" },
  };
  const m = map[status] || map.pending;
  return <Badge className={m.className}>{m.label}</Badge>;
}

function fmt(date: string | null) {
  if (!date) return "TBD";
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name: string | undefined) {
  if (!name) return "G";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TripsList({ trips }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TripTab>("upcoming");
  const [reviewing, setReviewing] = useState<TripCard | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const upcoming: TripCard[] = [];
    const completed: TripCard[] = [];
    const cancelled: TripCard[] = [];
    for (const t of trips) {
      const cat = categorizeTrip({ status: t.status, check_out: t.check_out });
      if (cat === "upcoming") upcoming.push(t);
      else if (cat === "completed") completed.push(t);
      else cancelled.push(t);
    }
    return { upcoming, completed, cancelled };
  }, [trips]);

  const cancelTrip = async (trip: TripCard) => {
    if (cancellingId) return;
    if (!confirm("Cancel this reservation? Your host will be notified.")) return;
    setCancellingId(trip.id);
    try {
      const res = await fetch(`/api/contact-requests/${trip.id}/cancel`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Couldn't cancel");
        return;
      }
      toast.success("Reservation cancelled");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setCancellingId(null);
    }
  };

  const renderList = (
    items: TripCard[],
    emptyHint: string,
    emptyBody?: string
  ) => {
    if (items.length === 0) {
      return (
        <div className="mt-12 rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">{emptyHint}</h2>
          {emptyBody && (
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              {emptyBody}
            </p>
          )}
          <Link
            href="/browse"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Browse stays
          </Link>
        </div>
      );
    }
    return (
      <ul className="mt-6 space-y-4">
        {items.map((t) => {
          const cat = categorizeTrip({
            status: t.status,
            check_out: t.check_out,
          });
          const canCancel =
            cat === "upcoming" && (t.status === "pending" || t.status === "accepted");
          const canReview =
            cat === "completed" && t.status === "accepted" && !t.guest_left_review;
          return (
            <li
              key={t.id}
              className="rounded-xl border border-border bg-white p-4 transition-shadow hover:shadow-sm md:p-5"
            >
              <div className="flex items-start gap-4">
                <Link
                  href={`/trips/${t.id}`}
                  className="block h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted md:h-24 md:w-24"
                >
                  {t.listing?.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.listing.thumbnail_url}
                      alt={t.listing?.title || "Listing"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <CalendarDays className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/trips/${t.id}`}
                        className="block truncate text-base font-semibold hover:underline"
                      >
                        {t.listing?.title || "Listing"}
                      </Link>
                      <div className="truncate text-sm text-muted-foreground">
                        {t.listing?.area_name}
                      </div>
                    </div>
                    {statusBadge(t.status)}
                  </div>
                  <div className="mt-2 text-sm">
                    {fmt(t.check_in)} – {fmt(t.check_out)}
                    <span className="text-muted-foreground">
                      {" · "}
                      {t.guest_count} guest{t.guest_count === 1 ? "" : "s"}
                    </span>
                  </div>
                  {t.host && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <ConnectionPopover
                        targetUserId={t.host.id}
                        direction="incoming"
                      >
                        <Avatar className="h-5 w-5 cursor-pointer">
                          {t.host.avatar_url && (
                            <AvatarImage src={t.host.avatar_url} alt={t.host.name} />
                          )}
                          <AvatarFallback className="text-[10px]">
                            {initials(t.host.name)}
                          </AvatarFallback>
                        </Avatar>
                      </ConnectionPopover>
                      <Link
                        href={`/profile/${t.host.id}`}
                        className="hover:underline"
                      >
                        Hosted by {t.host.name}
                      </Link>
                      {(t.trust_score > 0 || t.trust_is_direct) && t.host && (
                        <TrustTagPopover
                          targetUserId={t.host.id}
                          size="micro"
                          score={t.trust_score}
                          degree={t.trust_degree}
                          direct={t.trust_is_direct}
                          connectorPaths={t.trust_connector_paths}
                        />
                      )}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {t.thread_id && (
                      <Link
                        href={`/inbox/${t.thread_id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Message host
                      </Link>
                    )}
                    <Link
                      href={`/listings/${t.listing_id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      View listing
                    </Link>
                    <Link
                      href={`/trips/${t.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      Trip details
                    </Link>
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => cancelTrip(t)}
                        disabled={cancellingId === t.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        {cancellingId === t.id ? "Cancelling…" : "Cancel"}
                      </button>
                    )}
                    {canReview && (
                      <Button
                        type="button"
                        onClick={() => setReviewing(t)}
                        className="h-auto rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
                      >
                        <Star className="mr-1 h-3.5 w-3.5" />
                        Leave review
                      </Button>
                    )}
                    {cat === "completed" && t.guest_left_review && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        Reviewed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <>
      <Tabs value={tab} onValueChange={(v) => setTab(v as TripTab)} className="mt-6">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming
            {grouped.upcoming.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                {grouped.upcoming.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            {grouped.completed.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                {grouped.completed.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled
            {grouped.cancelled.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                {grouped.cancelled.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          {renderList(
            grouped.upcoming,
            "No upcoming trips",
            "Find your first stay through someone you trust."
          )}
        </TabsContent>
        <TabsContent value="completed">
          {renderList(grouped.completed, "No completed trips yet")}
        </TabsContent>
        <TabsContent value="cancelled">
          {renderList(grouped.cancelled, "Nothing cancelled")}
        </TabsContent>
      </Tabs>

      {reviewing && (
        <ReviewModal
          open={!!reviewing}
          onOpenChange={(open) => !open && setReviewing(null)}
          bookingId={reviewing.id}
          stayConfirmationId={reviewing.stay_confirmation_id}
          listingTitle={reviewing.listing?.title || "this place"}
          hostName={reviewing.host?.name || "your host"}
        />
      )}
    </>
  );
}
