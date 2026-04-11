"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactRequestCard } from "@/components/contact-request-card";
import { ReviewForm } from "@/components/review-form";
import { IncidentForm } from "@/components/incident-form";
import { PostStayVouchPrompt } from "@/components/post-stay-vouch-prompt";
import { StarRating } from "@/components/star-rating";
import {
  Home,
  MessageSquare,
  CheckCircle,
  Star,
  CalendarDays,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DashboardClientProps {
  stats: {
    activeListings: number;
    totalRequests: number;
    pendingRequests: number;
    completedStays: number;
    avgListingRating: number | null;
  };
  pendingRequests: Array<Record<string, unknown>>;
  stays: Array<Record<string, unknown>>;
  listings: Array<{
    id: string;
    title: string;
    area_name: string;
    avg_listing_rating: number | null;
    listing_review_count: number;
  }>;
}

export function DashboardClient({
  stats,
  pendingRequests,
  stays,
  listings,
}: DashboardClientProps) {
  const router = useRouter();
  const [reviewStay, setReviewStay] = useState<Record<string, unknown> | null>(null);
  const [incidentStay, setIncidentStay] = useState<Record<string, unknown> | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const upcomingStays = stays.filter(
    (s) =>
      (s.host_confirmed || s.guest_confirmed) &&
      (!s.check_out || (s.check_out as string) >= today)
  );
  const completedStays = stays.filter(
    (s) => s.host_confirmed && s.guest_confirmed
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Manage your listings and booking requests
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary-light p-2">
                <Home className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {stats.activeListings}
                </p>
                <p className="text-[10px] text-foreground-secondary">
                  Active Listings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2">
                <MessageSquare className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {stats.pendingRequests}
                </p>
                <p className="text-[10px] text-foreground-secondary">
                  Pending Requests
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-trust-solid/10 p-2">
                <CheckCircle className="size-4 text-trust-solid" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {stats.completedStays}
                </p>
                <p className="text-[10px] text-foreground-secondary">
                  Completed Stays
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2">
                <Star className="size-4 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {stats.avgListingRating
                    ? stats.avgListingRating.toFixed(1)
                    : "—"}
                </p>
                <p className="text-[10px] text-foreground-secondary">
                  Avg Listing Rating
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Sections */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Requests
            {stats.pendingRequests > 0 && (
              <Badge variant="warning" className="ml-1.5 text-[10px] px-1.5">
                {stats.pendingRequests}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="listings">My Listings</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingRequests.length === 0 ? (
            <EmptyState text="No pending requests" />
          ) : (
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {pendingRequests.map((r: any) => (
                <ContactRequestCard
                  key={r.id}
                  request={r}
                  viewAs="host"
                  onStatusChange={() => router.refresh()}
                />
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
                <StayCard key={s.id} stay={s} role="host" onConfirm={() => router.refresh()} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedStays.length === 0 ? (
            <EmptyState text="No completed stays yet" />
          ) : (
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {completedStays.map((s: any) => (
                <div key={s.id} className="rounded-xl border border-border bg-white p-4 space-y-3">
                  <StayCard stay={s} role="host" onConfirm={() => router.refresh()} />
                  {/* Review button if not reviewed yet */}
                  {s.guest_rating === null && s.host_confirmed && s.guest_confirmed && (
                    <Button size="sm" variant="outline" onClick={() => setReviewStay(s)}>
                      Review Guest
                    </Button>
                  )}
                  {s.guest_rating !== null && (
                    <PostStayVouchPrompt
                      guestId={s.guest_id}
                      guestName={s.guest?.name || "Guest"}
                      stayConfirmationId={s.id}
                    />
                  )}
                  {s.guest_rating !== null && (
                    <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                      <span>Your review:</span>
                      <StarRating value={s.guest_rating} readonly size="sm" />
                      {s.guest_review_text && <span>— {s.guest_review_text}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="listings" className="mt-4">
          {listings.length === 0 ? (
            <EmptyState text="No active listings" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {listings.map((l) => (
                <Link key={l.id} href={`/listings/${l.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{l.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 pt-0">
                      <p className="text-xs text-foreground-secondary">
                        {l.area_name}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-foreground-secondary">
                        {l.avg_listing_rating && (
                          <span className="flex items-center gap-0.5">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            {Number(l.avg_listing_rating).toFixed(1)}
                          </span>
                        )}
                        <span>
                          {l.listing_review_count} review
                          {l.listing_review_count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
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
              <DialogTitle>Review Guest</DialogTitle>
            </DialogHeader>
            <ReviewForm
              stayId={reviewStay.id as string}
              role="host"
              counterpartName={(reviewStay.guest as { name: string })?.name || "Guest"}
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
              Report an incident instead
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
              reportedUserId={incidentStay.guest_id as string}
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

/* eslint-disable @typescript-eslint/no-explicit-any */
function StayCard({
  stay,
  role,
  onConfirm,
}: {
  stay: any;
  role: "host" | "guest";
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const counterpart = role === "host" ? stay.guest : stay.host;
  const needsConfirm =
    (role === "host" && !stay.host_confirmed) ||
    (role === "guest" && !stay.guest_confirmed);
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
        {counterpart?.avatar_url ? (
          <img
            src={counterpart.avatar_url}
            alt={counterpart.name}
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <div className="size-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold text-sm">
            {counterpart?.name?.charAt(0) || "?"}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">
            {counterpart?.name || "Unknown"}
          </p>
          {stay.listing && (
            <p className="text-xs text-foreground-secondary">
              {stay.listing.title}
            </p>
          )}
          {stay.check_in && (
            <p className="text-[10px] text-foreground-tertiary flex items-center gap-1 mt-0.5">
              <CalendarDays className="size-3" />
              {new Date(stay.check_in).toLocaleDateString()}
              {stay.check_out && <> – {new Date(stay.check_out).toLocaleDateString()}</>}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {bothConfirmed ? (
          <Badge variant="success">Confirmed</Badge>
        ) : needsConfirm ? (
          <Button size="sm" onClick={handleConfirm} disabled={confirming}>
            {confirming ? "..." : "Confirm Stay"}
          </Button>
        ) : (
          <Badge variant="warning">Awaiting other party</Badge>
        )}
      </div>
    </div>
  );
}
