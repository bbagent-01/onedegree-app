"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import {
  Home,
  DoorOpen,
  Users,
  Building2,
  Trees,
  Warehouse,
  Check,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Minus,
  Plus as PlusIcon,
  MapPin,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  PhotoUploader,
  type UploadedPhoto,
} from "@/components/hosting/photo-uploader";
import { LocationPreview } from "@/components/hosting/location-preview";
import { AmenitiesSection } from "@/components/listing/amenities-section";
import { AvailabilityCalendarWrapper } from "@/components/listing/availability-calendar-wrapper";
import { LocationMapClient } from "@/components/listing/location-map-client";
import {
  encodeListingMeta,
  propertyTypeToDb,
  type ListingMeta,
} from "@/lib/listing-meta";

type PlaceKind = "entire" | "private" | "shared";
type PropertyLabel =
  | "House"
  | "Apartment"
  | "Condo"
  | "Townhouse"
  | "Cabin"
  | "Other";

type VisibilityMode = "public" | "preview_gated" | "hidden";
type AccessType =
  | "anyone_anywhere"
  | "anyone"
  | "min_score"
  | "max_degrees"
  | "specific_people";

interface AccessRuleState {
  type: AccessType;
  threshold: string; // stored as string for form input
}

interface WizardState {
  step: number;
  placeKind: PlaceKind | null;
  propertyLabel: PropertyLabel | null;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  areaName: string;
  guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenities: string[];
  photos: UploadedPhoto[];
  title: string;
  description: string;
  houseRules: string[];
  customRules: string;
  checkIn: string;
  checkOut: string;
  price: string;
  cleaningFee: string;
  minNights: string;
  // Extended description sections
  propertyOverview: string;
  guestAccess: string;
  interactionWithGuests: string;
  otherDetails: string;
  // Discounts & notice
  weeklyDiscount: string;
  monthlyDiscount: string;
  advanceNoticeDays: string;
  prepDays: string;
  // Visibility & trust settings (CC-C3)
  visibilityMode: VisibilityMode;
  previewDescription: string;
  accessSeePreview: AccessRuleState;
  accessSeeFull: AccessRuleState;
  accessRequestBook: AccessRuleState;
  accessMessage: AccessRuleState;
  accessRequestIntro: AccessRuleState;
  // Preview content toggles
  previewShowTitle: boolean;
  previewShowPriceRange: boolean;
  previewShowDescription: boolean;
  previewShowHostFirstName: boolean;
  previewShowNeighborhood: boolean;
  previewShowMapArea: boolean;
  previewShowRating: boolean;
  previewShowAmenities: boolean;
  previewShowBedCounts: boolean;
  previewShowHouseRules: boolean;
  /** When true, use the preview-specific description textarea instead
   *  of the full description in preview mode. */
  usePreviewSpecificDescription: boolean;
  // Default availability
  defaultAvailability: "available" | "unavailable" | "possibly";
}

const initialState: WizardState = {
  step: 1,
  placeKind: null,
  propertyLabel: null,
  street: "",
  city: "",
  state: "",
  zip: "",
  lat: 40.7128,
  lng: -74.006,
  areaName: "",
  guests: 2,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  amenities: [],
  photos: [],
  title: "",
  description: "",
  houseRules: [],
  customRules: "",
  checkIn: "15:00",
  checkOut: "11:00",
  price: "",
  cleaningFee: "",
  minNights: "1",
  propertyOverview: "",
  guestAccess: "",
  interactionWithGuests: "",
  otherDetails: "",
  weeklyDiscount: "",
  monthlyDiscount: "",
  advanceNoticeDays: "1",
  prepDays: "0",
  // Visibility defaults (CC-C3)
  visibilityMode: "preview_gated",
  previewDescription: "",
  accessSeePreview: { type: "anyone", threshold: "" },
  accessSeeFull: { type: "min_score", threshold: "10" },
  accessRequestBook: { type: "min_score", threshold: "20" },
  accessMessage: { type: "min_score", threshold: "10" },
  accessRequestIntro: { type: "anyone", threshold: "" },
  previewShowTitle: true,
  previewShowPriceRange: true,
  previewShowDescription: true,
  previewShowHostFirstName: true,
  previewShowNeighborhood: true,
  previewShowMapArea: true,
  previewShowRating: true,
  previewShowAmenities: true,
  previewShowBedCounts: true,
  previewShowHouseRules: true,
  usePreviewSpecificDescription: false,
  defaultAvailability: "available",
};

const STORAGE_KEY = "track-b:create-listing-draft";
const TOTAL_STEPS = 9;

// Shared big-input style — matches House Rules checkmark buttons (px-3 py-2.5, border-2, rounded-lg)
const BIG_INPUT =
  "h-14 rounded-xl border-2 border-border !bg-white px-4 text-base font-medium shadow-sm focus-visible:border-brand";
const BIG_TEXTAREA =
  "rounded-xl border-2 border-border !bg-white px-4 py-3 text-base shadow-sm focus-visible:border-brand";
const BIG_BUTTON =
  "!h-14 !rounded-xl !px-7 !text-base !font-semibold";
const BIG_BUTTON_PRIMARY = BIG_BUTTON + " bg-brand hover:bg-brand-600";

const AMENITY_GROUPS: Record<string, string[]> = {
  Essentials: ["Wifi", "Kitchen", "Washer", "Dryer", "Heating", "Air conditioning"],
  Features: ["Pool", "Hot tub", "Free parking", "Workspace", "TV", "Gym"],
  Safety: ["Smoke alarm", "First aid kit", "Fire extinguisher", "Carbon monoxide alarm"],
};

function buildAccessRule(rule: AccessRuleState): { type: string; threshold?: number; user_ids?: string[] } {
  if (rule.type === "anyone_anywhere") return { type: "anyone_anywhere" };
  if (rule.type === "anyone") return { type: "anyone" };
  if (rule.type === "min_score") return { type: "min_score", threshold: Number(rule.threshold) || 0 };
  if (rule.type === "max_degrees") return { type: "max_degrees", threshold: Number(rule.threshold) || 2 };
  if (rule.type === "specific_people") return { type: "specific_people", user_ids: [] };
  return { type: "anyone" };
}

const DEFAULT_HOUSE_RULES = [
  "No smoking",
  "No pets",
  "No parties or events",
  "Quiet hours after 10pm",
];

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
        <div
          key={n}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors",
            n <= step ? "bg-brand" : "bg-zinc-200"
          )}
        />
      ))}
    </div>
  );
}

