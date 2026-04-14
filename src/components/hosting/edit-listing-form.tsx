"use client";

import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  PhotoUploader,
  type UploadedPhoto,
} from "@/components/hosting/photo-uploader";
import { AvailabilityEditor } from "@/components/hosting/availability-editor";
import {
  encodeListingMeta,
  propertyTypeToDb,
  type ListingMeta,
} from "@/lib/listing-meta";

interface InitialData {
  title: string;
  description: string;
  property_type: string;
  area_name: string;
  price_min: number | null;
  price_max: number | null;
  amenities: string[];
  house_rules: string;
  min_nights: number;
  checkin_time: string;
  checkout_time: string;
  meta: ListingMeta;
  photos: UploadedPhoto[];
}

const AMENITIES = [
  "Wifi",
  "Kitchen",
  "Washer",
  "Dryer",
  "Heating",
  "Air conditioning",
  "Pool",
  "Hot tub",
  "Free parking",
  "Workspace",
  "TV",
  "Gym",
  "Smoke alarm",
  "First aid kit",
  "Fire extinguisher",
  "Carbon monoxide alarm",
];

export function EditListingForm({
  listingId,
  initial,
}: {
  listingId: string;
  initial: InitialData;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [propertyLabel, setPropertyLabel] = useState(
    initial.meta.propertyLabel || ""
  );
  const [areaName, setAreaName] = useState(initial.area_name);
  const [price, setPrice] = useState(
    initial.price_min ? String(initial.price_min) : ""
  );
  const [cleaningFee, setCleaningFee] = useState(
    initial.meta.cleaningFee ? String(initial.meta.cleaningFee) : ""
  );
  const [guests, setGuests] = useState(initial.meta.guests || 2);
  const [bedrooms, setBedrooms] = useState(initial.meta.bedrooms || 1);
  const [beds, setBeds] = useState(initial.meta.beds || 1);
  const [bathrooms, setBathrooms] = useState(initial.meta.bathrooms || 1);
  const [amenities, setAmenities] = useState<string[]>(initial.amenities);
  const [houseRules, setHouseRules] = useState(initial.house_rules);
  const [minNights, setMinNights] = useState(String(initial.min_nights));
  const [checkIn, setCheckIn] = useState(initial.checkin_time);
  const [checkOut, setCheckOut] = useState(initial.checkout_time);
  const [photos, setPhotos] = useState<UploadedPhoto[]>(initial.photos);
  const [saving, setSaving] = useState(false);

  const toggleAmenity = (a: string) =>
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );

  const saveDetails = async () => {
    setSaving(true);
    try {
      const meta: ListingMeta = {
        ...initial.meta,
        propertyLabel: propertyLabel || undefined,
        guests,
        bedrooms,
        beds,
        bathrooms,
        cleaningFee: cleaningFee ? Number(cleaningFee) : undefined,
      };
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: encodeListingMeta(meta, description),
          property_type: propertyLabel
            ? propertyTypeToDb(
                propertyLabel,
                meta.placeKind ?? undefined
              )
            : initial.property_type,
          area_name: areaName,
          price_min: price ? Number(price) : null,
          price_max: price ? Number(price) : null,
          amenities,
          house_rules: houseRules || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Details saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const savePricing = async () => {
    setSaving(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/listings/${listingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            price_min: price ? Number(price) : null,
            price_max: price ? Number(price) : null,
            description: encodeListingMeta(
              {
                ...initial.meta,
                cleaningFee: cleaningFee ? Number(cleaningFee) : undefined,
                guests,
                bedrooms,
                beds,
                bathrooms,
              },
              description
            ),
          }),
        }),
        fetch(`/api/listings/${listingId}/calendar-settings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            min_nights: Number(minNights) || 1,
            checkin_time: checkIn,
            checkout_time: checkOut,
          }),
        }),
      ]);
      if (!r1.ok || !r2.ok) throw new Error("save failed");
      toast.success("Pricing saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const savePhotos = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/photos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: photos.map((p, i) => ({
            id: p.id,
            public_url: p.public_url,
            storage_path: p.storage_path,
            is_preview: p.is_preview,
            sort_order: i,
          })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPhotos(data.photos || photos);
      toast.success("Photos saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save photos");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Tabs defaultValue="details" className="w-full">
      <TabsList className="mb-6 w-full justify-start gap-2 overflow-x-auto">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="photos">Photos</TabsTrigger>
        <TabsTrigger value="pricing">Pricing</TabsTrigger>
        <TabsTrigger value="availability">Availability</TabsTrigger>
        <TabsTrigger value="rules">House rules</TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-5">
        <div>
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 60))}
            maxLength={60}
          />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Property label</Label>
            <Input
              value={propertyLabel}
              onChange={(e) => setPropertyLabel(e.target.value)}
              placeholder="House, Apartment, Condo…"
            />
          </div>
          <div>
            <Label>Neighborhood</Label>
            <Input
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <NumberField label="Guests" value={guests} onChange={setGuests} />
          <NumberField
            label="Bedrooms"
            value={bedrooms}
            onChange={setBedrooms}
          />
          <NumberField label="Beds" value={beds} onChange={setBeds} />
          <NumberField
            label="Bathrooms"
            value={bathrooms}
            onChange={setBathrooms}
            step={0.5}
          />
        </div>

        <div>
          <Label>Amenities</Label>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
            {AMENITIES.map((a) => {
              const active = amenities.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "border-brand bg-brand/5"
                      : "border-border hover:border-foreground/30"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-sm border",
                      active
                        ? "border-brand bg-brand text-white"
                        : "border-border"
                    )}
                  >
                    {active && <Check className="h-3 w-3" />}
                  </span>
                  {a}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={saveDetails}
            disabled={saving}
            className="bg-brand hover:bg-brand-600"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save details
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="photos" className="space-y-5">
        <PhotoUploader photos={photos} onChange={setPhotos} />
        <div className="flex justify-end">
          <Button
            onClick={savePhotos}
            disabled={saving}
            className="bg-brand hover:bg-brand-600"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save photos
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="pricing" className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Nightly rate (USD)</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div>
            <Label>Cleaning fee (optional)</Label>
            <Input
              type="number"
              value={cleaningFee}
              onChange={(e) => setCleaningFee(e.target.value)}
            />
          </div>
          <div>
            <Label>Minimum stay (nights)</Label>
            <Input
              type="number"
              value={minNights}
              onChange={(e) => setMinNights(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Check-in time</Label>
            <Input
              type="time"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </div>
          <div>
            <Label>Check-out time</Label>
            <Input
              type="time"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={savePricing}
            disabled={saving}
            className="bg-brand hover:bg-brand-600"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save pricing
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="availability">
        <AvailabilityEditor listingId={listingId} />
      </TabsContent>

      <TabsContent value="rules" className="space-y-4">
        <div>
          <Label>House rules</Label>
          <Textarea
            rows={8}
            value={houseRules}
            onChange={(e) => setHouseRules(e.target.value)}
            placeholder="One rule per line"
          />
        </div>
        <div className="flex justify-end">
          <Button
            onClick={saveDetails}
            disabled={saving}
            className="bg-brand hover:bg-brand-600"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save rules
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}
