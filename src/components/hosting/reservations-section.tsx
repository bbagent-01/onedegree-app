"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Check, X } from "lucide-react";
import type { HostingReservation } from "@/lib/hosting-data";
import { toast } from "sonner";
import { TrustBadge } from "@/components/trust-badge";
import { ConnectionPopover } from "@/components/trust/connection-breakdown";
import Link from "next/link";

function formatDateRange(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return "Dates TBD";
  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${ci.toLocaleDateString(undefined, opts)} – ${co.toLocaleDateString(undefined, opts)}, ${co.getFullYear()}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusBadge(status: HostingReservation["status"]) {
  const map: Record<HostingReservation["status"], { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
    },
    accepted: {
      label: "Confirmed",
      className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
    },
    declined: {
      label: "Declined",
      className: "bg-red-100 text-red-800 hover:bg-red-100",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
    },
  };
  const m = map[status];
  return <Badge className={m.className}>{m.label}</Badge>;
}

function ReservationCard({
  reservation,
  onRespond,
  onMessage,
  isPending,
}: {
  reservation: HostingReservation;
  onRespond: (id: string, action: "accepted" | "declined") => void;
  onMessage: (reservation: HostingReservation) => void;
  isPending: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-4">
        <ConnectionPopover targetUserId={reservation.guest_id}>
          <Avatar className="h-12 w-12 shrink-0 cursor-pointer">
            {reservation.guest_avatar && (
              <AvatarImage src={reservation.guest_avatar} alt={reservation.guest_name} />
            )}
            <AvatarFallback>{initials(reservation.guest_name)}</AvatarFallback>
          </Avatar>
        </ConnectionPopover>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${reservation.guest_id}`}
                  className="truncate font-semibold text-foreground hover:underline"
                >
                  {reservation.guest_name}
                </Link>
                {reservation.trust_score > 0 && (
                  <TrustBadge
                    score={reservation.trust_score}
                    connectionCount={reservation.trust_connection_count}
                    size="sm"
                  />
                )}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {reservation.listing_title}
              </p>
            </div>
            {statusBadge(reservation.status)}
          </div>

          <p className="mt-2 text-sm text-foreground">
            {formatDateRange(reservation.check_in, reservation.check_out)}
            <span className="text-muted-foreground">
              {" "}· {reservation.guest_count} guest
              {reservation.guest_count === 1 ? "" : "s"}
            </span>
            {typeof reservation.total_estimate === "number" &&
              reservation.total_estimate > 0 && (
                <span className="text-muted-foreground">
                  {" "}· ${reservation.total_estimate.toLocaleString()} estimated
                </span>
              )}
          </p>

          {reservation.message &&
            reservation.message !== "(No message included)" && (
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                “{reservation.message}”
              </p>
            )}
          {reservation.message === "(No message included)" && (
            <p className="mt-2 text-sm italic text-muted-foreground/70">
              No message from guest
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onMessage(reservation)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Message guest
            </button>
            {reservation.status === "pending" && (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onRespond(reservation.id, "accepted")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onRespond(reservation.id, "declined")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                >
                  <X className="h-3.5 w-3.5" />
                  Decline
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function ReservationsSection({
  upcoming,
  completed,
  cancelled,
}: {
  upcoming: HostingReservation[];
  completed: HostingReservation[];
  cancelled: HostingReservation[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState("upcoming");
  const [isPending, startTransition] = useTransition();

  const handleRespond = (id: string, action: "accepted" | "declined") => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/contact-requests/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: action }),
        });
        if (!res.ok) throw new Error("Failed");
        toast.success(action === "accepted" ? "Request approved" : "Request declined");
        router.refresh();
      } catch {
        toast.error("Something went wrong");
      }
    });
  };

  const handleMessage = (reservation: HostingReservation) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/message-threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listingId: reservation.listing_id,
            otherUserId: reservation.guest_id,
            contactRequestId: reservation.id,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          threadId?: string;
          error?: string;
        };
        if (!res.ok || !data.threadId) {
          toast.error(data.error || "Couldn't open conversation");
          return;
        }
        router.push(`/inbox/${data.threadId}`);
      } catch {
        toast.error("Something went wrong");
      }
    });
  };

  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground">Reservations</h2>
      <Tabs value={tab} onValueChange={setTab} className="mt-4 !flex-col">
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-6 border-b border-border !rounded-none bg-transparent p-0"
        >
          <TabsTrigger
            value="upcoming"
            className="!h-auto !flex-none !px-0 pb-3 text-base !rounded-none data-active:!bg-transparent data-active:after:!opacity-100 after:!bottom-[-1px] after:!h-0.5 after:!bg-foreground"
          >
            Upcoming{upcoming.length > 0 ? ` (${upcoming.length})` : ""}
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="!h-auto !flex-none !px-0 pb-3 text-base !rounded-none data-active:!bg-transparent data-active:after:!opacity-100 after:!bottom-[-1px] after:!h-0.5 after:!bg-foreground"
          >
            Completed{completed.length > 0 ? ` (${completed.length})` : ""}
          </TabsTrigger>
          <TabsTrigger
            value="cancelled"
            className="!h-auto !flex-none !px-0 pb-3 text-base !rounded-none data-active:!bg-transparent data-active:after:!opacity-100 after:!bottom-[-1px] after:!h-0.5 after:!bg-foreground"
          >
            Cancelled{cancelled.length > 0 ? ` (${cancelled.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcoming.length === 0 ? (
            <EmptyState label="No upcoming reservations." />
          ) : (
            upcoming.map((r) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                onRespond={handleRespond}
                onMessage={handleMessage}
                isPending={isPending}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completed.length === 0 ? (
            <EmptyState label="No completed stays yet." />
          ) : (
            completed.map((r) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                onRespond={handleRespond}
                onMessage={handleMessage}
                isPending={isPending}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="mt-4 space-y-3">
          {cancelled.length === 0 ? (
            <EmptyState label="No cancelled reservations." />
          ) : (
            cancelled.map((r) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                onRespond={handleRespond}
                onMessage={handleMessage}
                isPending={isPending}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
