"use client";

import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Users as UsersIcon,
  MapPin,
  Star,
  ExternalLink,
  X,
  ChevronRight,
  Home,
  Copy,
  Wallet,
  Receipt,
  ArrowRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ThreadDetail } from "@/lib/messaging-data";
import {
  displayHandle,
  paymentMethodMeta,
  type PaymentMethod,
} from "@/lib/payment-methods";
import { resolveStages } from "@/lib/booking-stage";
import { CollapsibleTripTimeline } from "@/components/booking/CollapsibleTripTimeline";
import { CancellationPolicyCard } from "@/components/booking/CancellationPolicyCard";
import { ReportUserButton } from "@/components/safety/report-user-button";

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
  // Parse YYYY-MM-DD locally instead of via `new Date(iso)` (which
  // UTC-coerces and drifts by the viewer's TZ). Full ISO timestamps
  // still format fine since they include time + offset.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  if (dateOnly) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(
  s: string | null | undefined,
  termsAcceptedAt: string | null | undefined
): {
  label: string;
  tone: "pending" | "accepted" | "declined" | "cancelled";
} {
  if (!s) return { label: "Inquiry", tone: "pending" };
  // S7 fix: `status='accepted'` only means the host approved and sent
  // terms. The reservation isn't Confirmed until the guest stamps
  // terms_accepted_at. Before that it's Pending (terms offered,
  // awaiting guest confirmation).
  if (s === "accepted") {
    return termsAcceptedAt
      ? { label: "Confirmed", tone: "accepted" }
      : { label: "Pending", tone: "pending" };
  }
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
  const { booking, listing, other_user, role, reservation_sidebar } = thread;
  const isHostViewer = role === "host";
  const status = statusLabel(booking?.status, booking?.terms_accepted_at);

  const otherRating = reservation_sidebar?.other_user_is_host
    ? reservation_sidebar.other_user_host_rating
    : reservation_sidebar?.other_user_guest_rating ?? null;

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
          <CollapsibleTripTimeline
            compact
            mode="sidebar"
            stages={resolveStages({
              status: booking.status,
              check_in: booking.check_in,
              check_out: booking.check_out,
              created_at:
                (booking as { created_at?: string | null }).created_at ?? null,
              responded_at: booking.responded_at,
              terms_accepted_at: booking.terms_accepted_at,
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
              payment_events: thread.payment_events ?? null,
              has_open_issue:
                (thread.issue_reports ?? []).some(
                  (r) => r.status === "open"
                ),
            })}
          />
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
            {typeof booking.total_estimate === "number" &&
              booking.total_estimate > 0 && (
                <div className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Receipt className="h-3.5 w-3.5" />
                    {booking.status === "accepted" ? "Total" : "Estimated total"}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold">
                    ${booking.total_estimate.toLocaleString()}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Host action (Review & send terms) now lives inline at the
            end of the thread — see HostReviewTermsInline. Sidebar
            stays a scannable summary; the editor is a conversation
            step, not a separate surface. */}
        {isHostViewer && booking?.status === "pending" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-[11px] leading-relaxed text-amber-900">
              Request pending. Scroll to the bottom of the thread on
              the left to review &amp; send terms to{" "}
              {other_user.name.split(" ")[0]}.
            </p>
          </div>
        )}

        {/* Review CTA removed from sidebar — the review flow lives
            entirely in the ReviewPromptCard inside the thread so
            there's one canonical call-to-action per reservation.
            Sidebar stays clean. */}

        {/* Request message + host response deliberately live in the
            thread itself — duplicating them in the sidebar made the
            view feel repetitive. See the message pane to the left. */}

        {/* Cancellation & payment schedule — compact variant.
            Shared source of truth for both sides; the note inside
            the card reminds everyone payments are off-platform. */}
        {reservation_sidebar?.cancellation_policy && (
          <CancellationPolicyCard
            policy={reservation_sidebar.cancellation_policy}
            scope={booking?.status === "accepted" ? "reservation" : "listing"}
            compact
          />
        )}

        {/* Guest acceptance deliberately lives in the thread now (as
            an inline interactive message card), not in the sidebar.
            Sidebar stays a scannable summary; the accept action is
            the hero of the thread when it's time. */}

        {/* Payment handles — guest-only, once the host has approved.
            Hosts know their own handles already; no need to echo
            them back. */}
        {reservation_sidebar?.host_payment_methods &&
          reservation_sidebar.host_payment_methods.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Wallet className="h-3 w-3" />
                How to pay {other_user.name.split(" ")[0]}
              </div>
              <div className="space-y-1.5">
                {reservation_sidebar.host_payment_methods.map((m, i) => (
                  <PaymentMethodRow key={`${m.type}-${i}`} method={m} />
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Payment happens directly between you and{" "}
                {other_user.name.split(" ")[0]}. 1° B&amp;B doesn&apos;t
                process payments.
              </p>
            </div>
          )}

        {/* About the other person — condensed. Rating + profile link
            only. The deep bio ("joined year", "lives in", "also a
            host") moved to the full trip detail page to keep the
            sidebar scannable. */}
        <Link
          href={`/profile/${other_user.id}`}
          className="group flex items-center gap-3 rounded-xl border border-border p-3 transition hover:border-foreground/40"
        >
          <Avatar className="h-10 w-10">
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

        {/* Deep link to the full trip detail page. Everything the
            sidebar condenses (timeline, terms details, payment
            instructions, house manual, etc.) lives on that page. */}
        {booking?.id && (
          <Link
            href={`/trips/${booking.id}`}
            className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-semibold transition hover:border-foreground/40 hover:bg-muted"
          >
            <span>View full trip details</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
          </Link>
        )}

        {/* Sidebar-level report entry. Reports the counterparty of
            this thread, tagged with the threadId so admins can jump
            back to the conversation. Rendered at the bottom so it
            never competes with reservation actions. */}
        <div className="pt-1">
          <ReportUserButton
            variant="ghost"
            label={`Report ${thread.other_user.name.split(" ")[0] || "user"}`}
            reportedUserId={thread.other_user.id}
            reportedUserName={thread.other_user.name}
            sourceContext={{
              source: "thread_sidebar",
              thread_id: thread.id,
            }}
          />
        </div>

      </div>
    </aside>
  );
}

function PaymentMethodRow({ method }: { method: PaymentMethod }) {
  const meta = paymentMethodMeta(method.type);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(displayHandle(method));
      toast.success(`${meta.label} handle copied`);
    } catch {
      toast.error("Couldn't copy");
    }
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {meta.label}
        </div>
        <div className="truncate text-xs font-medium">
          {displayHandle(method)}
        </div>
        {method.note && (
          <div className="mt-0.5 whitespace-pre-wrap text-[11px] text-muted-foreground">
            {method.note}
          </div>
        )}
      </div>
      {method.handle && (
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Copy ${meta.label} handle`}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
