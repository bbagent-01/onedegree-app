"use client";

import { useState, useEffect, useRef } from "react";
import { LocationPreview } from "@/components/hosting/location-preview";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Loader2, Check, MapPin, Trash2, AlertTriangle } from "lucide-react";
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
import type {
  AccessSettings,
  AccessRule,
  AccessType,
} from "@/lib/trust/types";

type PreviewToggleKey =
  | "show_title"
  | "show_price_range"
  | "show_description"
  | "show_host_first_name"
  | "show_profile_photo"
  | "show_neighborhood"
  | "show_map_area"
  | "show_rating"
  | "show_amenities"
  | "show_bed_counts"
  | "show_house_rules";

// Collapsed access model: two configurable gates + one toggle.
type AccessActionKey = "see_preview" | "full_listing_contact";

/** Order rules from most-permissive (low) to most-restrictive (high).
 *  Used to clamp the inner gate against the outer. */
function rank(rule: AccessRule): number {
  if (rule.type === "anyone_anywhere") return -1;
  if (rule.type === "anyone") return 0;
  if (rule.type === "min_score") return 1 + (rule.threshold ?? 0);
  if (rule.type === "specific_people") return 9999;
  return 0;
}

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
  advance_notice_days: number;
  prep_days: number;
  checkin_time: string;
  checkout_time: string;
  meta: ListingMeta;
  photos: UploadedPhoto[];
  // CC-C3 visibility fields
  visibility_mode: string;
  preview_description: string;
  access_settings: AccessSettings | null;
}

const BIG_INPUT =
  "h-14 rounded-xl border-2 border-border !bg-white px-4 text-base font-medium shadow-sm focus-visible:border-brand";
const BIG_TEXTAREA =
  "rounded-xl border-2 border-border !bg-white px-4 py-3 text-base shadow-sm focus-visible:border-brand";
