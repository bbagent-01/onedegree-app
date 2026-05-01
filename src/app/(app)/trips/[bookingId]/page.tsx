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
  Receipt,
} from "lucide-react";
import { getCurrentUser } from "@/lib/messaging-data";
import { getTripDetail } from "@/lib/trips-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TripDetailActions } from "@/components/trips/trip-detail-actions";
import { CollapsibleTripTimeline } from "@/components/booking/CollapsibleTripTimeline";
import { resolveStages } from "@/lib/booking-stage";
import { CancellationPolicyCard } from "@/components/booking/CancellationPolicyCard";
import { AcceptTermsCheckbox } from "@/components/booking/AcceptTermsCheckbox";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-amber-400/15 text-amber-200 hover:bg-amber-400/15" },
    accepted: { label: "Connected", className: "bg-[var(--tt-mint-mid)]/20 text-[var(--tt-mint)] hover:bg-[var(--tt-mint-mid)]/20" },
    declined: { label: "Declined", className: "bg-red-400/15 text-red-200 hover:bg-red-400/15" },
    cancelled: { label: "Cancelled", className: "bg-white/5 text-[var(--tt-cream-muted)] hover:bg-white/5" },
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

      {/* Post-stay vouch banner retired — vouching now lives
          inside ReviewFlowDialog (triggered from the thread's
          review_prompt card), so a separate prompt here is
          redundant. */}

      {/* Header card — listing photo + title + dates always
          at the top of the page. Timeline moved below this so
          the main visual anchor is the stay itself. */}
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
              <h1 className="font-serif text-xl font-semibold md:text-2xl">
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

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            {typeof trip.total_estimate === "number" &&
              trip.total_estimate > 0 && (
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Receipt className="h-3.5 w-3.5" />
                    {isConfirmed ? "Total" : "Estimated total"}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">
                    ${trip.total_estimate.toLocaleString()}
                  </dd>
                </div>
              )}
          </dl>

          <TripDetailActions trip={trip} canReview={!!isPostCheckout} />
        </div>
      </div>

      {/* Trip timeline — collapsible. Collapsed state shows all
          done stages + next 3 upcoming; expanded shows every
          stage. Moved below the listing card so the stay identity
          comes first. viewer_role drives which stage reads as
          "reviewed" for this viewer. */}
      <div className="mt-6">
        <CollapsibleTripTimeline
          stages={resolveStages({
            status: trip.status,
            check_in: trip.check_in,
            check_out: trip.check_out,
            created_at: trip.created_at,
            responded_at: trip.responded_at,
            terms_accepted_at: trip.terms_accepted_at,
            viewer_role: trip.viewer_role,
            stay_confirmation: {
              guest_rating: trip.stay_guest_rating,
              host_rating: trip.stay_host_rating,
            },
            payment_events: trip.payment_events,
          })}
        />
      </div>

      {/* Cancellation & payment policy — snapshot on accepted
          reservations, resolved live before that. */}
      <section className="mt-6">
        <h2 className="mb-3 text-base font-semibold">
          Cancellation &amp; payment policy
        </h2>
        <CancellationPolicyCard
          policy={trip.cancellation_policy}
          scope={isConfirmed ? "reservation" : "listing"}
        />
        {isConfirmed && (
          <div className="mt-3">
            <AcceptTermsCheckbox
              bookingId={bookingId}
              initialAcceptedAt={trip.terms_accepted_at}
            />
          </div>
        )}
      </section>

      {/* Counterparty section — role-neutral. Shows the host when
          viewer is guest, and the guest when viewer is host. The
          section header mirrors the counterparty's role so the
          label always reads naturally for the viewer. */}
      {trip.counterparty && (
        <section className="mt-6 rounded-2xl border border-border bg-white p-5 md:p-6">
          <h2 className="text-base font-semibold">
            {trip.counterparty.role === "host" ? "Host" : "Guest"}
          </h2>
          <div className="mt-3 flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {trip.counterparty.avatar_url && (
                <AvatarImage
                  src={trip.counterparty.avatar_url}
                  alt={trip.counterparty.name}
                />
              )}
              <AvatarFallback>
                {initials(trip.counterparty.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-semibold">
                {trip.counterparty.name}
              </div>
              {!isConfirmed && (
                <div className="text-xs text-muted-foreground">
                  Contact info unlocks once the reservation is confirmed.
                </div>
              )}
            </div>
          </div>
          {isConfirmed && trip.counterparty_email && (
            <div className="mt-4 space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${trip.counterparty_email}`}
                  className="hover:underline"
                >
                  {trip.counterparty_email}
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this to coordinate check-in details, parking, and arrival
                time directly.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Original message from the guest. Heading reads "Guest's
          request" to the host viewer and "Your request" to the guest
          viewer. Reply, when present, is always from the host. */}
      {trip.message && (
        <section className="mt-6 rounded-2xl border border-border bg-white p-5 md:p-6">
          <h2 className="text-base font-semibold">
            {trip.viewer_role === "host"
              ? `${trip.counterparty.name.split(" ")[0]}'s request`
              : "Your request"}
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {trip.message}
          </p>
          {trip.host_response_message && (
            <>
              <h3 className="mt-5 text-sm font-semibold">
                {trip.viewer_role === "host" ? "Your reply" : "Host's reply"}
              </h3>
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
      {/* Empty-state guidance for the house manual. Copy differs
          per role — guests get nudged to message the host; hosts
          get a prompt to fill it in from their listing settings. */}
      {isConfirmed && manualEntries.length === 0 && (
        <section className="mt-6 rounded-2xl border border-dashed border-border bg-white p-5 text-center md:p-6">
          <BookOpen className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {trip.viewer_role === "host"
              ? "No house manual yet. Add arrival, Wi-Fi, and checkout details from your listing so your guest has them on hand."
              : `${trip.counterparty.name.split(" ")[0]} hasn't shared a house manual yet. Send a message for check-in instructions.`}
          </p>
        </section>
      )}

      {/* Fallback coordination hint when there's no shared email yet. */}
      {isConfirmed && trip.counterparty && !trip.counterparty_email && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Phone className="mr-1 inline h-3 w-3" />
          Coordinate directly via the in-app conversation.
        </p>
      )}
    </div>
  );
}
