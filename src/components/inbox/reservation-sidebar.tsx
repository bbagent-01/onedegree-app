"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Users as UsersIcon,
  MapPin,
  Star,
  ExternalLink,
  Check,
  X,
  ChevronRight,
  Home,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ThreadDetail } from "@/lib/messaging-data";
import { resolveStages } from "@/lib/booking-stage";
import { TripTimeline } from "@/components/booking/TripTimeline";

interface Props {
  thread: ThreadDetail;
  currentUserId: string;
  onClose?: () => void;
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(s: string | null | undefined): {
  label: string;
  tone: "pending" | "accepted" | "declined" | "cancelled";
} {
  if (!s) return { label: "Inquiry", tone: "pending" };
  if (s === "accepted") return { label: "Confirmed", tone: "accepted" };
  if (s === "declined") return { label: "Declined", tone: "declined" };
  if (s === "cancelled") return { label: "Cancelled", tone: "cancelled" };
  return { label: "Pending", tone: "pending" };
}

/**
 * Right-column reservation context. Renders beside the message
 * thread on desktop (≥1024px). Shows:
 *   - Status + listing summary
 *   - Dates / guest count / message
 *   - Host-side action buttons (accept / decline) when pending
 *   - Other-user "about" card with rating + location + since
 *   - Leave-review link when the stay has ended
 *
 * v1 deliberately doesn't render the trip timeline (Chunk 2) or
 * payment/cancellation slots (Chunks 3–4) — those layer in later.
 */
export function ReservationSidebar({ thread, onClose }: Props) {
  const router = useRouter();
  const [responding, setResponding] = useState<"accept" | "decline" | null>(
    null
  );

  const { booking, listing, other_user, role, reservation_sidebar } = thread;
  const isHostViewer = role === "host";
  const status = statusLabel(booking?.status);

  const otherRating = reservation_sidebar?.other_user_is_host
    ? reservation_sidebar.other_user_host_rating
    : reservation_sidebar?.other_user_guest_rating ?? null;

  const respond = async (decision: "accepted" | "declined") => {
    if (!booking) return;
    setResponding(decision === "accepted" ? "accept" : "decline");
    try {
      const res = await fetch(`/api/contact-requests/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed (${res.status})`);
      }
      toast.success(
        decision === "accepted"
          ? "Request accepted"
          : "Request declined"
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setResponding(null);
    }
  };

  const reviewHref =
    reservation_sidebar?.stay_confirmation_id &&
    !reservation_sidebar.stay_reviewed_by_me
      ? `/trips/${booking?.id}`
      : null;

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto border-l border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Reservation</h2>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              status.tone === "accepted" &&
                "bg-emerald-100 text-emerald-800",
              status.tone === "pending" && "bg-amber-100 text-amber-800",
              status.tone === "declined" && "bg-zinc-200 text-zinc-700",
              status.tone === "cancelled" && "bg-zinc-200 text-zinc-700"
            )}
          >
            {status.label}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close reservation panel"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-6 p-4">
        {/* Trip timeline — surfaced at the top so the current stage
            is always the first thing a host/guest sees. Compact
            variant (no per-stage detail subtext) keeps the sidebar
            scannable. Full-detail timeline renders on
            /trips/[bookingId]. */}
        {booking && (
          <div className="rounded-xl border border-border p-3">
            <TripTimeline
              stages={resolveStages({
                status: booking.status,
                check_in: booking.check_in,
                check_out: booking.check_out,
                created_at:
                  (booking as { created_at?: string | null }).created_at ??
                  null,
                responded_at: booking.responded_at,
                viewer_role: role,
                stay_confirmation: reservation_sidebar?.stay_confirmation_id
                  ? {
                      // stay_confirmations column names invert the
                      // role→column mapping: a guest's review of the
                      // host lands in `host_rating`, a host's review
                      // of the guest lands in `guest_rating`.
                      // `stay_reviewed_by_me` is computed with that
                      // same inversion server-side.
                      guest_rating:
                        role === "host" &&
                        reservation_sidebar.stay_reviewed_by_me
                          ? 1
                          : null,
                      host_rating:
                        role === "guest" &&
                        reservation_sidebar.stay_reviewed_by_me
                          ? 1
                          : null,
                    }
                  : null,
              })}
              compact
            />
          </div>
        )}

        {/* Listing */}
        {listing && (
          <div>
            <Link
              href={`/listings/${listing.id}`}
              className="group block overflow-hidden rounded-xl border border-border transition hover:shadow-md"
            >
              {listing.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.thumbnail_url}
                  alt={listing.title}
                  className="h-36 w-full object-cover"
                />
              ) : (
                <div className="flex h-36 items-center justify-center bg-muted">
                  <Home className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {listing.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{listing.area_name}</span>
                    </div>
                  </div>
                  <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
                </div>
                {reservation_sidebar?.listing_rating_avg !== null &&
                  reservation_sidebar?.listing_rating_avg !== undefined && (
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-foreground text-foreground" />
                      <span className="font-medium text-foreground">
                        {reservation_sidebar.listing_rating_avg.toFixed(1)}
                      </span>
                      <span>
                        · {reservation_sidebar.listing_review_count}{" "}
                        {reservation_sidebar.listing_review_count === 1
                          ? "review"
                          : "reviews"}
                      </span>
                    </div>
                  )}
              </div>
            </Link>
          </div>
        )}

        {/* Booking details */}
        {booking && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <CalendarIcon className="h-3.5 w-3.5" />
                Check-in
              </div>
              <div className="mt-0.5 text-sm font-medium">
                {fmtDate(booking.check_in)}
              </div>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <CalendarIcon className="h-3.5 w-3.5" />
                Checkout
              </div>
              <div className="mt-0.5 text-sm font-medium">
                {fmtDate(booking.check_out)}
              </div>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <UsersIcon className="h-3.5 w-3.5" />
                Guests
              </div>
              <div className="mt-0.5 text-sm font-medium">
                {booking.guest_count}{" "}
                {booking.guest_count === 1 ? "guest" : "guests"}
              </div>
            </div>
          </div>
        )}

        {/* Host action buttons. Brand purple + "Approve" matches the
            in-thread banner CTA so host sees one consistent action
            label across both surfaces. */}
        {isHostViewer && booking?.status === "pending" && (
          <div className="space-y-2">
            <Button
              onClick={() => respond("accepted")}
              disabled={responding !== null}
              className="h-10 w-full rounded-lg bg-brand text-sm font-semibold text-white hover:bg-brand-600"
            >
              <Check className="mr-1.5 h-4 w-4" />
              {responding === "accept" ? "Approving…" : "Approve"}
            </Button>
            <Button
              onClick={() => respond("declined")}
              disabled={responding !== null}
              variant="outline"
              className="h-10 w-full rounded-lg text-sm font-semibold"
            >
              <X className="mr-1.5 h-4 w-4" />
              {responding === "decline" ? "Declining…" : "Decline"}
            </Button>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Payment happens directly between you and the guest. 1° B&B
              doesn&apos;t process payments.
            </p>
          </div>
        )}

        {/* Review CTA */}
        {reviewHref && (
          <Link
            href={reviewHref}
            className={buttonVariants({
              variant: "default",
              className: "h-10 w-full text-sm font-semibold",
            })}
          >
            <Star className="mr-1.5 h-4 w-4" />
            Leave a review
          </Link>
        )}

        {/* Request message + host response deliberately live in the
            thread itself — duplicating them in the sidebar made the
            view feel repetitive. See the message pane to the left. */}

        {/* About the other person */}
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            About {other_user.name.split(" ")[0]}
          </div>
          <div className="rounded-xl border border-border p-3">
            <Link
              href={`/profile/${other_user.id}`}
              className="flex items-center gap-3 group"
            >
              <Avatar className="h-12 w-12">
                {other_user.avatar_url && (
                  <AvatarImage
                    src={other_user.avatar_url}
                    alt={other_user.name}
                  />
                )}
                <AvatarFallback>{initials(other_user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-sm font-semibold group-hover:underline">
                  {other_user.name}
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                {otherRating !== null && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-foreground text-foreground" />
                    <span className="font-medium text-foreground">
                      {otherRating.toFixed(1)}
                    </span>
                    <span>
                      · {reservation_sidebar?.other_user_review_count ?? 0}{" "}
                      {reservation_sidebar?.other_user_review_count === 1
                        ? "review"
                        : "reviews"}
                    </span>
                  </div>
                )}
              </div>
            </Link>
            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              {reservation_sidebar?.other_user_is_host && (
                <li className="flex items-center gap-2">
                  <Home className="h-3 w-3 shrink-0" />
                  Also a host
                </li>
              )}
              {reservation_sidebar?.other_user_joined_year !== null &&
                reservation_sidebar?.other_user_joined_year !== undefined && (
                  <li className="flex items-center gap-2">
                    <CalendarIcon className="h-3 w-3 shrink-0" />
                    Joined 1° B&B in{" "}
                    {reservation_sidebar.other_user_joined_year}
                  </li>
                )}
              {reservation_sidebar?.other_user_location && (
                <li className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 shrink-0" />
                  Lives in {reservation_sidebar.other_user_location}
                </li>
              )}
            </ul>
          </div>
        </div>

      </div>
    </aside>
  );
}