const BIG_BUTTON_PRIMARY =
  "!h-14 !rounded-xl !px-7 !text-base !font-semibold bg-brand hover:bg-brand-600";

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
  const [advanceNotice, setAdvanceNotice] = useState(
    String(initial.advance_notice_days ?? 1)
  );
  const [prepDays, setPrepDays] = useState(String(initial.prep_days ?? 0));
  const [weeklyDiscount, setWeeklyDiscount] = useState(
    initial.meta.weeklyDiscount ? String(initial.meta.weeklyDiscount) : ""
  );
  const [monthlyDiscount, setMonthlyDiscount] = useState(
    initial.meta.monthlyDiscount ? String(initial.meta.monthlyDiscount) : ""
  );
  const [propertyOverview, setPropertyOverview] = useState(
    initial.meta.propertyOverview || ""
  );
  const [guestAccess, setGuestAccess] = useState(
    initial.meta.guestAccess || ""
  );
  const [interactionWithGuests, setInteractionWithGuests] = useState(
    initial.meta.interactionWithGuests || ""
  );
  const [otherDetails, setOtherDetails] = useState(
    initial.meta.otherDetails || ""
  );
  const [street, setStreet] = useState(initial.meta.address?.street || "");
  const [city, setCity] = useState(initial.meta.address?.city || "");
  const [stateRegion, setStateRegion] = useState(
    initial.meta.address?.state || ""
  );
  const [zip, setZip] = useState(initial.meta.address?.zip || "");
  const [lat, setLat] = useState<number | undefined>(
    initial.meta.address?.lat
  );
  const [lng, setLng] = useState<number | undefined>(
    initial.meta.address?.lng
  );
  const [geocoding, setGeocoding] = useState(false);
  // Address autocomplete state. Debounced Nominatim suggestions.
  type AddrSuggestion = {
    lat: number;
    lng: number;
    display_name: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  const [suggestions, setSuggestions] = useState<AddrSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSug, setLoadingSug] = useState(false);
  // Guard so we don't re-fetch immediately after picking a suggestion.
  const suppressNextFetchRef = useRef(false);
  useEffect(() => {
    if (suppressNextFetchRef.current) {
      suppressNextFetchRef.current = false;
      return;
    }
    const q = street.trim();
    if (q.length < 4) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setLoadingSug(true);
    const t = setTimeout(async () => {
      try {
        // Include city/state hints to bias results when the host has them.
        const hint = [city, stateRegion].filter(Boolean).join(", ");
        const full = hint ? `${q}, ${hint}` : q;
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(full)}&limit=5`
        );
        if (!res.ok) {
          if (!cancelled) setSuggestions([]);
          return;
        }
        const data = (await res.json()) as { results?: AddrSuggestion[] };
        if (!cancelled) setSuggestions(data.results || []);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoadingSug(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [street, city, stateRegion]);
  const pickSuggestion = (s: AddrSuggestion) => {
    suppressNextFetchRef.current = true;
    if (s.street) setStreet(s.street);
    if (s.city) setCity(s.city);
    if (s.state) setStateRegion(s.state);
    if (s.zip) setZip(s.zip);
    setLat(s.lat);
    setLng(s.lng);
    setShowSuggestions(false);
    setSuggestions([]);
  };
  const [checkIn, setCheckIn] = useState(initial.checkin_time);
  const [checkOut, setCheckOut] = useState(initial.checkout_time);
  const [photos, setPhotos] = useState<UploadedPhoto[]>(initial.photos);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "details";
  const [tab, setTab] = useState(initialTab);

  // ── CC-C3 visibility & preview state ──
  const [visibilityMode, setVisibilityMode] = useState(initial.visibility_mode);
  const [previewDescription, setPreviewDescription] = useState(
    initial.preview_description
  );

  // Preview content toggles — default all ON when the stored settings
  // don't have preview_content set yet.
  const pc0 = initial.access_settings?.preview_content;
  const [previewContent, setPreviewContent] = useState({
    show_title: pc0?.show_title ?? true,
    show_price_range: pc0?.show_price_range ?? true,
    show_description: pc0?.show_description ?? true,
    show_host_first_name: pc0?.show_host_first_name ?? true,
    show_profile_photo: pc0?.show_profile_photo ?? true,
    show_neighborhood: pc0?.show_neighborhood ?? true,
    show_map_area: pc0?.show_map_area ?? true,
    show_rating: pc0?.show_rating ?? true,
    show_amenities: pc0?.show_amenities ?? true,
    show_bed_counts: pc0?.show_bed_counts ?? true,
    show_house_rules: pc0?.show_house_rules ?? true,
  });
  const [usePreviewDescription, setUsePreviewDescription] = useState(
    pc0?.use_preview_specific_description ?? false
  );

  // Access rules — collapsed 2-gate model. All rows carry
  // full_listing_contact post-migration 020.
  const as0 = initial.access_settings;
  const [accessRules, setAccessRules] = useState<
    Record<AccessActionKey, AccessRule>
  >({
    see_preview: as0?.see_preview ?? { type: "anyone" },
    full_listing_contact:
      as0?.full_listing_contact ??
      ({ type: "min_score", threshold: 15 } as AccessRule),
  });
  const [allowIntroRequests, setAllowIntroRequests] = useState<boolean>(
    as0?.allow_intro_requests ?? true
  );

  // Delete flow
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t) setTab(t);
  }, [searchParams]);

  const buildMeta = (): ListingMeta => ({
    ...initial.meta,
    propertyLabel: propertyLabel || undefined,
    guests,
    bedrooms,
    beds,
    bathrooms,
    cleaningFee: cleaningFee ? Number(cleaningFee) : undefined,
    propertyOverview: propertyOverview || undefined,
    guestAccess: guestAccess || undefined,
    interactionWithGuests: interactionWithGuests || undefined,
    otherDetails: otherDetails || undefined,
    weeklyDiscount: weeklyDiscount ? Number(weeklyDiscount) : undefined,
    monthlyDiscount: monthlyDiscount ? Number(monthlyDiscount) : undefined,
    address:
      street || city || stateRegion || zip || lat || lng
        ? {
            street: street || undefined,
            city: city || undefined,
            state: stateRegion || undefined,
            zip: zip || undefined,
            lat,
            lng,
          }
        : undefined,
  });

  const geocodeAddress = async () => {
    const parts = [street, city, stateRegion, zip].filter(Boolean).join(", ");
    if (!parts) {
      toast.error("Enter an address first");
      return;
    }
    setGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(parts)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { lat: number; lng: number };
      setLat(data.lat);
      setLng(data.lng);
      toast.success("Location pinned");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't find that address");
    } finally {
      setGeocoding(false);
    }
  };

  const toggleAmenity = (a: string) =>
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );

  const saveDetails = async () => {
    setSaving(true);
    try {
      const meta = buildMeta();
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
            description: encodeListingMeta(buildMeta(), description),
          }),
        }),
        fetch(`/api/listings/${listingId}/calendar-settings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            min_nights: Number(minNights) || 1,
            advance_notice_days: Number(advanceNotice) || 0,
            prep_days: Number(prepDays) || 0,
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
            is_cover: p.is_cover,
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

  // Build the full access_settings payload from local state. Uses the
  // collapsed 2-gate model; the validator clamps full_listing_contact
  // if the host accidentally sets it looser than see_preview.
  const buildAccessSettings = (): AccessSettings => {
    const seePreview = accessRules.see_preview;
    let fullGate = accessRules.full_listing_contact;
    // Enforce: full gate is never more permissive than see_preview.
    if (rank(fullGate) < rank(seePreview)) fullGate = seePreview;
    return {
      see_preview: seePreview,
      full_listing_contact: fullGate,
      allow_intro_requests: allowIntroRequests,
      preview_content: {
        ...previewContent,
        use_preview_specific_description: usePreviewDescription,
      },
    };
  };

  const savePreview = async () => {
    setSaving(true);
    try {
      // Also save any photo changes (preview toggle state)
      await fetch(`/api/listings/${listingId}/photos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: photos.map((p, i) => ({
            id: p.id,
            public_url: p.public_url,
            storage_path: p.storage_path,
            is_cover: p.is_cover,
            is_preview: p.is_preview,
            sort_order: i,
          })),
        }),
      });
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preview_description: previewDescription || null,
          access_settings: buildAccessSettings(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Preview settings saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save preview settings");
    } finally {
      setSaving(false);
    }
  };

  const saveVisibility = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visibility_mode: visibilityMode,
          access_settings: buildAccessSettings(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Visibility settings saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save visibility settings");
    } finally {
      setSaving(false);
    }
  };

  const deleteListing = async () => {
    if (confirmText.trim() !== "DELETE") {
      toast.error("Type DELETE to confirm");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Listing deleted");
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete listing");
      setDeleting(false);
    }
  };

  const applyPreset = (preset: "standard" | "open" | "private") => {
    setVisibilityMode("preview_gated");
    if (preset === "open") {
      setAccessRules({
        see_preview: { type: "anyone" },
        full_listing_contact: { type: "anyone" },
      });
      setAllowIntroRequests(true);
    } else if (preset === "standard") {
      setAccessRules({
        see_preview: { type: "anyone" },
        full_listing_contact: { type: "min_score", threshold: 15 },
      });
      setAllowIntroRequests(true);
    } else if (preset === "private") {
      setAccessRules({
        see_preview: { type: "min_score", threshold: 30 },
        full_listing_contact: { type: "specific_people", user_ids: [] },
      });
      setAllowIntroRequests(true);
    }
  };

  const updateRule = (
    key: AccessActionKey,
    field: "type" | "threshold",
    value: string
  ) => {
    setAccessRules((prev) => {
      const rule = prev[key];
      if (field === "type") {
        const newType = value as AccessType;
        return {
          ...prev,
          [key]: {
            type: newType,
            threshold:
              newType === "min_score"
                ? rule.threshold ?? 15
                : undefined,
          },
        };
      }
      return { ...prev, [key]: { ...rule, threshold: Number(value) || 0 } };
    });
  };

  // Preview photos are fully opt-in. Even the cover can be toggled off;
  // it will be shown blurred in the preview fallback.
  const togglePreviewPhoto = (idx: number) => {
    const next = photos.map((p, i) =>
      i === idx ? { ...p, is_preview: !p.is_preview } : p
    );
    setPhotos(next);
  };

  // Infer which preset the current access rules match, so the card stays
  // highlighted when the user re-opens the tab.
  const currentPreset: "standard" | "open" | "private" | null = (() => {
    const sp = accessRules.see_preview;
    const full = accessRules.full_listing_contact;
    if (sp.type === "anyone" && full.type === "anyone") return "open";
    if (
      sp.type === "anyone" &&
      full.type === "min_score" &&
      full.threshold === 15
    )
      return "standard";
    if (sp.type === "min_score" && full.type === "specific_people")
      return "private";
    return null;
  })();

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full !flex-col">
      <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-2 rounded-2xl border border-border bg-white p-2 shadow-sm">
        {[
          ["details", "Details"],
          ["photos", "Photos"],
          ["pricing", "Pricing"],
          ["availability", "Calendar"],
          ["rules", "House rules"],
          ["preview", "Preview"],
          ["visibility", "Visibility"],
          ["danger", "Danger zone"],
        ].map(([val, label]) => (
          <TabsTrigger
            key={val}
            value={val}
            className="h-11 rounded-xl px-5 text-sm font-semibold data-[state=active]:bg-brand data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="details" className="mt-0 space-y-6">
       <SectionCard
        title="Location"
        subtitle="Your exact address is private. We only show the neighborhood pin to guests until they book."
       >
        <div className="grid grid-cols-1 gap-4">
          <div className="relative">
            <Label className="mb-2 block text-sm font-semibold">Street address</Label>
            <Input
              className={BIG_INPUT}
              value={street}
              onChange={(e) => {
                setStreet(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Delay so a click on a suggestion registers first.
                setTimeout(() => setShowSuggestions(false), 150);
              }}
              placeholder="36 Bryant Pond Rd"
              autoComplete="off"
            />
            {showSuggestions && (suggestions.length > 0 || loadingSug) && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
                {loadingSug && suggestions.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    Searching…
                  </div>
                ) : (
                  suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={(e) => {
                        // Prevent blur from firing before click.
                        e.preventDefault();
                        pickSuggestion(s);
                      }}
                      className="flex w-full items-start gap-2 border-b border-border/50 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-muted/40"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="line-clamp-2">{s.display_name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label className="mb-2 block text-sm font-semibold">City</Label>
              <Input
                className={BIG_INPUT}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Putnam Valley"
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-semibold">State</Label>
              <Input
                className={BIG_INPUT}
                value={stateRegion}
                onChange={(e) => setStateRegion(e.target.value)}
                placeholder="NY"
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-semibold">ZIP</Label>
              <Input
                className={BIG_INPUT}
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="10579"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={geocodeAddress}
              disabled={geocoding}
              className="!h-12 !rounded-xl !px-5 !text-sm !font-semibold bg-brand hover:bg-brand-600"
            >
              {geocoding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="mr-2 h-4 w-4" />
              )}
              Find on map
            </Button>
            <span className="text-xs text-muted-foreground">
              The purple circle shows the approximate area guests see
              before they book — your exact address stays private. Drag
              the pin to fine-tune.
            </span>
          </div>
          {lat != null && lng != null && (
            <div className="space-y-2">
              <LocationPreview
                lat={lat}
                lng={lng}
                onChange={(newLat, newLng) => {
                  setLat(newLat);
                  setLng(newLng);
                }}
              />
              <p className="text-xs font-medium text-muted-foreground">
                Pinned at {lat.toFixed(4)}, {lng.toFixed(4)}
              </p>
            </div>
          )}
        </div>
       </SectionCard>

       <SectionCard
        title="Listing details"
        subtitle="Title, description, and the basics of your place."
        footer={
          <SaveBtn saving={saving} onClick={saveDetails} label="Save details" />
        }
       >
        <div>
          <Label className="mb-2 block text-sm font-semibold">Title</Label>
          <Input
            className={BIG_INPUT}
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 60))}
            maxLength={60}
          />
        </div>
        <div>
          <Label className="mb-2 block text-sm font-semibold">Listing description</Label>
          <Textarea
            className={BIG_TEXTAREA}
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <Label className="mb-2 block text-sm font-semibold">Your property</Label>
          <Textarea
            className={BIG_TEXTAREA}
            rows={4}
            value={propertyOverview}
            onChange={(e) => setPropertyOverview(e.target.value)}
            placeholder="Describe the space, layout, views, and neighborhood."
          />
        </div>
        <div>
          <Label className="mb-2 block text-sm font-semibold">Guest access</Label>
          <Textarea
            className={BIG_TEXTAREA}
            rows={3}
            value={guestAccess}
            onChange={(e) => setGuestAccess(e.target.value)}
            placeholder="What parts of the property can guests use?"
          />
        </div>
        <div>
          <Label className="mb-2 block text-sm font-semibold">Interaction with guests</Label>
          <Textarea
            className={BIG_TEXTAREA}
            rows={3}
            value={interactionWithGuests}
            onChange={(e) => setInteractionWithGuests(e.target.value)}
            placeholder="How much will you be around during their stay?"
          />
        </div>
        <div>
          <Label className="mb-2 block text-sm font-semibold">Other details to note</Label>
          <Textarea
            className={BIG_TEXTAREA}
            rows={3}
            value={otherDetails}
            onChange={(e) => setOtherDetails(e.target.value)}
            placeholder="Stairs, pets on property, quirks guests should know about."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 block text-sm font-semibold">Property label</Label>
            <Input
              className={BIG_INPUT}
              value={propertyLabel}
              onChange={(e) => setPropertyLabel(e.target.value)}
              placeholder="House, Apartment, Condo…"
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-semibold">Neighborhood</Label>
            <Input
              className={BIG_INPUT}
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <NumberField label="Maximum guests" value={guests} onChange={setGuests} />
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
          <Label className="mb-2 block text-sm font-semibold">Amenities</Label>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
            {AMENITIES.map((a) => {
              const active = amenities.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-left text-sm transition-colors",
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
       </SectionCard>
      </TabsContent>

      <TabsContent value="photos" className="mt-0">
       <SectionCard
        title="Photos"
        subtitle="Upload at least 3 photos. The cover photo is what guests see first."
        footer={
          <SaveBtn saving={saving} onClick={savePhotos} label="Save photos" />
        }
       >
        <PhotoUploader photos={photos} onChange={setPhotos} />
       </SectionCard>
      </TabsContent>

      <TabsContent value="pricing" className="mt-0 space-y-6">
       <SectionCard
        title="Pricing"
        subtitle="Set your nightly rate and any optional fees."
       >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label className="mb-2 block text-sm font-semibold">Nightly rate (USD)</Label>
            <Input
              className={BIG_INPUT}
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-semibold">Cleaning fee (optional)</Label>
            <Input
              className={BIG_INPUT}
              type="number"
              value={cleaningFee}
              onChange={(e) => setCleaningFee(e.target.value)}
            />
          </div>
        </div>
       </SectionCard>

       <SectionCard
        title="Discounts"
        subtitle="Reward longer stays with an automatic discount."
       >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-2 block text-sm font-semibold">Weekly discount (%)</Label>
              <Input
                className={BIG_INPUT}
                type="number"
                min={0}
                max={99}
                value={weeklyDiscount}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (e.target.value === "") setWeeklyDiscount("");
                  else if (n >= 0 && n <= 99) setWeeklyDiscount(String(n));
                }}
                placeholder="10"
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-semibold">Monthly discount (%)</Label>
              <Input
                className={BIG_INPUT}
                type="number"
                min={0}
                max={99}
                value={monthlyDiscount}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (e.target.value === "") setMonthlyDiscount("");
                  else if (n >= 0 && n <= 99) setMonthlyDiscount(String(n));
                }}
                placeholder="20"
              />
            </div>
        </div>
       </SectionCard>

       <SectionCard
        title="Booking rules"
        subtitle="Control how far in advance and how tightly guests can book."
       >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label className="mb-2 block text-sm font-semibold">Minimum stay (nights)</Label>
              <Input
                className={BIG_INPUT}
                type="number"
                value={minNights}
                onChange={(e) => setMinNights(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-semibold">Advance notice (days)</Label>
              <Input
                className={BIG_INPUT}
                type="number"
                min={0}
                value={advanceNotice}
                onChange={(e) => setAdvanceNotice(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-semibold">Prep days between bookings</Label>
              <Input
                className={BIG_INPUT}
                type="number"
                min={0}
                value={prepDays}
                onChange={(e) => setPrepDays(e.target.value)}
              />
            </div>
        </div>
       </SectionCard>

       <SectionCard
        title="Check-in & check-out"
        subtitle="When guests arrive and when they leave."
        footer={
          <SaveBtn saving={saving} onClick={savePricing} label="Save pricing" />
        }
       >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 block text-sm font-semibold">Check-in time</Label>
            <Input
              className={BIG_INPUT}
              type="time"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-semibold">Check-out time</Label>
            <Input
              className={BIG_INPUT}
              type="time"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </div>
        </div>
       </SectionCard>
      </TabsContent>

      <TabsContent value="availability" className="mt-0">
       <SectionCard
        title="Calendar"
        subtitle="Block dates, set custom nightly prices for specific ranges."
       >
        <AvailabilityEditor
          listingId={listingId}
          defaultPrice={price ? Number(price) : null}
        />
       </SectionCard>
      </TabsContent>

      <TabsContent value="rules" className="mt-0">
       <SectionCard
        title="House rules"
        subtitle="Set expectations so guests know how to treat your space."
        footer={
          <SaveBtn saving={saving} onClick={saveDetails} label="Save rules" />
        }
       >
        <div>
          <Label className="mb-2 block text-sm font-semibold">House rules</Label>
          <Textarea
            className={BIG_TEXTAREA}
            rows={8}
            value={houseRules}
            onChange={(e) => setHouseRules(e.target.value)}
            placeholder="One rule per line"
          />
        </div>
       </SectionCard>
      </TabsContent>

      {/* ──────────────────────────────────────────────────────── */}
      {/* Preview — what's shown before unlock                     */}
      {/* ──────────────────────────────────────────────────────── */}
      <TabsContent value="preview" className="mt-0">
        <SectionCard
          title="Listing Preview"
          subtitle="Control what anonymous visitors see before they've unlocked your listing."
          footer={
            <SaveBtn saving={saving} onClick={savePreview} label="Save preview settings" />
          }
        >
          <div>
            <div className="text-sm font-semibold text-foreground">Show in preview</div>
            <div className="mt-4 space-y-2">
              {([
                ["show_title", "Listing title", "Full title of your listing"],
                ["show_price_range", "Price range", "$min–$max / night"],
                ["show_description", "Description", "Your preview description (or first 100 chars)"],
                ["show_host_first_name", "Your first name", "If off, shows \"a verified member\""],
                ["show_profile_photo", "Profile photo", "Your avatar next to the listing"],
                ["show_neighborhood", "Neighborhood", "City and area name"],
                ["show_map_area", "Approximate map area", "Blurred radius, no exact pin"],
                ["show_rating", "Rating & reviews count", "Star rating and how many reviews"],
                ["show_amenities", "Amenities list", "WiFi, parking, etc."],
                ["show_bed_counts", "Bedroom / bed / bath count", "\"2 bedrooms · 2 beds · 1 bath\""],
                ["show_house_rules", "House rules", "Rules you set for guests"],
              ] as [PreviewToggleKey, string, string][]).map(([key, label, desc]) => (
                <div key={key}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-white px-4 py-3 hover:border-foreground/30">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={previewContent[key]}
                      onClick={() =>
                        setPreviewContent((prev) => ({ ...prev, [key]: !prev[key] }))
                      }
                      className={cn(
                        "relative mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                        previewContent[key] ? "bg-brand" : "bg-zinc-300"
                      )}
                    >
                      <span
                        className={cn(
                          "block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                          previewContent[key] ? "translate-x-4" : "translate-x-0.5"
                        )}
                      />
                    </button>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{label}</div>
                      <div className="text-xs text-muted-foreground">{desc}</div>
                    </div>
                  </label>

                  {/* Nested "Preview description" sub-option under
                      the Description toggle. Only visible when the
                      Description parent is on. */}
                  {key === "show_description" && previewContent.show_description && (
                    <div className="ml-10 mt-2 rounded-lg border border-border bg-muted/20 p-4">
                      <label className="flex cursor-pointer items-start gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={usePreviewDescription}
                          onClick={() => setUsePreviewDescription((v) => !v)}
                          className={cn(
                            "relative mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                            usePreviewDescription ? "bg-brand" : "bg-zinc-300"
                          )}
                        >
                          <span
                            className={cn(
                              "block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                              usePreviewDescription
                                ? "translate-x-4"
                                : "translate-x-0.5"
                            )}
                          />
                        </button>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">
                            Use a preview-specific description
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Write a short blurb for the preview. If off, the
                            first 100 chars of your main description are used.
                          </div>
                        </div>
                      </label>

                      {usePreviewDescription && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-muted-foreground">
                              Preview description
                            </Label>
                            <span
                              className={cn(
                                "text-xs",
                                previewDescription.length > 200
                                  ? "text-red-600"
                                  : "text-muted-foreground"
                              )}
                            >
                              {previewDescription.length}/200
                            </span>
                          </div>
                          <Textarea
                            className={cn(BIG_TEXTAREA, "mt-2")}
                            rows={3}
                            value={previewDescription}
                            onChange={(e) =>
                              setPreviewDescription(e.target.value.slice(0, 200))
                            }
                            placeholder="A charming space in a great neighborhood..."
                            maxLength={200}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Preview photo selector */}
          <div>
            <Label className="mb-2 block text-sm font-semibold">
              Preview photos
            </Label>
            <p className="text-xs text-muted-foreground">
              Tap to toggle whether each photo appears in the preview. The cover
              is always included &mdash; but if you don&apos;t mark it as a
              preview too, it&apos;ll be shown blurred.
            </p>
            {photos.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                Upload photos first in the Photos tab.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {photos.map((p, i) => (
                  <button
                    key={p.public_url}
                    type="button"
                    onClick={() => togglePreviewPhoto(i)}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-lg border-2 transition-all",
                      p.is_preview
                        ? "border-brand"
                        : "border-border opacity-70 hover:opacity-100"
                    )}
                    aria-label={p.is_preview ? "Remove from preview" : "Add to preview"}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.public_url}
                      alt=""
                      className={cn(
                        "h-full w-full object-cover",
                        !p.is_preview && "grayscale"
                      )}
                    />
                    <div className="absolute right-1 top-1 flex gap-1">
                      {p.is_cover && (
                        <div className="rounded bg-amber-400 px-1 py-0.5 text-[9px] font-semibold uppercase text-white">
                          Cover
                        </div>
                      )}
                      {p.is_preview && (
                        <div className="rounded bg-brand px-1 py-0.5 text-[9px] font-semibold uppercase text-white">
                          Preview
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </TabsContent>

      {/* ──────────────────────────────────────────────────────── */}
      {/* Visibility & Access                                      */}
      {/* ──────────────────────────────────────────────────────── */}
      <TabsContent value="visibility" className="mt-0">
        <SectionCard
          title="Visibility & Access"
          subtitle="Pick a preset, then fine-tune who can do what. Presets are just starting templates — every rule stays editable."
          footer={
            <SaveBtn saving={saving} onClick={saveVisibility} label="Save visibility" />
          }
        >
          {/* Presets */}
          <div>
            <Label className="mb-2 block text-sm font-semibold">Preset</Label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {([
                ["standard", "Standard", "Preview for anyone signed-in. Full listing + booking gated by trust score."],
                ["open", "Open network", "Any signed-in member can see and request to book."],
                ["private", "Private", "Only people you add can book. Others with a minimum trust score can still request an intro."],
              ] as const).map(([key, label, desc]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={cn(
                    "flex flex-col items-start rounded-xl border-2 p-4 text-left transition-colors",
                    currentPreset === key
                      ? "border-brand bg-brand/5"
                      : "border-border hover:border-foreground/30"
                  )}
                >
                  <div className="text-base font-semibold text-foreground">{label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Access rules — collapsed 2-gate model */}
          <div>
            <Label className="mb-2 block text-sm font-semibold">
              Access controls
            </Label>
            <p className="text-xs text-muted-foreground">
              Two gates form concentric rings. See Preview is the outer
              ring; Full Listing + Contact is the inner ring, and must
              be at least as strict as See Preview.
            </p>
            <div className="mt-4 space-y-3">
              {([
                [
                  "see_preview",
                  "See Preview",
                  "Who can see the preview card and request an intro.",
                ],
                [
                  "full_listing_contact",
                  "Full Listing + Contact",
                  "Who can view the full listing, message you, and request to book.",
                ],
              ] as [AccessActionKey, string, string][]).map(
                ([key, label, hint]) => {
                  const rule = accessRules[key];
                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-border bg-white p-4"
                    >
                      <div className="text-sm font-medium text-foreground">
                        {label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {hint}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <select
                          value={rule.type}
                          onChange={(e) =>
                            updateRule(key, "type", e.target.value)
                          }
                          className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus-visible:border-brand focus-visible:outline-none"
                        >
                          {/* Only the outer See Preview gate may be
                              made public. Full Listing + Contact
                              always requires auth — you can't DM or
                              book without an identity. */}
                          {key === "see_preview" && (
                            <option value="anyone_anywhere">
                              Anyone (incl. not signed in)
                            </option>
                          )}
                          <option value="anyone">Anyone signed in</option>
                          <option value="min_score">Min 1° score</option>
                          <option value="specific_people">
                            Specific people
                          </option>
                        </select>
                        {rule.type === "min_score" && (
                          <Input
                            type="number"
                            min={0}
                            className="h-10 w-24 rounded-lg border border-border bg-white px-3 text-sm"
                            value={rule.threshold ?? ""}
                            onChange={(e) =>
                              updateRule(key, "threshold", e.target.value)
                            }
                            placeholder="Score"
                          />
                        )}
                        {rule.type === "specific_people" && (
                          <span className="text-xs text-muted-foreground">
                            (User picker coming soon)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            {/* Allow intro requests toggle */}
            <div className="mt-4 flex items-start justify-between gap-4 rounded-lg border border-border bg-white p-4">
              <div>
                <div className="text-sm font-medium text-foreground">
                  Allow introduction requests
                </div>
                <div className="text-xs text-muted-foreground">
                  Anyone who can see the preview can ask for an intro —
                  either through a mutual connection, or anonymously
                  into your inbox. Your identity stays hidden from the
                  sender until you reply.
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={allowIntroRequests}
                  onChange={(e) => setAllowIntroRequests(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-muted after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-brand peer-checked:after:translate-x-5" />
              </label>
            </div>

            {/* Validation warning */}
            {rank(accessRules.full_listing_contact) <
              rank(accessRules.see_preview) && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Full Listing + Contact can&apos;t be more permissive than
                See Preview — we&apos;ll clamp it to match on save.
              </div>
            )}
          </div>

        </SectionCard>
      </TabsContent>

      {/* ──────────────────────────────────────────────────────── */}
      {/* Danger zone — delete listing                             */}
      {/* ──────────────────────────────────────────────────────── */}
      <TabsContent value="danger" className="mt-0">
        <div className="mb-6 overflow-hidden rounded-2xl border-2 border-red-200 bg-white shadow-sm">
          <div className="border-b border-red-200 bg-red-50 px-6 py-5 md:px-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <h2 className="text-lg font-bold text-red-900">Danger zone</h2>
                <p className="mt-1 text-sm text-red-800">
                  Deleting a listing is permanent. Photos, availability, and
                  the listing itself will be removed. This cannot be undone.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4 px-6 py-6 md:px-8">
            {!confirmDelete ? (
              <div>
                <p className="text-sm text-muted-foreground">
                  If you no longer want to host this space, you can permanently
                  delete the listing. Past bookings and reviews will remain in
                  the system for record-keeping.
                </p>
                <Button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="mt-4 !h-12 !rounded-xl !px-5 !text-sm !font-semibold bg-red-600 text-white hover:bg-red-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete listing
                </Button>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-red-300 bg-red-50 p-5">
                <div className="text-sm font-semibold text-red-900">
                  Type <span className="font-mono">DELETE</span> to confirm
                </div>
                <Input
                  className={cn(BIG_INPUT, "border-red-300 focus-visible:border-red-500")}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setConfirmDelete(false);
                      setConfirmText("");
                    }}
                    disabled={deleting}
                    className="!h-11 !rounded-xl !px-5 !text-sm !font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={deleteListing}
                    disabled={deleting || confirmText.trim() !== "DELETE"}
                    className="!h-11 !rounded-xl !px-5 !text-sm !font-semibold bg-red-600 text-white hover:bg-red-700"
                  >
                    {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Trash2 className="mr-2 h-4 w-4" />
                    Permanently delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function SectionCard({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="border-b border-border px-6 py-5 md:px-8">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="space-y-6 px-6 py-6 md:px-8">{children}</div>
      {footer && (
        <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4 md:px-8">
          {footer}
        </div>
      )}
    </div>
  );
}

function SaveBtn({
  saving,
  onClick,
  label,
}: {
  saving: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={saving}
      className={BIG_BUTTON_PRIMARY}
    >
      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </Button>
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
      <Label className="mb-2 block text-sm font-semibold">{label}</Label>
      <Input
        className={BIG_INPUT}
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}
