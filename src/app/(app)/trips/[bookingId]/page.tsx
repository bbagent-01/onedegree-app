import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Mail,
  Phone,
  ChevronLeft,
  Users,
  BookOpen,
} from "lucide-react";
import { getCurrentUser } from "@/lib/messaging-data";
import { getTripDetail } from "@/lib/trips-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TripDetailActions } from "@/components/trips/trip-detail-actions";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
    accepted: { label: "Confirmed", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" },
    declined: { label: "Declined", className: "bg-red-100 text-red-800 hover:bg-red-100" },
    cancelled: { label: "Cancelled", className: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100" },
  };
  const m = map[status] || map.pending;
  return <Badge className={m.className}>{m.label}</Badge>;
}

function fmt(date: string | null) {
  if (!date) return "TBD";
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "short",
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

export default async function TripDetailPage({ params }: PageProps) {
  const { bookingId } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect(`/sign-in?redirect_url=/trips/${bookingId}`);
  }

  const trip = await getTripDetail(currentUser.id, bookingId);
  if (!trip) notFound();

  const isConfirmed = trip.status === "accepted";
  const isPostCheckout =
    trip.check_out && trip.check_out < new Date().toISOString().split("T")[0];

  // Render house manual content if it has any keys
  const manual = trip.house_manual?.content || {};
  const manualEntries = Object.entries(manual).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-6 md:px-6 md:py-10">
      <Link
        href="/trips"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to trips
      </Link>

      {/* Header card */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white">
        <div className="aspect-[16/8] w-full bg-muted">
          {trip.listing?.thumbnail_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trip.listing.thumbnail_url}
              alt={trip.listing.title}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold md:text-2xl">
                {trip.listing?.title || "Trip"}
              </h1>
              {trip.listing?.area_name && (
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {trip.listing.area_name}
                </div>
              )}
            </div>
            {statusBadge(trip.status)}
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Check-in
              </dt>
              <dd className="mt-1 text-sm font-semibold">{fmt(trip.check_in)}</dd>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Checkout
              </dt>
              <dd className="mt-1 text-sm font-semibold">{fmt(trip.check_out)}</dd>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Guests
              </dt>
              <dd className="mt-1 text-sm font-semibold">
                {trip.guest_count} guest{trip.guest_count === 1 ? "" : "s"}
              </dd>
            </div>
          </dl>

          <TripDetailActions trip={trip} canReview={!!isPostCheckout} />
        </div>
      </div>

      {/* Host section */}
      {trip.host && (
        <section className="mt-6 rounded-2xl border border-border bg-white p-5 md:p-6">
          <h2 className="text-base font-semibold">Your host</h2>
          <div className="mt-3 flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {trip.host.avatar_url && (
                <AvatarImage src={trip.host.avatar_url} alt={trip.host.name} />
              )}
              <AvatarFallback>{initials(trip.host.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{trip.host.name}</div>
              {!isConfirmed && (
                <div className="text-xs text-muted-foreground">
                  Contact info unlocks once your host confirms.
                </div>
              )}
            </div>
          </div>
          {isConfirmed && trip.host_email && (
            <div className="mt-4 space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${trip.host_email}`}
                  className="hover:underline"
                >
                  {trip.host_email}
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this to coordinate check-in details, parking, and arrival
                time directly with your host.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Original message */}
      {trip.message && (
        <section className="mt-6 rounded-2xl border border-border bg-white p-5 md:p-6">
          <h2 className="text-base font-semibold">Your request</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {trip.message}
          </p>
          {trip.host_response_message && (
            <>
              <h3 className="mt-5 text-sm font-semibold">Host&rsquo;s reply</h3>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">
                {trip.host_response_message}
              </p>
            </>
          )}
        </section>
      )}

      {/* House manual — only after confirm */}
      {isConfirmed && manualEntries.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-white p-5 md:p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <BookOpen className="h-4 w-4" />
            House manual
          </h2>
          <dl className="mt-3 space-y-3">
            {manualEntries.map(([key, value]) => (
              <div key={key} className="border-b border-border/60 pb-3 last:border-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {key.replace(/_/g, " ")}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm">
                  {String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {isConfirmed && manualEntries.length === 0 && (
        <section className="mt-6 rounded-2xl border border-dashed border-border bg-white p-5 text-center md:p-6">
          <BookOpen className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Your host hasn&rsquo;t shared a house manual yet. Message them for
            check-in instructions.
          </p>
        </section>
      )}

      {/* Quiet host phone hint suppressed — privacy */}
      {isConfirmed && trip.host && !trip.host_email && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Phone className="mr-1 inline h-3 w-3" />
          Coordinate directly via the in-app conversation.
        </p>
      )}
    </div>
  );
}
