"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { differenceInCalendarDays, format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Minus, Plus, Star } from "lucide-react";
import { AvailabilityCalendar } from "./availability-calendar";
import { TrustTag } from "@/components/trust/trust-tag";
import { ReserveReviewDialog } from "./reserve-review-dialog";
import type { ConnectorPathSummary } from "@/lib/trust-data";
import type { CancellationPolicy } from "@/lib/cancellation";

interface Props {
  listingId: string;
  pricePerNight: number;
  /** Flat cleaning fee (USD, whole dollars). 0/null → hide the row. */
  cleaningFee: number | null;
  minNights: number;
  maxNights: number;
  avgRating: number | null;
  reviewCount: number;
  blockedRanges: { start: string; end: string }[];
  /** Host's first name — shown in the review dialog so the guest
   *  knows who they're messaging. */
  hostFirstName: string;
  /** Effective cancellation policy for this listing — surfaced in
   *  the review-before-send dialog so guests agree to terms before
   *  the request posts. */
  cancellationPolicy: CancellationPolicy | null;
  /** Optional trust info for the host→viewer direction — renders a
   *  medium TrustTag beneath the Contact Host button. */
  trust?: {
    score: number;
    degree: 1 | 2 | 3 | 4 | null;
    hasDirectVouch: boolean;
    connectorPaths: ConnectorPathSummary[];
  } | null;
}

// 1° B&B still doesn't charge a service fee — hosts collect directly
// off-platform. Cleaning fee is now a flat per-listing amount the
// host sets (mig 028) instead of a percentage, which matches how
// hosts actually think about cleaning costs.
const SERVICE_FEE_PCT = 0;

function calcFees(
  pricePerNight: number,
  nights: number,
  cleaningFee: number | null
) {
  const subtotal = pricePerNight * nights;
  const cleaning = Math.max(0, Math.round(cleaningFee ?? 0));
  const service = Math.round(subtotal * SERVICE_FEE_PCT);
  const total = subtotal + cleaning + service;
  return { subtotal, cleaning, service, total };
}

