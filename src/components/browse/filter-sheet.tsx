"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Minus, Plus, SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PriceRangeSlider } from "./price-range-slider";

const PROPERTY_TYPES = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "room", label: "Room" },
  { value: "other", label: "Other" },
];

const AMENITIES = [
  "Wifi",
  "Kitchen",
  "Washer",
  "Dryer",
  "Free parking",
  "Paid parking",
  "Air conditioning",
  "Heating",
  "Workspace",
  "TV",
  "Hair dryer",
  "Iron",
  "Pool",
  "Hot tub",
  "Gym",
  "BBQ grill",
  "Breakfast",
  "Fireplace",
  "Smoking allowed",
  "Pets allowed",
];

interface Props {
  priceRange: { min: number; max: number; histogram: number[] };
  activeCount: number;
}

export function FilterSheet({ priceRange, activeCount }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  // Local draft state — only committed on Show.
  const [priceMin, setPriceMin] = useState<number>(priceRange.min);
  const [priceMax, setPriceMax] = useState<number>(priceRange.max);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [bedrooms, setBedrooms] = useState(0);
  const [beds, setBeds] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [amenities, setAmenities] = useState<string[]>([]);

  // Hydrate draft from URL each time sheet opens.
  useEffect(() => {
    if (!open) return;
    const get = (k: string) => params.get(k);
    setPriceMin(parseInt(get("pmin") || String(priceRange.min), 10));
    setPriceMax(parseInt(get("pmax") || String(priceRange.max), 10));
    setPropertyTypes((get("ptype") || "").split(",").filter(Boolean));
    setBedrooms(parseInt(get("br") || "0", 10));
    setBeds(parseInt(get("bd") || "0", 10));
    setBathrooms(parseInt(get("ba") || "0", 10));
    setAmenities((get("am") || "").split(",").filter(Boolean));
  }, [open, params, priceRange.min, priceRange.max]);

  const togglePropertyType = (v: string) => {
    setPropertyTypes((prev) =>
      prev.includes(v) ? prev.filter((p) => p !== v) : [...prev, v]
    );
  };

  const toggleAmenity = (v: string) => {
    setAmenities((prev) =>
      prev.includes(v) ? prev.filter((p) => p !== v) : [...prev, v]
    );
  };

  const apply = () => {
    const url = new URLSearchParams(params.toString());
    const set = (k: string, v: string | undefined) => {
      if (v) url.set(k, v);
      else url.delete(k);
    };

    set(
      "pmin",
      priceMin > priceRange.min ? String(priceMin) : undefined
    );
    set(
      "pmax",
      priceMax < priceRange.max ? String(priceMax) : undefined
    );
    set("ptype", propertyTypes.length ? propertyTypes.join(",") : undefined);
    set("br", bedrooms ? String(bedrooms) : undefined);
    set("bd", beds ? String(beds) : undefined);
    set("ba", bathrooms ? String(bathrooms) : undefined);
    set("am", amenities.length ? amenities.join(",") : undefined);

    router.push(`/browse?${url.toString()}`);
    setOpen(false);
  };

  const clearAll = () => {
    setPriceMin(priceRange.min);
    setPriceMax(priceRange.max);
    setPropertyTypes([]);
    setBedrooms(0);
    setBeds(0);
    setBathrooms(0);
    setAmenities([]);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <Badge className="ml-1 h-5 min-w-[20px] rounded-full px-1.5 tabular-nums">
                {activeCount}
              </Badge>
            )}
          </Button>
        }
      />

      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div className="space-y-8 px-4 pb-8 pt-2">
          {/* Price */}
          <section>
            <h3 className="text-base font-semibold">Price range</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Nightly prices before fees and taxes
            </p>
            <div className="mt-4">
              <PriceRangeSlider
                min={priceRange.min}
                max={priceRange.max}
                histogram={priceRange.histogram}
                value={[priceMin, priceMax]}
                onChange={([a, b]) => {
                  setPriceMin(a);
                  setPriceMax(b);
                }}
              />
            </div>
          </section>

          {/* Property type */}
          <section>
            <h3 className="text-base font-semibold">Property type</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {PROPERTY_TYPES.map((t) => {
                const active = propertyTypes.includes(t.value);
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => togglePropertyType(t.value)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                      active
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground/60"
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Rooms & beds */}
          <section>
            <h3 className="text-base font-semibold">Rooms and beds</h3>
            <div className="mt-3 space-y-4">
              <CounterRow
                label="Bedrooms"
                value={bedrooms}
                onChange={setBedrooms}
              />
              <CounterRow label="Beds" value={beds} onChange={setBeds} />
              <CounterRow
                label="Bathrooms"
                value={bathrooms}
                onChange={setBathrooms}
              />
            </div>
          </section>

          {/* Amenities */}
          <section>
            <h3 className="text-base font-semibold">Amenities</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {AMENITIES.map((a) => {
                const active = amenities.includes(a);
                return (
                  <label
                    key={a}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                      active
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground/60"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-foreground"
                      checked={active}
                      onChange={() => toggleAmenity(a)}
                    />
                    <span>{a}</span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        <SheetFooter className="sticky bottom-0 flex-row items-center justify-between border-t border-border bg-white px-4 py-3">
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-medium underline underline-offset-2"
          >
            Clear all
          </button>
          <Button onClick={apply}>Show stays</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function CounterRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border disabled:opacity-40"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-8 text-center text-sm tabular-nums">
          {value === 0 ? "Any" : `${value}+`}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border"
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
