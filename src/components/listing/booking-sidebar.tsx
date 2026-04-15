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

interface Props {
  listingId: string;
  pricePerNight: number;
  minNights: number;
  maxNights: number;
  avgRating: number | null;
  reviewCount: number;
  blockedRanges: { start: string; end: string }[];
}

function calcFees(pricePerNight: number, nights: number) {
  const subtotal = pricePerNight * nights;
  const cleaning = Math.round(subtotal * 0.08);
  const service = Math.round(subtotal * 0.12);
  const total = subtotal + cleaning + service;
  return { subtotal, cleaning, service, total };
}

export function BookingSidebar({
  listingId,
  pricePerNight,
  minNights,
  maxNights,
  avgRating,
  reviewCount,
  blockedRanges,
}: Props) {
  const router = useRouter();
  const [range, setRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(1);
  const [guestsOpen, setGuestsOpen] = useState(false);

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
    () => calcFees(pricePerNight, nights),
    [pricePerNight, nights]
  );

  const canReserve = nights >= minNights && nights <= maxNights;

  const reserve = () => {
    if (!range?.from || !range?.to) return;
    if (!canReserve) {
      toast.error(
        nights < minNights
          ? `Minimum stay is ${minNights} night${minNights > 1 ? "s" : ""}.`
          : `Maximum stay is ${maxNights} nights.`
      );
      return;
    }
    const params = new URLSearchParams({
      from: format(range.from, "yyyy-MM-dd"),
      to: format(range.to, "yyyy-MM-dd"),
      guests: String(guests),
    });
    router.push(`/listings/${listingId}/reserve?${params.toString()}`);
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
            onClick={reserve}
            disabled={!range?.from || !range?.to}
          >
            {nights === 0 ? "Reserve" : "Request to reserve"}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            You won&apos;t be charged yet
          </p>

          {nights > 0 && (
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="underline">
                  ${pricePerNight} × {nights} night{nights > 1 ? "s" : ""}
                </span>
                <span>${fees.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="underline">Cleaning fee</span>
                <span>${fees.cleaning.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="underline">Service fee</span>
                <span>${fees.service.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total before taxes</span>
                <span>${fees.total.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile fixed bottom bar — sits above the mobile tab bar (which is z-50 h-[60px]) */}
      <div className="fixed inset-x-0 bottom-[60px] z-[60] border-t border-border/60 bg-white px-4 py-3 md:hidden">
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
            onClick={reserve}
            disabled={!range?.from || !range?.to}
          >
            Reserve
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
              <div className="flex justify-between">
                <span>Cleaning fee</span>
                <span>${fees.cleaning.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Service fee</span>
                <span>${fees.service.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>${fees.total.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
