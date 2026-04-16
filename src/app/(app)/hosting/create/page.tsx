"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  ExternalLink,
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
type AccessType = "anyone" | "min_score" | "max_degrees" | "specific_people";

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
};

const STORAGE_KEY = "track-b:create-listing-draft";
const TOTAL_STEPS = 8;

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

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...initialState, ...JSON.parse(raw) });
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
        return state.photos.length >= 3 && state.photos.some((p) => p.is_preview);
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
        },
        photos: state.photos.map((p, i) => ({
          public_url: p.public_url,
          storage_path: p.storage_path,
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
        {state.step === 7 && <Step7Visibility state={state} update={update} />}
        {state.step === 8 && <Step8Review state={state} />}
      </div>

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
        {state.step < TOTAL_STEPS ? (
          <Button
            type="button"
            onClick={next}
            disabled={!canAdvance}
            className={BIG_BUTTON_PRIMARY}
          >
            Next <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={publish}
            disabled={submitting}
            className={BIG_BUTTON_PRIMARY}
          >
            {submitting ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : null}
            Publish listing
          </Button>
        )}
      </div>
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

function Step2({ state, update }: { state: WizardState; update: UpdateFn }) {
  return (
    <div>
      <StepHeading
        title="Where's your place located?"
        subtitle="Address is hidden from guests until they book."
      />
      <div className="space-y-4">
        <div>
          <Label className="mb-2 block text-sm font-semibold">Street address</Label>
          <Input
            className={BIG_INPUT}
            value={state.street}
            onChange={(e) => update("street", e.target.value)}
            placeholder="123 Main St"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
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
            <Label className="mb-2 block text-sm font-semibold">State / Region</Label>
            <Input
              className={BIG_INPUT}
              value={state.state}
              onChange={(e) => update("state", e.target.value)}
              placeholder="NY"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 block text-sm font-semibold">Postal code</Label>
            <Input
              className={BIG_INPUT}
              value={state.zip}
              onChange={(e) => update("zip", e.target.value)}
              placeholder="11201"
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-semibold">Neighborhood (shown publicly)</Label>
            <Input
              className={BIG_INPUT}
              value={state.areaName}
              onChange={(e) => update("areaName", e.target.value)}
              placeholder="Williamsburg"
            />
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          Map pin placement (drag-to-confirm) will appear here in a future
          update. For now, the area name you entered is what guests see.
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
        subtitle="Choose at least 3 — the cover photo is what guests see first."
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
                max={90}
                value={state.weeklyDiscount}
                onChange={(e) => update("weeklyDiscount", e.target.value)}
                placeholder="10"
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-semibold">Monthly discount (%)</Label>
              <Input
                className={BIG_INPUT}
                type="number"
                min={0}
                max={90}
                value={state.monthlyDiscount}
                onChange={(e) => update("monthlyDiscount", e.target.value)}
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

        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          By default, all dates are available. You can block specific dates
          from the calendar after publishing.
        </div>
      </div>
    </div>
  );
}

function Step7Visibility({ state, update }: { state: WizardState; update: UpdateFn }) {
  const VISIBILITY_MODES: { key: VisibilityMode; label: string; desc: string }[] = [
    {
      key: "preview_gated",
      label: "Standard",
      desc: "Anonymous preview visible to all. Full listing gated by trust.",
    },
    {
      key: "public",
      label: "Public",
      desc: "Full listing visible to anyone on the platform.",
    },
    {
      key: "hidden",
      label: "Hidden",
      desc: "Not discoverable in browse. Only via direct link you share.",
    },
  ];

  const ACCESS_ACTIONS: {
    key: keyof Pick<WizardState, "accessSeePreview" | "accessSeeFull" | "accessRequestBook" | "accessMessage" | "accessRequestIntro">;
    label: string;
  }[] = [
    { key: "accessSeePreview", label: "See Preview" },
    { key: "accessSeeFull", label: "See Full Listing" },
    { key: "accessRequestBook", label: "Request to Book" },
    { key: "accessMessage", label: "Message Host" },
    { key: "accessRequestIntro", label: "Request Introduction" },
  ];

  const ACCESS_TYPES: { key: AccessType; label: string }[] = [
    { key: "anyone", label: "Anyone on platform" },
    { key: "min_score", label: "Min 1\u00B0 score" },
    { key: "max_degrees", label: "Within N degrees" },
    { key: "specific_people", label: "Specific people" },
  ];

  const updateAccessRule = (
    key: keyof Pick<WizardState, "accessSeePreview" | "accessSeeFull" | "accessRequestBook" | "accessMessage" | "accessRequestIntro">,
    field: keyof AccessRuleState,
    value: string
  ) => {
    const current = state[key];
    update(key, { ...current, [field]: value });
  };

  return (
    <div>
      <StepHeading
        title="Visibility & Trust"
        subtitle="Control who can see and access your listing."
      />

      {/* Visibility Mode */}
      <div className="space-y-6">
        <div>
          <div className="text-sm font-semibold text-foreground">Listing visibility</div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {VISIBILITY_MODES.map(({ key, label, desc }) => (
              <button
                key={key}
                type="button"
                onClick={() => update("visibilityMode", key)}
                className={cn(
                  "flex flex-col items-start rounded-xl border-2 p-5 text-left transition-colors",
                  state.visibilityMode === key
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

        {/* Per-action access settings — only for preview_gated mode */}
        {state.visibilityMode === "preview_gated" && (
          <div>
            <div className="text-sm font-semibold text-foreground">Access settings</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Set who can perform each action on your listing.
            </p>
            <div className="mt-4 space-y-4">
              {ACCESS_ACTIONS.map(({ key, label }) => {
                const rule = state[key];
                return (
                  <div key={key} className="rounded-xl border border-border bg-card p-4">
                    <div className="text-sm font-medium text-foreground">{label}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <select
                        value={rule.type}
                        onChange={(e) => updateAccessRule(key, "type", e.target.value)}
                        className={cn(
                          "h-10 rounded-lg border border-border bg-white px-3 text-sm",
                          "focus-visible:border-brand focus-visible:outline-none"
                        )}
                      >
                        {ACCESS_TYPES.map(({ key: ak, label: al }) => (
                          <option key={ak} value={ak}>{al}</option>
                        ))}
                      </select>
                      {(rule.type === "min_score" || rule.type === "max_degrees") && (
                        <Input
                          type="number"
                          min={0}
                          className="h-10 w-24 rounded-lg border border-border bg-white px-3 text-sm"
                          value={rule.threshold}
                          onChange={(e) => updateAccessRule(key, "threshold", e.target.value)}
                          placeholder={rule.type === "min_score" ? "Score" : "Degrees"}
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
        )}

        {/* Preview description */}
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Preview description</Label>
            <span
              className={cn(
                "text-xs",
                state.previewDescription.length > 200 ? "text-red-600" : "text-muted-foreground"
              )}
            >
              {state.previewDescription.length}/200
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Short description shown to users who haven&apos;t unlocked your listing. If empty, we&apos;ll use the first 100 characters of your main description.
          </p>
          <Textarea
            className={cn(BIG_TEXTAREA, "mt-2")}
            rows={3}
            value={state.previewDescription}
            onChange={(e) => update("previewDescription", e.target.value.slice(0, 200))}
            placeholder="A charming space in a great neighborhood..."
            maxLength={200}
          />
        </div>

        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          Preview photos are selected in the Photos step — mark 2–3 photos as &quot;preview&quot; to control what anonymous visitors see.
        </div>
      </div>
    </div>
  );
}

function Step8Review({ state }: { state: WizardState }) {
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-start justify-between border-b border-border py-3 last:border-0">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="max-w-[60%] text-right text-sm font-medium text-foreground">
        {value || <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );

  const cover = state.photos.find((p) => p.is_preview) || state.photos[0];

  return (
    <div>
      <StepHeading
        title="Review your listing"
        subtitle="Make sure everything looks right, then publish."
      />
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.public_url}
            alt=""
            className="h-56 w-full object-cover"
          />
        )}
        <div className="px-5 py-4">
          <div className="text-xl font-semibold text-foreground">
            {state.title || "Untitled listing"}
          </div>
          <div className="text-sm text-muted-foreground">
            {state.areaName || state.city || "Location"}
          </div>
          <div className="mt-5 text-sm">
            {row(
              "Type",
              `${state.placeKind || "—"} · ${state.propertyLabel || "—"}`
            )}
            {row(
              "Capacity",
              `${state.guests} guests · ${state.bedrooms} bedrooms · ${state.beds} beds · ${state.bathrooms} baths`
            )}
            {row("Photos", `${state.photos.length} uploaded`)}
            {row(
              "Amenities",
              state.amenities.length > 0
                ? state.amenities.slice(0, 4).join(", ") +
                    (state.amenities.length > 4
                      ? ` +${state.amenities.length - 4} more`
                      : "")
                : null
            )}
            {row(
              "Price",
              state.price ? `$${state.price} / night` : null
            )}
            {row(
              "Cleaning fee",
              state.cleaningFee ? `$${state.cleaningFee}` : null
            )}
            {row("Minimum stay", `${state.minNights} night(s)`)}
            {row(
              "Check in / out",
              `${state.checkIn} / ${state.checkOut}`
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
        <ExternalLink className="h-4 w-4" />
        Preview opens after publishing from the host dashboard.
      </div>
    </div>
  );
}