function Counter({
  label,
  value,
  onChange,
  min = 0,
  max = 20,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border py-4 last:border-0">
      <div className="text-base font-medium text-foreground">{label}</div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, Number((value - step).toFixed(1))))}
          disabled={value <= min}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="w-6 text-center text-base font-medium">{value}</div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, Number((value + step).toFixed(1))))}
          disabled={value >= max}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function CreateListingPage() {
  const router = useRouter();
  const [state, setState] = useState<WizardState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // Logged-in user — feeds the Meet Your Host / Hosted by labels in
  // the preview & review mocks so the host sees their own real name.
  const { user } = useUser();
  const viewer = {
    firstName:
      user?.firstName ||
      user?.username ||
      (user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ?? "") ||
      "",
    fullName:
      user?.fullName ||
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      user?.username ||
      "",
  };

  // Hydrate from localStorage. Sanitize any bad values from old drafts
  // (e.g. lat/lng saved as null) so they don't override the defaults.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<WizardState>;
        // Drop any fields that are null or invalid so the spread below
        // falls back to initialState values for those fields.
        const clean: Partial<WizardState> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (v === null || v === undefined) continue;
          (clean as Record<string, unknown>)[k] = v;
        }
        // Extra guard: lat/lng must be finite numbers, otherwise drop them.
        if (
          "lat" in clean &&
          (typeof clean.lat !== "number" || !Number.isFinite(clean.lat))
        ) {
          delete clean.lat;
        }
        if (
          "lng" in clean &&
          (typeof clean.lng !== "number" || !Number.isFinite(clean.lng))
        ) {
          delete clean.lng;
        }
        // Photo migration: old drafts only had is_preview; split out is_cover.
        if (Array.isArray(clean.photos)) {
          const hasAnyCover = clean.photos.some(
            (p: UploadedPhoto) => p.is_cover
          );
          clean.photos = clean.photos.map((p: UploadedPhoto, i: number) => ({
            ...p,
            is_cover:
              p.is_cover === true ||
              (!hasAnyCover && p.is_preview === true && i === 0)
                ? true
                : Boolean(p.is_cover),
            is_preview: Boolean(p.is_preview),
          }));
          // Ensure one photo is marked cover (first preview, or first photo)
          if (!clean.photos.some((p) => p.is_cover) && clean.photos.length > 0) {
            const pv = clean.photos.findIndex((p) => p.is_preview);
            clean.photos[pv >= 0 ? pv : 0].is_cover = true;
          }
        }
        setState({ ...initialState, ...clean });
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Persist (skip photos since URLs are already remote)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  const update = <K extends keyof WizardState>(
    key: K,
    value: WizardState[K]
  ) => setState((s) => ({ ...s, [key]: value }));

  const toggleAmenity = (a: string) =>
    setState((s) => ({
      ...s,
      amenities: s.amenities.includes(a)
        ? s.amenities.filter((x) => x !== a)
        : [...s.amenities, a],
    }));

  const toggleRule = (r: string) =>
    setState((s) => ({
      ...s,
      houseRules: s.houseRules.includes(r)
        ? s.houseRules.filter((x) => x !== r)
        : [...s.houseRules, r],
    }));

  const canAdvance = useMemo(() => {
    switch (state.step) {
      case 1:
        return state.placeKind !== null && state.propertyLabel !== null;
      case 2:
        return !!(state.city && state.state);
      case 3:
        return state.guests >= 1 && state.bedrooms >= 0;
      case 4:
        // Preview photos are optional (cover photo is auto-assigned).
        return state.photos.length >= 3;
      case 5:
        return state.title.trim().length > 0 && state.title.length <= 50;
      case 6:
        return !!state.price && Number(state.price) > 0;
      default:
        return true;
    }
  }, [state]);

  const next = () => {
    if (!canAdvance) {
      toast.error("Please complete the required fields.");
      return;
    }
    setState((s) => ({ ...s, step: Math.min(TOTAL_STEPS, s.step + 1) }));
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const back = () => {
    setState((s) => ({ ...s, step: Math.max(1, s.step - 1) }));
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const publish = async () => {
    setSubmitting(true);
    try {
      const meta: ListingMeta = {
        placeKind: state.placeKind ?? undefined,
        propertyLabel: state.propertyLabel ?? undefined,
        guests: state.guests,
        bedrooms: state.bedrooms,
        beds: state.beds,
        bathrooms: state.bathrooms,
        address: {
          street: state.street,
          city: state.city,
          state: state.state,
          zip: state.zip,
          lat: state.lat,
          lng: state.lng,
        },
        cleaningFee: state.cleaningFee ? Number(state.cleaningFee) : undefined,
        propertyOverview: state.propertyOverview || undefined,
        guestAccess: state.guestAccess || undefined,
        interactionWithGuests: state.interactionWithGuests || undefined,
        otherDetails: state.otherDetails || undefined,
        weeklyDiscount: state.weeklyDiscount
          ? Number(state.weeklyDiscount)
          : undefined,
        monthlyDiscount: state.monthlyDiscount
          ? Number(state.monthlyDiscount)
          : undefined,
        defaultAvailability: state.defaultAvailability,
      };
      const houseRulesText = [
        ...state.houseRules,
        ...(state.customRules ? [state.customRules] : []),
      ].join("\n");

      const body = {
        property_type: propertyTypeToDb(
          state.propertyLabel || "Other",
          state.placeKind ?? undefined
        ),
        title: state.title.trim(),
        area_name:
          state.areaName || `${state.city}${state.state ? ", " + state.state : ""}`,
        description: encodeListingMeta(meta, state.description),
        price_min: Number(state.price),
        price_max: Number(state.price),
        house_rules: houseRulesText || null,
        amenities: state.amenities,
        preview_visibility: "anyone",
        full_visibility: "anyone",
        min_trust_score: 0,
        specific_user_ids: [],
        visibility_mode: state.visibilityMode,
        preview_description: state.previewDescription || null,
        access_settings: {
          see_preview: buildAccessRule(state.accessSeePreview),
          see_full: buildAccessRule(state.accessSeeFull),
          request_book: buildAccessRule(state.accessRequestBook),
          message: buildAccessRule(state.accessMessage),
          request_intro: buildAccessRule(state.accessRequestIntro),
          view_host_profile: { type: "anyone" },
          preview_content: {
            show_title: state.previewShowTitle,
            show_price_range: state.previewShowPriceRange,
            show_description: state.previewShowDescription,
            show_host_first_name: state.previewShowHostFirstName,
            show_neighborhood: state.previewShowNeighborhood,
            show_map_area: state.previewShowMapArea,
            show_rating: state.previewShowRating,
            show_amenities: state.previewShowAmenities,
            show_bed_counts: state.previewShowBedCounts,
            show_house_rules: state.previewShowHouseRules,
            use_preview_specific_description: state.usePreviewSpecificDescription,
          },
        },
        photos: state.photos.map((p, i) => ({
          public_url: p.public_url,
          storage_path: p.storage_path,
          is_cover: p.is_cover,
          is_preview: p.is_preview,
          sort_order: i,
        })),
      };

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { id: string };

      // Update stay rules via calendar-settings route
      await fetch(`/api/listings/${data.id}/calendar-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          min_nights: Number(state.minNights) || 1,
          advance_notice_days: Number(state.advanceNoticeDays) || 0,
          prep_days: Number(state.prepDays) || 0,
          checkin_time: state.checkIn,
          checkout_time: state.checkOut,
        }),
      });

      toast.success("Listing published!");
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      router.push("/hosting");
    } catch (e) {
      console.error(e);
      toast.error("Failed to publish listing");
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[880px] px-6 py-8 lg:px-10">
      <div className="flex items-center justify-between">
        <Link
          href="/hosting"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Save & exit
        </Link>
        <div className="text-xs font-medium text-muted-foreground">
          Step {state.step} of {TOTAL_STEPS}
        </div>
      </div>
      <div className="mt-4">
        <Stepper step={state.step} />
      </div>

      <div className="mt-8">
        {state.step === 1 && <Step1 state={state} update={update} />}
        {state.step === 2 && <Step2 state={state} update={update} />}
        {state.step === 3 && (
          <Step3
            state={state}
            update={update}
            toggleAmenity={toggleAmenity}
          />
        )}
        {state.step === 4 && (
          <Step4
            photos={state.photos}
            onChange={(photos) => update("photos", photos)}
          />
        )}
        {state.step === 5 && (
          <Step5 state={state} update={update} toggleRule={toggleRule} />
        )}
        {state.step === 6 && <Step6 state={state} update={update} />}
        {state.step === 7 && (
          <Step7Preview state={state} update={update} viewer={viewer} />
        )}
        {state.step === 8 && <Step8Visibility state={state} update={update} />}
        {state.step === 9 && (
          <Step9Review
            state={state}
            viewer={viewer}
            onBack={back}
            onPublish={publish}
            submitting={submitting}
          />
        )}
      </div>

      {state.step < TOTAL_STEPS && (
        <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={back}
            disabled={state.step === 1}
            className={BIG_BUTTON}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <Button
            type="button"
            onClick={next}
            disabled={!canAdvance}
            className={BIG_BUTTON_PRIMARY}
          >
            Next <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ----------------- STEP COMPONENTS -----------------

type UpdateFn = <K extends keyof WizardState>(
  key: K,
  value: WizardState[K]
) => void;

function StepHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

function Step1({ state, update }: { state: WizardState; update: UpdateFn }) {
  const kinds: {
    key: PlaceKind;
    label: string;
    desc: string;
    icon: React.ElementType;
  }[] = [
    { key: "entire", label: "Entire place", desc: "Guests have the whole home", icon: Home },
    { key: "private", label: "Private room", desc: "Private bedroom, shared common spaces", icon: DoorOpen },
    { key: "shared", label: "Shared room", desc: "Shared space with others", icon: Users },
  ];
  const props: { key: PropertyLabel; icon: React.ElementType }[] = [
    { key: "House", icon: Home },
    { key: "Apartment", icon: Building2 },
    { key: "Condo", icon: Building2 },
    { key: "Townhouse", icon: Warehouse },
    { key: "Cabin", icon: Trees },
    { key: "Other", icon: Home },
  ];
  return (
    <div>
      <StepHeading
        title="What kind of place will you host?"
        subtitle="Pick the setup that best describes your space."
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {kinds.map(({ key, label, desc, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => update("placeKind", key)}
            className={cn(
              "flex flex-col items-start rounded-xl border-2 p-5 text-left transition-colors",
              state.placeKind === key
                ? "border-brand bg-brand/5"
                : "border-border hover:border-foreground/30"
            )}
          >
            <Icon className="h-6 w-6 text-foreground" />
            <div className="mt-4 text-base font-semibold text-foreground">
              {label}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
          </button>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-foreground">
        Which best describes your place?
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        {props.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => update("propertyLabel", key)}
            className={cn(
              "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors",
              state.propertyLabel === key
                ? "border-brand bg-brand/5"
                : "border-border hover:border-foreground/30"
            )}
          >
            <Icon className="h-5 w-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">{key}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

type AddrSuggestion = {
  lat: number;
  lng: number;
  display_name: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
};

function Step2({ state, update }: { state: WizardState; update: UpdateFn }) {
  const [suggestions, setSuggestions] = useState<AddrSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSug, setLoadingSug] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const suppressNextFetchRef = useRef(false);

  // Debounced Nominatim suggestions when the host types in the street field.
  useEffect(() => {
    if (suppressNextFetchRef.current) {
      suppressNextFetchRef.current = false;
      return;
    }
    const q = state.street.trim();
    if (q.length < 4) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setLoadingSug(true);
    const t = setTimeout(async () => {
      try {
        const hint = [state.city, state.state].filter(Boolean).join(", ");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.street, state.city, state.state]);

  const pickSuggestion = (s: AddrSuggestion) => {
    suppressNextFetchRef.current = true;
    if (s.street) update("street", s.street);
    if (s.city) update("city", s.city);
    if (s.state) update("state", s.state);
    if (s.zip) update("zip", s.zip);
    update("lat", s.lat);
    update("lng", s.lng);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const geocodeAddress = async () => {
    const parts = [state.street, state.city, state.state, state.zip]
      .filter(Boolean)
      .join(", ");
    if (!parts) {
      toast.error("Enter an address first");
      return;
    }
    setGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(parts)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { lat: number; lng: number };
      update("lat", data.lat);
      update("lng", data.lng);
      toast.success("Location pinned");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't find that address");
    } finally {
      setGeocoding(false);
    }
  };

  // Defensive: map always renders. Fall back to NYC if state.lat/lng are
  // missing or not finite numbers (could happen if a stale localStorage
  // draft saved them as null/string/undefined).
  const mapLat =
    typeof state.lat === "number" && Number.isFinite(state.lat)
      ? state.lat
      : 40.7128;
  const mapLng =
    typeof state.lng === "number" && Number.isFinite(state.lng)
      ? state.lng
      : -74.006;
  const hasPin =
    typeof state.lat === "number" &&
    Number.isFinite(state.lat) &&
    typeof state.lng === "number" &&
    Number.isFinite(state.lng);

  return (
    <div>
      <StepHeading
        title="Where's your place located?"
        subtitle="Address is hidden from guests until they book."
      />
      <div className="space-y-4">
        <div className="relative">
          <Label className="mb-2 block text-sm font-semibold">
            Street address
            <span className="ml-2 font-normal text-muted-foreground">
              — start typing for suggestions
            </span>
          </Label>
          <Input
            className={BIG_INPUT}
            value={state.street}
            onChange={(e) => {
              update("street", e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            placeholder="123 Main St"
            autoComplete="off"
          />
          {showSuggestions && (suggestions.length > 0 || loadingSug) && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
              {loadingSug && suggestions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  Searching&hellip;
                </div>
              ) : (
                suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={(e) => {
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
              value={state.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="Brooklyn"
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-semibold">State</Label>
            <Input
              className={BIG_INPUT}
              value={state.state}
              onChange={(e) => update("state", e.target.value)}
              placeholder="NY"
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-semibold">ZIP</Label>
            <Input
              className={BIG_INPUT}
              value={state.zip}
              onChange={(e) => update("zip", e.target.value)}
              placeholder="11201"
            />
          </div>
        </div>
        <div>
          <Label className="mb-2 block text-sm font-semibold">
            Neighborhood (shown publicly)
          </Label>
          <Input
            className={BIG_INPUT}
            value={state.areaName}
            onChange={(e) => update("areaName", e.target.value)}
            placeholder="Williamsburg"
          />
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
            The purple circle shows the approximate area guests see before
            they book &mdash; your exact address stays private. Drag the pin
            to fine-tune.
          </span>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-foreground">
          Currently only serving the US market. If you live outside the US,{" "}
          <a
            href="mailto:hello@onedegreebnb.com?subject=Add%20my%20region%20to%20One%20Degree%20BNB"
            className="font-semibold underline underline-offset-2"
          >
            contact us here
          </a>{" "}
          to request adding your region.
        </div>
        <div className="space-y-2">
          <LocationPreview
            lat={mapLat}
            lng={mapLng}
            onChange={(newLat, newLng) => {
              update("lat", newLat);
              update("lng", newLng);
            }}
          />
          <p className="text-xs font-medium text-muted-foreground">
            {hasPin
              ? `Pinned at ${mapLat.toFixed(4)}, ${mapLng.toFixed(4)} — drag the pin to fine-tune`
              : "Pick an address above or drag the pin to place your listing"}
          </p>
        </div>
      </div>
    </div>
  );
}

function Step3({
  state,
  update,
  toggleAmenity,
}: {
  state: WizardState;
  update: UpdateFn;
  toggleAmenity: (a: string) => void;
}) {
  return (
    <div>
      <StepHeading
        title="Share some basics about your place"
        subtitle="You can change these any time."
      />
      <div className="rounded-xl border border-border bg-card px-5">
        <Counter
          label="Maximum guests"
          value={state.guests}
          onChange={(v) => update("guests", v)}
          min={1}
          max={16}
        />
        <Counter
          label="Bedrooms"
          value={state.bedrooms}
          onChange={(v) => update("bedrooms", v)}
        />
        <Counter
          label="Beds"
          value={state.beds}
          onChange={(v) => update("beds", v)}
        />
        <Counter
          label="Bathrooms"
          value={state.bathrooms}
          onChange={(v) => update("bathrooms", v)}
          min={0.5}
          max={10}
          step={0.5}
        />
      </div>

      <h2 className="mt-8 text-lg font-semibold text-foreground">
        Which amenities do you offer?
      </h2>
      {Object.entries(AMENITY_GROUPS).map(([group, items]) => (
        <div key={group} className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
            {items.map((a) => {
              const active = state.amenities.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-left text-sm transition-colors",
                    active
                      ? "border-brand bg-brand/5 text-foreground"
                      : "border-border text-foreground hover:border-foreground/30"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-sm border",
                      active ? "border-brand bg-brand text-white" : "border-border"
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
      ))}
    </div>
  );
}

function Step4({
  photos,
  onChange,
}: {
  photos: UploadedPhoto[];
  onChange: (p: UploadedPhoto[]) => void;
}) {
  return (
    <div>
      <StepHeading
        title="Add some photos of your place"
        subtitle="Choose at least 3 — star 2–3 to include in the anonymous preview."
      />
      <PhotoUploader photos={photos} onChange={onChange} />
    </div>
  );
}

function Step5({
  state,
  update,
  toggleRule,
}: {
  state: WizardState;
  update: UpdateFn;
  toggleRule: (r: string) => void;
}) {
  return (
    <div>
      <StepHeading
        title="Now, let's give your place a title & details"
        subtitle="Short titles work best. Keep it punchy."
      />
      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-sm font-semibold">Title</Label>
            <span
              className={cn(
                "text-xs",
                state.title.length > 50
                  ? "text-red-600"
                  : "text-muted-foreground"
              )}
            >
              {state.title.length}/50
            </span>
          </div>
          <Input
            className={BIG_INPUT}
            value={state.title}
            onChange={(e) => update("title", e.target.value.slice(0, 60))}
            placeholder="Sunny Brooklyn loft with rooftop"
            maxLength={60}
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-sm font-semibold">Listing description</Label>
            <span
              className={cn(
                "text-xs",
                state.description.length > 500
                  ? "text-red-600"
                  : "text-muted-foreground"
              )}
            >
              {state.description.length}/500
            </span>
          </div>
          <Textarea
            className={BIG_TEXTAREA}
            rows={5}
            value={state.description}
            onChange={(e) =>
              update("description", e.target.value.slice(0, 600))
            }
            placeholder="Tell guests what makes your place special."
          />
        </div>

        <div>
          <Label className="mb-2 block text-sm font-semibold">Your property</Label>
          <Textarea
            className={BIG_TEXTAREA}
            rows={4}
            value={state.propertyOverview}
            onChange={(e) => update("propertyOverview", e.target.value)}
            placeholder="Describe the space, layout, views, and neighborhood."
          />
        </div>
        <div>
          <Label className="mb-2 block text-sm font-semibold">Guest access</Label>
          <Textarea
            className={BIG_TEXTAREA}
            rows={3}
            value={state.guestAccess}
            onChange={(e) => update("guestAccess", e.target.value)}
            placeholder="What parts of the property can guests use?"
          />
        </div>
        <div>
          <Label className="mb-2 block text-sm font-semibold">Interaction with guests</Label>
          <Textarea
            className={BIG_TEXTAREA}
            rows={3}
            value={state.interactionWithGuests}
            onChange={(e) => update("interactionWithGuests", e.target.value)}
            placeholder="How much will you be around during their stay?"
          />
        </div>
        <div>
          <Label className="mb-2 block text-sm font-semibold">Other details to note</Label>
          <Textarea
            className={BIG_TEXTAREA}
            rows={3}
            value={state.otherDetails}
            onChange={(e) => update("otherDetails", e.target.value)}
            placeholder="Stairs, pets on property, quirks guests should know about."
          />
        </div>

        <div>
          <Label>House rules</Label>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            {DEFAULT_HOUSE_RULES.map((r) => {
              const active = state.houseRules.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRule(r)}
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
                  {r}
                </button>
              );
            })}
          </div>
          <Textarea
            className={cn(BIG_TEXTAREA, "mt-3")}
            rows={3}
            value={state.customRules}
            onChange={(e) => update("customRules", e.target.value)}
            placeholder="Additional custom rules (optional)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 block text-sm font-semibold">Check-in time</Label>
            <Input
              className={BIG_INPUT}
              type="time"
              value={state.checkIn}
              onChange={(e) => update("checkIn", e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-semibold">Check-out time</Label>
            <Input
              className={BIG_INPUT}
              type="time"
              value={state.checkOut}
              onChange={(e) => update("checkOut", e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Step6({ state, update }: { state: WizardState; update: UpdateFn }) {
  return (
    <div>
      <StepHeading
        title="Now for the fun part — set your price"
        subtitle="You can offer discounts and adjust availability after publishing."
      />
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label className="mb-2 block text-sm font-semibold">Nightly rate (USD)</Label>
            <Input
              className={BIG_INPUT}
              type="number"
              min={1}
              value={state.price}
              onChange={(e) => update("price", e.target.value)}
              placeholder="150"
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-semibold">Cleaning fee (optional)</Label>
            <Input
              className={BIG_INPUT}
              type="number"
              min={0}
              value={state.cleaningFee}
              onChange={(e) => update("cleaningFee", e.target.value)}
              placeholder="50"
            />
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Discounts
          </div>
          <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-2 block text-sm font-semibold">Weekly discount (%)</Label>
              <Input
                className={BIG_INPUT}
                type="number"
                min={0}
                max={99}
                value={state.weeklyDiscount}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (e.target.value === "") update("weeklyDiscount", "");
                  else if (n >= 0 && n <= 99) update("weeklyDiscount", String(n));
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
                value={state.monthlyDiscount}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (e.target.value === "") update("monthlyDiscount", "");
                  else if (n >= 0 && n <= 99) update("monthlyDiscount", String(n));
                }}
                placeholder="20"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Booking rules
          </div>
          <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label className="mb-2 block text-sm font-semibold">Minimum stay (nights)</Label>
              <Input
                className={BIG_INPUT}
                type="number"
                min={1}
                value={state.minNights}
                onChange={(e) => update("minNights", e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-semibold">Advance notice (days)</Label>
              <Input
                className={BIG_INPUT}
                type="number"
                min={0}
                value={state.advanceNoticeDays}
                onChange={(e) => update("advanceNoticeDays", e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-semibold">Prep days between bookings</Label>
              <Input
                className={BIG_INPUT}
                type="number"
                min={0}
                value={state.prepDays}
                onChange={(e) => update("prepDays", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Default availability
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            You can always override specific dates from the calendar after publishing.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {([
              {
                key: "available" as const,
                label: "All dates available",
                desc: "Guests can request any date (recommended).",
              },
              {
                key: "unavailable" as const,
                label: "All dates unavailable",
                desc: "Block everything; open specific dates manually.",
              },
              {
                key: "possibly" as const,
                label: "Possibly available",
                desc: "Guests can inquire; you confirm per request.",
              },
            ]).map(({ key, label, desc }) => (
              <button
                key={key}
                type="button"
                onClick={() => update("defaultAvailability", key)}
                className={cn(
                  "flex flex-col items-start rounded-xl border-2 p-4 text-left transition-colors",
                  state.defaultAvailability === key
                    ? "border-brand bg-brand/5"
                    : "border-border hover:border-foreground/30"
                )}
              >
                <div className="text-sm font-semibold text-foreground">{label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type PreviewToggleKey =
  | "previewShowTitle"
  | "previewShowPriceRange"
  | "previewShowDescription"
  | "previewShowHostFirstName"
  | "previewShowNeighborhood"
  | "previewShowMapArea"
  | "previewShowRating"
  | "previewShowAmenities"
  | "previewShowBedCounts"
  | "previewShowHouseRules";

type AccessKey =
  | "accessSeePreview"
  | "accessSeeFull"
  | "accessRequestBook"
  | "accessMessage"
  | "accessRequestIntro";

// ──────────────────────────────────────────────────────────────────
// Step 7 — Listing Preview
// Host controls what shows in the anonymous preview + sees a live mock.
// ──────────────────────────────────────────────────────────────────
interface Viewer {
  firstName: string;
  fullName: string;
}

function Step7Preview({
  state,
  update,
  viewer,
}: {
  state: WizardState;
  update: UpdateFn;
  viewer: Viewer;
}) {
  // Description handled as its own block below with a sub-toggle.
  const PREVIEW_TOGGLES: {
    key: PreviewToggleKey;
    label: string;
    desc: string;
  }[] = [
    { key: "previewShowTitle", label: "Listing title", desc: "If off, shows a generic label like \u201CPrivate listing in [area]\u201D" },
    { key: "previewShowPriceRange", label: "Price range", desc: "$min–$max / night" },
    { key: "previewShowHostFirstName", label: "Your first name", desc: "If off, shows \"a verified member\"" },
    { key: "previewShowNeighborhood", label: "Neighborhood", desc: "City and area name" },
    { key: "previewShowMapArea", label: "Approximate map area", desc: "Blurred radius, no exact pin" },
    { key: "previewShowRating", label: "Rating & reviews count", desc: "Star rating and how many reviews" },
    { key: "previewShowAmenities", label: "Amenities list", desc: "WiFi, parking, etc." },
    { key: "previewShowBedCounts", label: "Bedroom / bed / bath count", desc: "\u201C2 bedrooms \u00B7 2 beds \u00B7 1 bath\u201D" },
    { key: "previewShowHouseRules", label: "House rules", desc: "Rules you set for guests" },
  ];

  // Preview photos are fully opt-in. Even the cover can be toggled off;
  // in that case the cover is shown blurred in the preview fallback.
  const togglePreviewPhoto = (idx: number) => {
    const next = state.photos.map((p, i) =>
      i === idx ? { ...p, is_preview: !p.is_preview } : p
    );
    update("photos", next);
  };

  return (
    <div>
      <StepHeading
        title="Listing Preview"
        subtitle="This is a preview of your listing to show parts of it without showing all of it. Below you control exactly what's shown in the preview. Then on the next step, you control who can see it."
      />

      <div className="space-y-8">
        {/* Preview content toggles */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-base font-semibold text-foreground">
            Show in preview
          </div>
          <div className="mt-5 space-y-2">
            {PREVIEW_TOGGLES.map(({ key, label, desc }) => (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-white px-4 py-3 hover:border-foreground/30"
              >
                <button
                  type="button"
                  role="switch"
                  aria-checked={state[key]}
                  onClick={() => update(key, !state[key])}
                  className={cn(
                    "relative mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                    state[key] ? "bg-brand" : "bg-zinc-300"
                  )}
                >
                  <span
                    className={cn(
                      "block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                      state[key] ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </button>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Description block — main toggle + sub-toggle + conditional textarea */}
          <div className="mt-6 rounded-lg border border-border bg-white p-4">
            {/* Main toggle: show full description */}
            <label className="flex cursor-pointer items-start gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={state.previewShowDescription}
                onClick={() =>
                  update("previewShowDescription", !state.previewShowDescription)
                }
                className={cn(
                  "relative mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                  state.previewShowDescription ? "bg-brand" : "bg-zinc-300"
                )}
              >
                <span
                  className={cn(
                    "block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                    state.previewShowDescription
                      ? "translate-x-4"
                      : "translate-x-0.5"
                  )}
                />
              </button>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">
                  Description
                </div>
                <div className="text-xs text-muted-foreground">
                  Show the full listing description in the preview.
                </div>
              </div>
            </label>

            {/* Sub-toggle: use preview-specific description instead */}
            {state.previewShowDescription && (
              <div className="mt-3 ml-12 border-l-2 border-border pl-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={state.usePreviewSpecificDescription}
                    onClick={() =>
                      update(
                        "usePreviewSpecificDescription",
                        !state.usePreviewSpecificDescription
                      )
                    }
                    className={cn(
                      "relative mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                      state.usePreviewSpecificDescription
                        ? "bg-brand"
                        : "bg-zinc-300"
                    )}
                  >
                    <span
                      className={cn(
                        "block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                        state.usePreviewSpecificDescription
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
                      Write a shorter blurb shown in preview instead of the
                      full description.
                    </div>
                  </div>
                </label>

                {state.usePreviewSpecificDescription && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">
                        Preview description
                      </Label>
                      <span
                        className={cn(
                          "text-xs",
                          state.previewDescription.length > 200
                            ? "text-red-600"
                            : "text-muted-foreground"
                        )}
                      >
                        {state.previewDescription.length}/200
                      </span>
                    </div>
                    <Textarea
                      className={cn(BIG_TEXTAREA, "mt-2")}
                      rows={3}
                      value={state.previewDescription}
                      onChange={(e) =>
                        update("previewDescription", e.target.value.slice(0, 200))
                      }
                      placeholder="A charming space in a great neighborhood..."
                      maxLength={200}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preview photo selector — mini version of the photo uploader */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-base font-semibold text-foreground">
            Preview photos
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the eye to include a photo in the preview. 2&ndash;3 photos work
            best. The cover is always included &mdash; but if you don&apos;t mark
            it as a preview too, it&apos;ll be shown blurred.
          </p>
          {state.photos.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Upload photos first (back one step) to select preview photos here.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {state.photos.map((p, i) => (
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
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20" />
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

        {/* Live mocks — two tiles side by side, then full-width preview listing */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-base font-semibold text-foreground">
            How your preview will look
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Updates live as you change settings above.
          </p>

          {/* Two tiles side by side */}
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Full tile (after unlock)
              </div>
              <ListingTileMock state={state} mode="full" viewer={viewer} />
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preview tile (before unlock)
              </div>
              <ListingTileMock state={state} mode="preview" viewer={viewer} />
            </div>
          </div>
        </div>

        {/* Full-width preview listing — breaks out of the 880px wizard container */}
        <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 bg-muted/30 py-8">
          <div className="mx-auto w-full max-w-[1200px] px-4 md:px-8">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Preview listing page
            </div>
            <ListingDetailMock state={state} mode="preview" viewer={viewer} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Shared mock components — render the wizard state as a listing tile
// or listing detail page, in either "preview" or "full" mode.
// ──────────────────────────────────────────────────────────────────

function getListingDisplay(state: WizardState) {
  const priceDisplay =
    state.price && Number(state.price) > 0 ? `$${state.price}` : null;
  // Preview description resolution:
  //   - if host wrote a preview-specific one AND opted to use it, show it
  //   - otherwise show the full description as-is
  const previewDesc = state.usePreviewSpecificDescription
    ? state.previewDescription ||
      state.description.slice(0, 100) +
        (state.description.length > 100 ? "\u2026" : "")
    : state.description;
  const coverPhoto = state.photos.find((p) => p.is_cover) || state.photos[0];
  const previewPhotos = state.photos.filter((p) => p.is_preview);
  return { priceDisplay, previewDesc, coverPhoto, previewPhotos };
}

/**
 * Resolve the photos a preview viewer should see, with per-photo blur
 * state. Rule:
 *   - The cover is always included (first in the list).
 *   - Any photo explicitly marked is_preview is included unblurred.
 *   - If the cover is NOT marked is_preview, it's shown blurred (full
 *     color — just the blur filter, no desaturation).
 */
function getPreviewPhotoSet(
  photos: UploadedPhoto[]
): { url: string; blur: boolean }[] {
  const out: { url: string; blur: boolean }[] = [];
  const cover = photos.find((p) => p.is_cover) || photos[0];
  if (cover) {
    out.push({ url: cover.public_url, blur: !cover.is_preview });
  }
  for (const p of photos) {
    if (p === cover) continue;
    if (p.is_preview) out.push({ url: p.public_url, blur: false });
  }
  return out;
}

function ListingTileMock({
  state,
  mode,
  viewer,
}: {
  state: WizardState;
  mode: "preview" | "full";
  viewer: Viewer;
}) {
  const { priceDisplay, coverPhoto } = getListingDisplay(state);
  const isPreview = mode === "preview";
  const allPhotos = state.photos;

  // Full mode: carousel through ALL photos (cover first), never blurred.
  // Preview mode: use getPreviewPhotoSet — cover always included, blurred
  // when cover isn't also marked is_preview; other is_preview photos
  // shown unblurred.
  const fullImages =
    allPhotos.length > 0
      ? [
          ...(coverPhoto ? [coverPhoto] : []),
          ...allPhotos.filter((p) => !p.is_cover),
        ].map((p) => ({ url: p.public_url, blur: false }))
      : [];
  const previewSet = getPreviewPhotoSet(allPhotos);
  const images = isPreview ? previewSet : fullImages;

  const [idx, setIdx] = useState(0);
  // Reset index when images array shrinks
  useEffect(() => {
    if (idx >= images.length && images.length > 0) setIdx(0);
  }, [idx, images.length]);

  const prev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx((i) => (i === 0 ? images.length - 1 : i - 1));
  };
  const next = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx((i) => (i === images.length - 1 ? 0 : i + 1));
  };

  const currentImg = images[idx];

  // Resolve the tile's display fields per mode + toggles
  const tileTitle = isPreview
    ? state.previewShowTitle
      ? state.title || "Your listing"
      : state.previewShowNeighborhood
        ? `Private listing in ${state.areaName || state.city || "your area"}`
        : "Private listing"
    : state.title || "Your listing";

  const tileNeighborhood = isPreview
    ? state.previewShowNeighborhood
      ? state.areaName || state.city || ""
      : null
    : state.areaName || state.city || "";

  // Host label. In preview: use first name when the toggle is on, else
  // the anonymous label. In full: use the full name.
  const tileHost = isPreview
    ? state.previewShowHostFirstName
      ? viewer.firstName
        ? `Hosted by ${viewer.firstName}`
        : "Hosted by you"
      : "Hosted by a verified member"
    : viewer.fullName
      ? `Hosted by ${viewer.fullName}`
      : "Hosted by you";

  return (
    <div className="group w-full max-w-xs">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        {currentImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImg.url}
            alt="Listing photo"
            className={cn(
              "h-full w-full object-cover",
              isPreview && currentImg.blur && "scale-110 blur-lg",
              isPreview && !currentImg.blur && "saturate-[0.92]"
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No cover photo yet
          </div>
        )}

        {isPreview && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
            <Lock className="h-3 w-3" /> Private listing
          </div>
        )}

        {/* Carousel controls — always available when there's more than 1 image */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1 opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1 opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-white"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors",
                    i === idx ? "bg-white" : "bg-white/50"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="mt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground leading-tight line-clamp-1">
            {tileTitle}
          </h3>
          {(isPreview ? state.previewShowRating : true) && (
            <div className="text-xs text-muted-foreground">&#9733; 4.87</div>
          )}
        </div>
        {tileNeighborhood && (
          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
            {tileNeighborhood}
          </p>
        )}
        {tileHost && (
          <p className="text-sm text-muted-foreground">{tileHost}</p>
        )}
        {(isPreview ? state.previewShowPriceRange : true) && priceDisplay && (
          <p className="mt-1 text-sm">
            <span className="font-semibold">{priceDisplay}</span>
            <span className="text-muted-foreground"> / night</span>
          </p>
        )}
      </div>
    </div>
  );
}

function ListingDetailMock({
  state,
  mode,
  viewer,
}: {
  state: WizardState;
  mode: "preview" | "full";
  viewer: Viewer;
}) {
  const { priceDisplay, previewDesc, coverPhoto } = getListingDisplay(state);
  const isPreview = mode === "preview";
  // Preview: cover always included, blurred if not is_preview; other
  //   is_preview photos shown unblurred.
  // Full: all photos (cover first), never blurred.
  const photosToShow = isPreview
    ? getPreviewPhotoSet(state.photos).slice(0, 5)
    : (coverPhoto
        ? [coverPhoto, ...state.photos.filter((p) => !p.is_cover)]
        : state.photos
      )
        .slice(0, 5)
        .map((p) => ({ url: p.public_url, blur: false }));

  const propertyLabel =
    state.placeKind === "private"
      ? "Private room"
      : state.placeKind === "shared"
        ? "Shared room"
        : "Entire place";

  // Toggle getter — in "full" mode everything is always shown.
  const show = (key: PreviewToggleKey) => (isPreview ? state[key] : true);

  const areaName = state.areaName || state.city || "Neighborhood";
  const fullDescription = state.description || previewDesc;

  // Headline: real title OR generic fallback in preview
  const displayTitle = isPreview
    ? show("previewShowTitle")
      ? state.title || `${propertyLabel} in ${areaName}`
      : `${propertyLabel}${show("previewShowNeighborhood") ? ` in ${areaName}` : ""}`
    : state.title || `${propertyLabel} in ${areaName}`;

  return (
    <div className="overflow-hidden rounded-2xl bg-white">
      {/* Photo grid — adaptive layout based on count, per-photo blur */}
      <AdaptivePhotoGrid photos={photosToShow} dimmed={isPreview} />

      <div className="px-4 py-8 md:px-8">
        {/* Title row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold leading-tight md:text-3xl">
              {displayTitle}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {show("previewShowRating") && (
                <>
                  <span>&#9733;</span>
                  <span className="font-semibold">4.87</span>
                  <span className="text-muted-foreground">&middot;</span>
                  <span className="font-semibold underline">24 reviews</span>
                  <span className="text-muted-foreground">&middot;</span>
                </>
              )}
              {show("previewShowNeighborhood") && (
                <span className="font-semibold underline">{areaName}</span>
              )}
            </div>
          </div>
        </div>

        {/* Two-column layout — content + sticky booking sidebar */}
        <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-16">
          <div className="md:col-span-2">
            {/* Subtitle + bed counts */}
            <div>
              <h2 className="text-xl font-semibold md:text-2xl">
                {propertyLabel}
                {show("previewShowNeighborhood") ? ` in ${areaName}` : ""}
              </h2>
              {show("previewShowBedCounts") && (
                <p className="mt-1 text-muted-foreground">
                  {state.guests} guest{state.guests !== 1 ? "s" : ""} &middot;{" "}
                  {state.bedrooms} bedroom{state.bedrooms !== 1 ? "s" : ""}{" "}
                  &middot; {state.beds} bed{state.beds !== 1 ? "s" : ""}{" "}
                  &middot; {state.bathrooms} bath
                  {state.bathrooms !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div className="my-8 h-px bg-border" />

            {/* Host card */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
                {isPreview && !show("previewShowHostFirstName")
                  ? "?"
                  : (viewer.firstName || "Y").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {isPreview
                    ? show("previewShowHostFirstName")
                      ? viewer.firstName
                        ? `Hosted by ${viewer.firstName}`
                        : "Hosted by you"
                      : "Hosted by a verified member"
                    : viewer.fullName
                      ? `Hosted by ${viewer.fullName}`
                      : "Hosted by you"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isPreview && !show("previewShowHostFirstName")
                    ? "Host identity revealed once you meet the trust threshold"
                    : "Host"}
                </div>
              </div>
            </div>

            <div className="my-8 h-px bg-border" />

            {/* Description */}
            {(!isPreview || show("previewShowDescription")) && (
              <>
                <section>
                  <h2 className="mb-4 text-xl font-semibold">About this place</h2>
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">
                    {isPreview ? previewDesc : fullDescription}
                  </p>
                  {!isPreview && state.propertyOverview && (
                    <>
                      <h3 className="mt-5 mb-2 text-base font-semibold text-foreground">
                        Your property
                      </h3>
                      <p className="text-base text-muted-foreground">
                        {state.propertyOverview}
                      </p>
                    </>
                  )}
                  {!isPreview && state.guestAccess && (
                    <>
                      <h3 className="mt-5 mb-2 text-base font-semibold text-foreground">
                        Guest access
                      </h3>
                      <p className="text-base text-muted-foreground">
                        {state.guestAccess}
                      </p>
                    </>
                  )}
                  {!isPreview && state.interactionWithGuests && (
                    <>
                      <h3 className="mt-5 mb-2 text-base font-semibold text-foreground">
                        Interaction with guests
                      </h3>
                      <p className="text-base text-muted-foreground">
                        {state.interactionWithGuests}
                      </p>
                    </>
                  )}
                </section>
                <div className="my-8 h-px bg-border" />
              </>
            )}

            {/* Amenities — uses the real AmenitiesSection component so icons match */}
            {(!isPreview || show("previewShowAmenities")) && (
              <>
                <section>
                  <h2 className="mb-6 text-xl font-semibold">
                    What this place offers
                  </h2>
                  <AmenitiesSection amenities={state.amenities} />
                </section>
                <div className="my-8 h-px bg-border" />
              </>
            )}

            {/* Calendar — real AvailabilityCalendar, wrapped to block interaction */}
            <section>
              <h2 className="mb-2 text-xl font-semibold">Select check-in date</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Add your travel dates for exact pricing
              </p>
              <div className="pointer-events-none select-none opacity-90">
                <AvailabilityCalendarWrapper blockedRanges={[]} />
              </div>
            </section>
          </div>

          {/* Right column — booking sidebar */}
          <aside className="md:col-span-1">
            <div className="sticky top-24 rounded-xl border border-border bg-white p-6 shadow-xl">
              {show("previewShowPriceRange") && priceDisplay ? (
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-semibold">{priceDisplay}</span>
                    <span className="text-base text-muted-foreground">
                      {" "}
                      / night
                    </span>
                  </div>
                  {show("previewShowRating") && (
                    <div className="text-sm text-muted-foreground">
                      &#9733; 4.87 &middot; 24 reviews
                    </div>
                  )}
                </div>
              ) : isPreview ? (
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  Pricing shown after access
                </div>
              ) : null}

              <div
                className="mt-4 overflow-hidden rounded-lg border border-foreground/20 opacity-90"
                aria-disabled
              >
                <div className="grid grid-cols-2">
                  <div className="border-r border-foreground/20 p-3 text-left">
                    <div className="text-[10px] font-semibold uppercase">
                      Check-in
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Add date
                    </div>
                  </div>
                  <div className="p-3 text-left">
                    <div className="text-[10px] font-semibold uppercase">
                      Checkout
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Add date
                    </div>
                  </div>
                </div>
                <div className="border-t border-foreground/20 p-3 text-left">
                  <div className="text-[10px] font-semibold uppercase">
                    Guests
                  </div>
                  <div className="text-sm text-muted-foreground">
                    1 guest
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled
                aria-disabled
                className="mt-4 h-12 w-full rounded-lg bg-brand text-base font-semibold text-white opacity-80"
                onClick={(e) => e.preventDefault()}
              >
                Request to Book
              </button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Payment arranged directly with your host off-platform
              </p>
            </div>
          </aside>
        </div>

        <div className="my-10 h-px bg-border" />

        {/* Map / location — real LocationMapClient (same as real listing) */}
        {show("previewShowMapArea") && (
          <>
            <section>
              <h2 className="mb-2 text-xl font-semibold">Where you&apos;ll be</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                {show("previewShowNeighborhood") ? areaName : "Private location"}
              </p>
              {state.lat && state.lng ? (
                <div className="pointer-events-none select-none">
                  <LocationMapClient
                    lat={state.lat}
                    lng={state.lng}
                    areaName={areaName}
                  />
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
                  Add an address in Step 2 to see the map
                </div>
              )}
            </section>
            <div className="my-10 h-px bg-border" />
          </>
        )}

        {/* House rules / Things to know */}
        {(!isPreview || show("previewShowHouseRules")) && (
          <>
            <section>
              <h2 className="mb-6 text-xl font-semibold">Things to know</h2>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div>
                  <h3 className="mb-3 font-semibold">House rules</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Check-in: {state.checkIn}</li>
                    <li>Checkout: {state.checkOut}</li>
                    <li>
                      Minimum stay: {state.minNights} night
                      {state.minNights !== "1" ? "s" : ""}
                    </li>
                    {state.houseRules.map((r) => (
                      <li key={r}>&middot; {r}</li>
                    ))}
                    {state.customRules && (
                      <li className="whitespace-pre-wrap pt-2 text-foreground">
                        {state.customRules}
                      </li>
                    )}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-3 font-semibold">Safety &amp; property</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Smoke alarm</li>
                    <li>Carbon monoxide alarm</li>
                    <li>Security camera not on property</li>
                  </ul>
                </div>
                <div>
                  <h3 className="mb-3 font-semibold">Cancellation policy</h3>
                  <p className="text-sm text-muted-foreground">
                    Free cancellation before 48 hours of check-in. Review the
                    full policy at the time of booking.
                  </p>
                </div>
              </div>
            </section>
            <div className="my-10 h-px bg-border" />
          </>
        )}

        {/* Meet your host */}
        <section>
          <h2 className="mb-6 text-xl font-semibold">Meet your host</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-xl border border-border/60 p-6 md:col-span-1">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-2xl font-semibold text-muted-foreground">
                  {isPreview && !show("previewShowHostFirstName")
                    ? "?"
                    : (viewer.firstName || "Y").charAt(0).toUpperCase()}
                </div>
                <div className="mt-3 text-xl font-semibold">
                  {isPreview
                    ? show("previewShowHostFirstName")
                      ? viewer.firstName || "You"
                      : "Verified member"
                    : viewer.fullName || "You"}
                </div>
              </div>
              <div className="mt-6 space-y-3 border-t border-border/60 pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reviews</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rating</span>
                  <span className="font-semibold">&mdash;</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Years hosting</span>
                  <span className="font-semibold">&lt; 1</span>
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <p className="whitespace-pre-wrap text-base leading-relaxed">
                {isPreview && !show("previewShowHostFirstName")
                  ? "Host profile is revealed once you meet the trust threshold."
                  : viewer.fullName
                    ? `${viewer.fullName} is a host on One Degree BNB.`
                    : "You are a host on One Degree BNB."}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * Adaptive photo grid — visual layout changes based on how many
 * photos are provided (1, 2, 3, 4, or 5+). Per-photo `blur` lets the
 * cover stay blurred while other preview photos show in full detail.
 */
function AdaptivePhotoGrid({
  photos,
  dimmed,
}: {
  photos: { url: string; blur: boolean }[];
  dimmed: boolean;
}) {
  if (photos.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center bg-muted text-sm text-muted-foreground">
        No photos yet
      </div>
    );
  }

  const Photo = ({
    url,
    blur,
    alt,
  }: {
    url: string;
    blur: boolean;
    alt: string;
  }) => (
    <div className="relative h-full w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className={cn(
          "h-full w-full object-cover transition-all",
          blur
            ? "scale-110 blur-2xl"
            : dimmed
              ? "saturate-[0.92]"
              : undefined
        )}
      />
    </div>
  );

  const count = photos.length;
  // Show the "unlocked with access" overlay only if every shown photo
  // is blurred (i.e. cover is the only photo and it's not is_preview).
  const allBlurred = photos.every((p) => p.blur);

  return (
    <div className="relative overflow-hidden rounded-t-2xl md:rounded-t-2xl">
      {count === 1 && (
        <div className="h-64 md:h-[480px]">
          <Photo url={photos[0].url} blur={photos[0].blur} alt="Listing photo" />
        </div>
      )}
      {count === 2 && (
        <div className="grid h-64 grid-cols-2 gap-1 md:h-[480px]">
          <Photo url={photos[0].url} blur={photos[0].blur} alt="Photo 1" />
          <Photo url={photos[1].url} blur={photos[1].blur} alt="Photo 2" />
        </div>
      )}
      {count === 3 && (
        <div className="grid h-64 grid-cols-2 gap-1 md:h-[480px]">
          <Photo url={photos[0].url} blur={photos[0].blur} alt="Photo 1" />
          <div className="grid h-full grid-rows-2 gap-1">
            <Photo url={photos[1].url} blur={photos[1].blur} alt="Photo 2" />
            <Photo url={photos[2].url} blur={photos[2].blur} alt="Photo 3" />
          </div>
        </div>
      )}
      {count === 4 && (
        <div className="grid h-64 grid-cols-2 grid-rows-2 gap-1 md:h-[480px]">
          <Photo url={photos[0].url} blur={photos[0].blur} alt="Photo 1" />
          <Photo url={photos[1].url} blur={photos[1].blur} alt="Photo 2" />
          <Photo url={photos[2].url} blur={photos[2].blur} alt="Photo 3" />
          <Photo url={photos[3].url} blur={photos[3].blur} alt="Photo 4" />
        </div>
      )}
      {/* 5+ photos: classic Airbnb gallery — 1 big hero left, 2x2 on right. */}
      {count >= 5 && (
        <div className="grid h-64 grid-cols-4 grid-rows-2 gap-1 md:h-[480px]">
          <div className="col-span-2 row-span-2">
            <Photo url={photos[0].url} blur={photos[0].blur} alt="Photo 1" />
          </div>
          <Photo url={photos[1].url} blur={photos[1].blur} alt="Photo 2" />
          <Photo url={photos[2].url} blur={photos[2].blur} alt="Photo 3" />
          <Photo url={photos[3].url} blur={photos[3].blur} alt="Photo 4" />
          <Photo url={photos[4].url} blur={photos[4].blur} alt="Photo 5" />
        </div>
      )}

      {allBlurred && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground shadow-sm backdrop-blur">
            <Lock className="h-3.5 w-3.5" /> Photos unlocked with access
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Unused — we now embed the real AvailabilityCalendar inside a
 * pointer-events-none wrapper on the preview/review step. Keeping the
 * comment as a breadcrumb in case someone greps for MockCalendar.
 */

// ──────────────────────────────────────────────────────────────────
// Step 8 — Visibility & Access
// Templates at top are just presets that pre-fill the rules below.
// ──────────────────────────────────────────────────────────────────
function Step8Visibility({
  state,
  update,
}: {
  state: WizardState;
  update: UpdateFn;
}) {
  // Three UI presets. They all store visibility_mode="preview_gated"
  // in the DB — the difference is just which access rules get pre-filled.
  // "Private" = strict trust gates (high min_score), "Public" = anyone
  // for everything, "Standard" = balanced defaults.
  const PRESETS: {
    key: "standard" | "public" | "private";
    label: string;
    desc: string;
  }[] = [
    {
      key: "standard",
      label: "Standard",
      desc: "Anonymous preview for everyone. Full listing gated by trust.",
    },
    {
      key: "public",
      label: "Public",
      desc: "Full listing visible to anyone on the platform.",
    },
    {
      key: "private",
      label: "Private",
      desc: "Invite-only. Only people you add can see or book. Others can still request an intro.",
    },
  ];

  const ACCESS_ACTIONS: { key: AccessKey; label: string; hint?: string }[] = [
    { key: "accessSeePreview", label: "See Preview", hint: "Who can see the anonymous preview of your listing" },
    { key: "accessSeeFull", label: "See Full Listing", hint: "Who can unlock and view the full listing" },
    { key: "accessRequestBook", label: "Request to Book", hint: "Who can send a booking request" },
    { key: "accessMessage", label: "Message Host", hint: "Who can send you a message" },
    { key: "accessRequestIntro", label: "Request Introduction", hint: "Who can ask a mutual connection for an intro" },
  ];

  const ACCESS_TYPES: { key: AccessType; label: string }[] = [
    { key: "anyone_anywhere", label: "Anyone (incl. not signed in)" },
    { key: "anyone", label: "Anyone signed in" },
    { key: "min_score", label: "Min 1\u00B0 score" },
    { key: "max_degrees", label: "Within N degrees" },
    { key: "specific_people", label: "Specific people" },
  ];

  const updateAccessRule = (
    key: AccessKey,
    field: keyof AccessRuleState,
    value: string
  ) => {
    const current = state[key];
    update(key, { ...current, [field]: value });
  };

  // Quick-fill presets — pre-populate access rules. Always stored as
  // visibility_mode="preview_gated" (listings are always discoverable
  // in browse; strictness comes from the access rules themselves).
  const applyPreset = (preset: "standard" | "public" | "private") => {
    update("visibilityMode", "preview_gated");
    if (preset === "public") {
      // Preview visible to the public web (no sign-in required).
      // Full listing still requires a 1° score of 30. Messaging /
      // booking / intro open to anyone signed in.
      update("accessSeePreview", { type: "anyone_anywhere", threshold: "" });
      update("accessSeeFull", { type: "min_score", threshold: "30" });
      update("accessRequestBook", { type: "anyone", threshold: "" });
      update("accessMessage", { type: "anyone", threshold: "" });
      update("accessRequestIntro", { type: "anyone", threshold: "" });
    } else if (preset === "standard") {
      update("accessSeePreview", { type: "anyone", threshold: "" });
      update("accessSeeFull", { type: "min_score", threshold: "10" });
      update("accessRequestBook", { type: "min_score", threshold: "20" });
      update("accessMessage", { type: "min_score", threshold: "10" });
      update("accessRequestIntro", { type: "anyone", threshold: "" });
    } else if (preset === "private") {
      // Strict invite-only feel: almost everything locked to specific
      // people the host adds. Request Introduction is the one escape
      // hatch (min_score 30) so outsiders can politely ask.
      update("accessSeePreview", { type: "specific_people", threshold: "" });
      update("accessSeeFull", { type: "specific_people", threshold: "" });
      update("accessRequestBook", { type: "specific_people", threshold: "" });
      update("accessMessage", { type: "specific_people", threshold: "" });
      update("accessRequestIntro", { type: "min_score", threshold: "30" });
    }
  };

  // Infer which preset most closely matches the current rules, so the
  // selected card keeps highlighting even as the user tweaks settings.
  const currentPreset: "standard" | "public" | "private" | null = (() => {
    const isPublic =
      state.accessSeePreview.type === "anyone_anywhere" &&
      state.accessSeeFull.type === "min_score" &&
      state.accessSeeFull.threshold === "30" &&
      state.accessRequestBook.type === "anyone" &&
      state.accessMessage.type === "anyone" &&
      state.accessRequestIntro.type === "anyone";
    if (isPublic) return "public";
    const isStandard =
      state.accessSeePreview.type === "anyone" &&
      state.accessSeeFull.type === "min_score" &&
      state.accessSeeFull.threshold === "10" &&
      state.accessRequestBook.type === "min_score" &&
      state.accessRequestBook.threshold === "20";
    if (isStandard) return "standard";
    const isPrivate =
      state.accessSeePreview.type === "specific_people" &&
      state.accessSeeFull.type === "specific_people" &&
      state.accessRequestBook.type === "specific_people" &&
      state.accessMessage.type === "specific_people" &&
      state.accessRequestIntro.type === "min_score" &&
      state.accessRequestIntro.threshold === "30";
    if (isPrivate) return "private";
    return null;
  })();

  return (
    <div>
      <StepHeading
        title="Visibility & Access"
        subtitle="Pick a preset to start, then fine-tune who can do what. Presets just fill in the rules below — everything stays editable."
      />

      <div className="space-y-8">
        {/* Template presets */}
        <div>
          <div className="text-sm font-semibold text-foreground">Preset</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Click to apply as a starting point. All settings below stay editable &mdash; presets are just convenient defaults.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {PRESETS.map(({ key, label, desc }) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={cn(
                  "flex flex-col items-start rounded-xl border-2 p-5 text-left transition-colors",
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

        {/* Access rules */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-base font-semibold text-foreground">
            Access controls
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            For each action, choose who&apos;s allowed to do it.
          </p>

          <div className="mt-5 space-y-3">
            {ACCESS_ACTIONS.map(({ key, label, hint }) => {
              const rule = state[key];
              return (
                <div
                  key={key}
                  className="rounded-lg border border-border bg-white p-4"
                >
                  <div className="text-sm font-medium text-foreground">
                    {label}
                  </div>
                  {hint && (
                    <div className="text-xs text-muted-foreground">{hint}</div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      value={rule.type}
                      onChange={(e) =>
                        updateAccessRule(key, "type", e.target.value)
                      }
                      className={cn(
                        "h-10 rounded-lg border border-border bg-white px-3 text-sm",
                        "focus-visible:border-brand focus-visible:outline-none"
                      )}
                    >
                      {ACCESS_TYPES.map(({ key: ak, label: al }) => (
                        <option key={ak} value={ak}>
                          {al}
                        </option>
                      ))}
                    </select>
                    {(rule.type === "min_score" ||
                      rule.type === "max_degrees") && (
                      <Input
                        type="number"
                        min={0}
                        className="h-10 w-24 rounded-lg border border-border bg-white px-3 text-sm"
                        value={rule.threshold}
                        onChange={(e) =>
                          updateAccessRule(key, "threshold", e.target.value)
                        }
                        placeholder={
                          rule.type === "min_score" ? "Score" : "Degrees"
                        }
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
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

function Step9Review({
  state,
  viewer,
  onBack,
  onPublish,
  submitting,
}: {
  state: WizardState;
  viewer: Viewer;
  onBack: () => void;
  onPublish: () => void;
  submitting: boolean;
}) {
  return (
    <div>
      <StepHeading
        title="Review your listing"
        subtitle="Take one more look at the full listing below, then publish when you're ready."
      />

      {/* Buttons moved up under the title */}
      <div className="flex items-center justify-between gap-3 border-y border-border py-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className={BIG_BUTTON}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button
          type="button"
          onClick={onPublish}
          disabled={submitting}
          className={BIG_BUTTON_PRIMARY}
        >
          {submitting ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : null}
          Publish listing
        </Button>
      </div>

      {/* Full-width full-listing preview — breaks out of the wizard container */}
      <div className="relative left-1/2 right-1/2 mt-8 w-screen -translate-x-1/2 bg-muted/30 py-8">
        <div className="mx-auto w-full max-w-[1200px] px-4 md:px-8">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Full listing (this is what unlocked guests see)
          </div>
          <ListingDetailMock state={state} mode="full" viewer={viewer} />
        </div>
      </div>
    </div>
  );
}