export function BookingSidebar({
  listingId,
  pricePerNight,
  cleaningFee,
  minNights,
  maxNights,
  avgRating,
  reviewCount,
  blockedRanges,
  hostFirstName,
  cancellationPolicy,
  trust,
}: Props) {
  const router = useRouter();
  const [range, setRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(1);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Broadcast the selected range so the sticky anchor bar (sibling client
  // component) can display the dates next to its Reserve button. Using a
  // custom event is simpler and more reliable than observing DOM attrs.
  useEffect(() => {
    const label =
      range?.from && range?.to
        ? `${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`
        : "";
    window.dispatchEvent(
      new CustomEvent("booking-range-change", {
        detail: { label, hasRange: Boolean(range?.from && range?.to) },
      })
    );
  }, [range]);

  const nights = useMemo(
    () =>
      range?.from && range?.to
        ? Math.max(0, differenceInCalendarDays(range.to, range.from))
        : 0,
    [range]
  );

  const fees = useMemo(
    () => calcFees(pricePerNight, nights, cleaningFee),
    [pricePerNight, nights, cleaningFee]
  );

  const canReserve = nights >= minNights && nights <= maxNights;

  // "Request to stay" now opens a review dialog where the guest
  // confirms dates / pricing / cancellation policy and optionally
  // attaches a note to the host. The actual POST to /api/bookings
  // lives inside ReserveReviewDialog so the guest never submits
  // blindly off a single click.
  const openReview = () => {
    if (!range?.from || !range?.to) return;
    if (!canReserve) {
      toast.error(
        nights < minNights
          ? `Minimum stay is ${minNights} night${minNights > 1 ? "s" : ""}.`
          : `Maximum stay is ${maxNights} nights.`
      );
      return;
    }
    setReviewOpen(true);
  };

  const handleSent = ({ threadId }: { threadId: string | null }) => {
    if (threadId) {
      const isDesktop =
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 768px)").matches;
      router.push(
        isDesktop
          ? `/inbox?thread=${threadId}&sent=1`
          : `/inbox/${threadId}?sent=1`
      );
    } else {
      router.push("/inbox?sent=1");
    }
  };

  return (
    <>
      {/* Desktop / tablet sticky card */}
      <div className="hidden h-full md:block">
        <div id="booking-card" className="sticky top-24 rounded-xl border border-border/60 bg-white p-6 shadow-xl">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-semibold">${pricePerNight}</span>
              <span className="text-base text-muted-foreground"> night</span>
            </div>
            {avgRating && reviewCount > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
                <span className="font-semibold">{avgRating.toFixed(2)}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground underline">
                  {reviewCount} reviews
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-foreground/20">
            <Popover>
              <PopoverTrigger className="grid w-full grid-cols-2">
                <div className="border-r border-foreground/20 p-3 text-left">
                  <div className="text-[10px] font-semibold uppercase">
                    Check-in
                  </div>
                  <div className="text-sm">
                    {range?.from
                      ? format(range.from, "MMM d, yyyy")
                      : "Add date"}
                  </div>
                </div>
                <div className="p-3 text-left">
                  <div className="text-[10px] font-semibold uppercase">
                    Checkout
                  </div>
                  <div className="text-sm">
                    {range?.to
                      ? format(range.to, "MMM d, yyyy")
                      : "Add date"}
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-auto p-2"
              >
                <AvailabilityCalendar
                  value={range}
                  onChange={setRange}
                  blockedRanges={blockedRanges}
                />
              </PopoverContent>
            </Popover>

            <Popover open={guestsOpen} onOpenChange={setGuestsOpen}>
              <PopoverTrigger className="block w-full border-t border-foreground/20 p-3 text-left">
                <div className="text-[10px] font-semibold uppercase">
                  Guests
                </div>
                <div className="text-sm">
                  {guests} guest{guests === 1 ? "" : "s"}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="end">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Guests</div>
                    <div className="text-xs text-muted-foreground">
                      Maximum 16
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="rounded-full"
                      onClick={() => setGuests((g) => Math.max(1, g - 1))}
                      disabled={guests <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center tabular-nums">
                      {guests}
                    </span>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="rounded-full"
                      onClick={() => setGuests((g) => Math.min(16, g + 1))}
                      disabled={guests >= 16}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Button
            id="booking-reserve"
            className="mt-4 h-12 w-full rounded-lg bg-brand text-base font-semibold hover:bg-brand-600"
            onClick={openReview}
            disabled={!range?.from || !range?.to}
          >
            Request to stay
          </Button>
          {trust && (
            <div className="mt-3 flex justify-center">
              <TrustTag
                size="medium"
                score={trust.score}
                degree={trust.degree}
                direct={trust.hasDirectVouch}
                connectorPaths={trust.connectorPaths}
              />
            </div>
          )}
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Payment arranged directly with your host — 1° B&amp;B doesn&apos;t
            process payments.
          </p>

          {nights > 0 && (
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="underline">
                  ${pricePerNight} × {nights} night{nights > 1 ? "s" : ""}
                </span>
                <span>${fees.subtotal.toLocaleString()}</span>
              </div>
              {fees.cleaning > 0 && (
                <div className="flex justify-between">
                  <span className="underline">Cleaning fee</span>
                  <span>${fees.cleaning.toLocaleString()}</span>
                </div>
              )}
              {fees.service > 0 && (
                <div className="flex justify-between">
                  <span className="underline">Service fee</span>
                  <span>${fees.service.toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Estimated total</span>
                <span>${fees.total.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile fixed bottom bar — sits flush above the mobile tab
          bar. The tab bar publishes its measured height as
          --mobile-nav-h so we land pixel-perfect against its top edge
          without the 2–3px seam that a hard-coded 4rem left behind. */}
      <div
        className="fixed inset-x-0 z-[60] border-t border-border/60 bg-white px-4 py-3 md:hidden"
        style={{
          bottom: "var(--mobile-nav-h, 3.75rem)",
        }}
      >
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div>
            <div>
              <span className="text-base font-semibold">${pricePerNight}</span>
              <span className="text-xs text-muted-foreground"> night</span>
            </div>
            {range?.from && range?.to ? (
              <div className="text-xs text-muted-foreground">
                {format(range.from, "MMM d")} – {format(range.to, "MMM d")}
              </div>
            ) : (
              <button
                className="text-xs underline text-muted-foreground"
                onClick={() => {
                  document
                    .getElementById("mobile-dates")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                Add dates for prices
              </button>
            )}
          </div>
          <Button
            className="h-11 rounded-lg bg-brand px-6 font-semibold hover:bg-brand-600"
            onClick={openReview}
            disabled={!range?.from || !range?.to}
          >
            Request to stay
          </Button>
        </div>
      </div>

      {/* Mobile inline dates picker anchor */}
      <div id="mobile-dates" className="md:hidden">
        <div className="rounded-xl border border-border/60 p-4">
          <h3 className="mb-3 text-lg font-semibold">Select dates</h3>
          <div className="flex justify-center">
            <AvailabilityCalendar
              value={range}
              onChange={setRange}
              blockedRanges={blockedRanges}
              numberOfMonths={1}
            />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
            <div>
              <div className="font-semibold">Guests</div>
              <div className="text-xs text-muted-foreground">Maximum 16</div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon-sm"
                className="rounded-full"
                onClick={() => setGuests((g) => Math.max(1, g - 1))}
                disabled={guests <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-6 text-center tabular-nums">{guests}</span>
              <Button
                variant="outline"
                size="icon-sm"
                className="rounded-full"
                onClick={() => setGuests((g) => Math.min(16, g + 1))}
                disabled={guests >= 16}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {nights > 0 && (
            <div className="mt-4 space-y-2 border-t border-border/60 pt-4 text-sm">
              <div className="flex justify-between">
                <span>
                  ${pricePerNight} × {nights} night{nights > 1 ? "s" : ""}
                </span>
                <span>${fees.subtotal.toLocaleString()}</span>
              </div>
              {fees.cleaning > 0 && (
                <div className="flex justify-between">
                  <span>Cleaning fee</span>
                  <span>${fees.cleaning.toLocaleString()}</span>
                </div>
              )}
              {fees.service > 0 && (
                <div className="flex justify-between">
                  <span>Service fee</span>
                  <span>${fees.service.toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>${fees.total.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review-before-send dialog. Mounted once and driven by
          `reviewOpen`; the actual POST to /api/bookings lives inside
          the dialog so the sidebar only owns the selection state. */}
      {range?.from && range?.to && (
        <ReserveReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          listingId={listingId}
          checkIn={range.from}
          checkOut={range.to}
          guests={guests}
          nights={nights}
          pricePerNight={pricePerNight}
          cleaningFee={fees.cleaning}
          serviceFee={fees.service}
          total={fees.total}
          hostFirstName={hostFirstName}
          cancellationPolicy={cancellationPolicy}
          onSent={handleSent}
        />
      )}
    </>
  );
}
