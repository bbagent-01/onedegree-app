"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContactRequestCard } from "@/components/contact-request-card";
import { ReviewForm } from "@/components/review-form";
import { IncidentForm } from "@/components/incident-form";
import { StarRating } from "@/components/star-rating";
import { CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MyTripsClientProps {
  requests: Array<Record<string, unknown>>;
  stays: Array<Record<string, unknown>>;
}

export function MyTripsClient({
  requests,
  stays,
}: MyTripsClientProps) {
  const router = useRouter();
  const [reviewStay, setReviewStay] = useState<Record<string, unknown> | null>(null);
  const [incidentStay, setIncidentStay] = useState<Record<string, unknown> | null>(null);

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const today = new Date().toISOString().split("T")[0];
  const upcomingStays = stays.filter(
    (s) =>
      (s.host_confirmed || s.guest_confirmed) &&
      (!s.check_out || (s.check_out as string) >= today)
  );
  const pastStays = stays.filter(
    (s) => s.host_confirmed && s.guest_confirmed
  );

  // Also show accepted requests that don't have a stay confirmation yet
  const acceptedRequests = requests.filter(
    (r) =>
      r.status === "accepted" &&
      !stays.some((s) => s.contact_request_id === r.id)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Trips</h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Your booking requests and stays
        </p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pendingRequests.length > 0 && (
              <Badge variant="warning" className="ml-1.5 text-[10px] px-1.5">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past Stays</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingRequests.length === 0 && acceptedRequests.length === 0 ? (
            <EmptyState text="No pending requests" />
          ) : (
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {pendingRequests.map((r: any) => (
                <ContactRequestCard
                  key={r.id}
                  request={r}
                  viewAs="guest"
                  onStatusChange={() => router.refresh()}
                />
              ))}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {acceptedRequests.map((r: any) => (
                <div key={r.id} className="space-y-2">
                  <ContactRequestCard
                    request={r}
                    viewAs="guest"
                    onStatusChange={() => router.refresh()}
                  />
                  <InitiateStayButton contactRequestId={r.id} onCreated={() => router.refresh()} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          {upcomingStays.length === 0 ? (
            <EmptyState text="No upcoming stays" />
          ) : (
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {upcomingStays.map((s: any) => (
                <GuestStayCard
                  key={s.id}
                  stay={s}
                  onConfirm={() => router.refresh()}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {pastStays.length === 0 ? (
            <EmptyState text="No past stays yet" />
          ) : (
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {pastStays.map((s: any) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-border bg-white p-4 space-y-3"
                >
                  <GuestStayCard
                    stay={s}
                    onConfirm={() => router.refresh()}
                  />
                  {s.host_rating === null &&
                    s.host_confirmed &&
                    s.guest_confirmed && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReviewStay(s)}
                      >
                        Review Host & Listing
                      </Button>
                    )}
                  {s.host_rating !== null && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                        <span>Host:</span>
                        <StarRating value={s.host_rating} readonly size="sm" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                        <span>Place:</span>
                        <StarRating
                          value={s.listing_rating}
                          readonly
                          size="sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      {reviewStay && (
        <Dialog open onOpenChange={() => setReviewStay(null)}>
          <DialogContent showCloseButton className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Review Your Stay</DialogTitle>
            </DialogHeader>
            <ReviewForm
              stayId={reviewStay.id as string}
              role="guest"
              counterpartName={
                (reviewStay.host as { name: string })?.name || "Host"
              }
              listingTitle={
                (reviewStay.listing as { title: string })?.title || undefined
              }
              onSuccess={() => {
                setReviewStay(null);
                router.refresh();
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setReviewStay(null);
                setIncidentStay(reviewStay);
              }}
            >
              Report an incident
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {/* Incident Dialog */}
      {incidentStay && (
        <Dialog open onOpenChange={() => setIncidentStay(null)}>
          <DialogContent showCloseButton className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Report Incident</DialogTitle>
            </DialogHeader>
            <IncidentForm
              reportedUserId={incidentStay.host_id as string}
              stayConfirmationId={incidentStay.id as string}
              onSuccess={() => {
                setIncidentStay(null);
                router.refresh();
              }}
              onCancel={() => setIncidentStay(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-12 text-center">
      <p className="text-sm text-foreground-tertiary">{text}</p>
    </div>
  );
}

function InitiateStayButton({
  contactRequestId,
  onCreated,
}: {
  contactRequestId: string;
  onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await fetch("/api/stay-confirmations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactRequestId }),
      });
      if (res.ok) onCreated();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" onClick={handleCreate} disabled={loading}>
      {loading ? "Creating..." : "Confirm Stay"}
    </Button>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function GuestStayCard({
  stay,
  onConfirm,
}: {
  stay: any;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const host = stay.host;
  const needsConfirm = !stay.guest_confirmed;
  const bothConfirmed = stay.host_confirmed && stay.guest_confirmed;

  async function handleConfirm() {
    setConfirming(true);
    try {
      await fetch(`/api/stay-confirmations/${stay.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      onConfirm();
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        {host?.avatar_url ? (
          <img
            src={host.avatar_url}
            alt={host.name}
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <div className="size-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold text-sm">
            {host?.name?.charAt(0) || "?"}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">
            {host?.name || "Unknown Host"}
          </p>
          {stay.listing && (
            <p className="text-xs text-foreground-secondary">
              {stay.listing.title} · {stay.listing.area_name}
            </p>
          )}
          {stay.check_in && (
            <p className="text-[10px] text-foreground-tertiary flex items-center gap-1 mt-0.5">
              <CalendarDays className="size-3" />
              {new Date(stay.check_in).toLocaleDateString()}
              {stay.check_out && (
                <> – {new Date(stay.check_out).toLocaleDateString()}</>
              )}
            </p>
          )}
        </div>
      </div>
      <div>
        {bothConfirmed ? (
          <Badge variant="success">Confirmed</Badge>
        ) : needsConfirm ? (
          <Button size="sm" onClick={handleConfirm} disabled={confirming}>
            {confirming ? "..." : "Confirm"}
          </Button>
        ) : (
          <Badge variant="warning">Awaiting host</Badge>
        )}
      </div>
    </div>
  );
}
