"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Plus,
  X,
} from "lucide-react";
import { AvailabilityCalendar } from "@/components/listing/availability-calendar";
import type { AccessRule, AccessSettings } from "@/lib/trust/types";
import {
  ThumbnailPicker,
  type ThumbnailValue,
} from "./thumbnail-picker";

export interface MyListingOption {
  id: string;
  title: string;
  area_name: string;
  /** Resolved see_preview rule — surfaced back to the author so the
   *  "inherit" radio can show what network they're about to inherit. */
  see_preview_rule: AccessRule;
}

interface Props {
  myListings: MyListingOption[];
  profileDefaultRule: AccessRule;
  /** True when the author already has the maximum number of active
   *  Host Offers. The UI blocks the kind toggle + form fields rather
   *  than letting them fill everything out and hit a 409. */
  hostOfferCapReached: boolean;
  hostOfferActiveCount: number;
  hostOfferCap: number;
}

type Kind = "trip_wish" | "host_offer";
type HookType = "none" | "discount" | "trade";
type DateMode = "range" | "flexible_month";
type VisibilityMode = "inherit" | "custom";
type CustomRuleType =
  | "anyone_anywhere"
  | "anyone"
  | "min_score"
  | "max_degrees";

const fieldCls =
  "h-14 rounded-xl border-2 border-border !bg-white px-4 font-medium shadow-sm focus:border-foreground/60 focus:outline-none";
const textareaCls =
  "min-h-[120px] w-full resize-none rounded-xl border-2 border-border !bg-white px-4 py-3 text-sm font-medium shadow-sm focus:border-foreground/60 focus:outline-none";

export function NewProposalForm({
  myListings,
  profileDefaultRule,
  hostOfferCapReached,
  hostOfferActiveCount,
  hostOfferCap,
}: Props) {
  const router = useRouter();

  const [kind, setKind] = useState<Kind>("trip_wish");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [destinations, setDestinations] = useState<string[]>([]);
  const [destinationInput, setDestinationInput] = useState("");

  const [dateMode, setDateMode] = useState<DateMode>("range");
  const [range, setRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [flexibleMonth, setFlexibleMonth] = useState("");

  const [guestCount, setGuestCount] = useState<string>("");

  const [listingId, setListingId] = useState<string>(
    myListings[0]?.id ?? ""
  );
  const [hookType, setHookType] = useState<HookType>("none");
  const [hookDetails, setHookDetails] = useState("");

  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>("inherit");
  const [customRuleType, setCustomRuleType] =
    useState<CustomRuleType>("anyone");
  const [customMinScore, setCustomMinScore] = useState("15");
  const [customMaxDegrees, setCustomMaxDegrees] = useState("2");

  const [thumbnail, setThumbnail] = useState<ThumbnailValue>({
    url: null,
    source: null,
    attribution: null,
  });

  const [submitting, setSubmitting] = useState(false);

  const descLen = description.trim().length;
  const titleLen = title.trim().length;
  const descTooShort = descLen < 20;
  const canSwitchToHostOffer = myListings.length > 0 && !hostOfferCapReached;

  const selectedListing = useMemo(
    () => myListings.find((l) => l.id === listingId) ?? null,
    [myListings, listingId]
  );

  const inheritedRule: AccessRule =
    kind === "host_offer" && selectedListing
      ? selectedListing.see_preview_rule
      : profileDefaultRule;

  const addDestination = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (destinations.includes(v)) return;
    if (destinations.length >= 10) return;
    setDestinations([...destinations, v]);
    setDestinationInput("");
  };

  const removeDestination = (v: string) => {
    setDestinations(destinations.filter((d) => d !== v));
  };

  const canSubmit = (() => {
    if (submitting) return false;
    if (titleLen < 1 || titleLen > 120) return false;
    if (descTooShort) return false;
    if (kind === "trip_wish") {
      const g = parseInt(guestCount || "0", 10);
      if (!g || g < 1) return false;
    }
    if (kind === "host_offer") {
      if (!listingId) return false;
      if (dateMode !== "range" || !range?.from || !range?.to) return false;
      if (hookType !== "none" && hookDetails.trim().length < 3) return false;
    }
    if (dateMode === "flexible_month" && flexibleMonth.trim().length === 0 && kind === "trip_wish") {
      return false;
    }
    return true;
  })();

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const startIso = range?.from ? format(range.from, "yyyy-MM-dd") : null;
      const endIso = range?.to ? format(range.to, "yyyy-MM-dd") : null;

      const accessSettings: AccessSettings | null =
        visibilityMode === "custom"
          ? {
              see_preview: buildCustomRule(
                customRuleType,
                customMinScore,
                customMaxDegrees
              ),
              // Proposals don't expose a separate full-listing-contact gate
              // — keep this default narrow so downstream normalization is
              // unambiguous if ever read.
              full_listing_contact: { type: "anyone" },
              allow_intro_requests: true,
            }
          : null;

      const payload = {
        kind,
        title: title.trim(),
        description: description.trim(),
        destinations,
        start_date: dateMode === "range" ? startIso : null,
        end_date: dateMode === "range" ? endIso : null,
        flexible_month:
          dateMode === "flexible_month" ? flexibleMonth.trim() : null,
        guest_count:
          kind === "trip_wish" && guestCount ? parseInt(guestCount, 10) : null,
        listing_id: kind === "host_offer" ? listingId : null,
        hook_type: kind === "host_offer" ? hookType : "none",
        hook_details:
          kind === "host_offer" && hookType !== "none"
            ? hookDetails.trim()
            : null,
        visibility_mode: visibilityMode,
        access_settings: accessSettings,
        thumbnail_url: kind === "trip_wish" ? thumbnail.url : null,
        thumbnail_source: kind === "trip_wish" ? thumbnail.source : null,
        // Full attribution blob (photographer, unsplash url, download
        // tracking endpoint, photo id). Persisted on the proposal so
        // the card can render the production-tier-compliant credit and
        // the API can ping Unsplash's download_location after insert.
        thumbnail_attribution:
          kind === "trip_wish" ? thumbnail.attribution : null,
      };

      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };
      if (!res.ok || !data.id) {
        toast.error(data.error || "Couldn't create proposal");
        return;
      }
      toast.success("Proposal posted");
      router.push(`/proposals/${data.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const dateLabel = (() => {
    if (!range?.from) return "Add dates";
    if (range.to) {
      return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`;
    }
    return `${format(range.from, "MMM d")} – pick end date`;
  })();

  const hostOfferHint = (() => {
    if (hostOfferCapReached) {
      return `${hostOfferActiveCount}/${hostOfferCap} active — close one first`;
    }
    if (myListings.length === 0) return "Create a listing first";
    return "I have availability";
  })();

  return (
    <div className="mt-8 space-y-6">
      {/* Cap banner — gates the Host Offer path before the user fills out
          the form. Trip Wishes stay uncapped so the banner only shows on
          that specific cap. */}
      {hostOfferCapReached && (
        <div className="rounded-xl border border-amber-300 bg-amber-400/10 p-4">
          <div className="text-sm font-semibold text-amber-100">
            You&apos;re at the Host Offer cap
          </div>
          <p className="mt-1 text-xs text-amber-100/80">
            You already have {hostOfferActiveCount} active Host Offers
            (max {hostOfferCap}). Close or delete one from{" "}
            <Link
              href="/proposals?author=me"
              className="font-semibold underline hover:text-amber-950"
            >
              your proposals
            </Link>{" "}
            before posting another. Trip Wishes are unlimited — switch
            kinds above if you want to post one of those.
          </p>
        </div>
      )}

      {/* Kind toggle */}
      <div className="flex gap-2">
        <KindToggleButton
          active={kind === "trip_wish"}
          label="Trip Wish"
          hint="I'm looking to travel"
          onClick={() => setKind("trip_wish")}
        />
        <KindToggleButton
          active={kind === "host_offer"}
          label="Host Offer"
          hint={hostOfferHint}
          onClick={() => {
            if (canSwitchToHostOffer) setKind("host_offer");
          }}
          disabled={!canSwitchToHostOffer}
        />
      </div>

      {/* Title */}
      <Field label="Title" hint={`${titleLen}/120`}>
        <input
          className={`${fieldCls} w-full text-sm`}
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            kind === "trip_wish"
              ? "Somewhere warm over spring break"
              : "Open week in July — my Portland bungalow"
          }
        />
      </Field>

      {/* Description */}
      <Field
        label="Description"
        hint={
          descTooShort
            ? `At least 20 characters (${descLen}/20)`
            : `${descLen}/1000`
        }
      >
        <textarea
          className={`${textareaCls} text-sm`}
          value={description}
          maxLength={1000}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder={
            kind === "trip_wish"
              ? "Tell hosts what you're hoping for — vibe, flexibility, who you're traveling with."
              : "Tell guests what's special about the place and these dates."
          }
        />
      </Field>

      {/* Destinations */}
      <Field
        label={kind === "trip_wish" ? "Destinations" : "Where (locations covered)"}
        hint="Press Enter to add. Up to 10."
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <input
              className={`${fieldCls} flex-1 text-sm`}
              value={destinationInput}
              onChange={(e) => setDestinationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDestination(destinationInput);
                }
              }}
              placeholder={
                kind === "trip_wish"
                  ? "Paris, anywhere warm, Lisbon…"
                  : "Brooklyn, East Village…"
              }
            />
            <button
              type="button"
              onClick={() => addDestination(destinationInput)}
              disabled={!destinationInput.trim() || destinations.length >= 10}
              className="inline-flex h-14 items-center gap-1 rounded-xl border-2 border-border bg-white px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
          {destinations.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {destinations.map((d) => (
                <li
                  key={d}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-medium"
                >
                  {d}
                  <button
                    type="button"
                    onClick={() => removeDestination(d)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${d}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Field>

      {/* Trip Wish thumbnail — Unsplash auto-fetch with manual override.
          Hidden for Host Offers since those use the linked listing's
          photo carousel instead. */}
      {kind === "trip_wish" && (
        <Field
          label="Thumbnail"
          hint="Auto-pulled from Unsplash · change or upload your own"
        >
          <ThumbnailPicker
            destination={destinations[0] ?? destinationInput}
            value={thumbnail}
            onChange={setThumbnail}
          />
        </Field>
      )}

      {/* Dates */}
      <Field label="Dates">
        <div className="space-y-2">
          {kind === "trip_wish" && (
            <div className="flex gap-2">
              <DateModeToggle
                active={dateMode === "range"}
                label="Specific range"
                onClick={() => setDateMode("range")}
              />
              <DateModeToggle
                active={dateMode === "flexible_month"}
                label="Flexible month"
                onClick={() => setDateMode("flexible_month")}
              />
            </div>
          )}

          {(kind === "host_offer" || dateMode === "range") && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCalendarOpen((v) => !v)}
                className={`${fieldCls} flex flex-1 items-center gap-2 text-left text-sm`}
                aria-expanded={calendarOpen}
              >
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className={range?.from ? "" : "text-muted-foreground"}>
                  {dateLabel}
                </span>
                <span className="ml-auto text-muted-foreground">
                  {calendarOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              </button>
              {range?.from && (
                <button
                  type="button"
                  aria-label="Clear dates"
                  onClick={() => setRange(undefined)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {calendarOpen && (dateMode === "range" || kind === "host_offer") && (
            <div className="overflow-hidden rounded-xl border-2 border-border bg-white p-2 shadow-sm">
              <AvailabilityCalendar
                value={range}
                onChange={(r) => {
                  setRange(r);
                  if (
                    r?.from &&
                    r?.to &&
                    r.from.getTime() !== r.to.getTime()
                  ) {
                    setCalendarOpen(false);
                  }
                }}
                blockedRanges={[]}
                numberOfMonths={1}
              />
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRange(undefined)}
                  className="font-semibold text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarOpen(false)}
                  className="font-semibold text-brand hover:underline"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {kind === "trip_wish" && dateMode === "flexible_month" && (
            <input
              className={`${fieldCls} w-full text-sm`}
              value={flexibleMonth}
              onChange={(e) => setFlexibleMonth(e.target.value)}
              placeholder="e.g. June 2026 or 2026-06"
            />
          )}
        </div>
      </Field>

      {/* Trip-only: guest count. Required — the host needs to know
          headcount upfront to judge whether the trip is a fit. */}
      {kind === "trip_wish" && (
        <Field
          label="Guest count"
          hint={
            guestCount && parseInt(guestCount, 10) > 0
              ? undefined
              : "Required — how many people are traveling"
          }
        >
          <input
            type="number"
            min={1}
            max={20}
            className={`${fieldCls} w-32 text-sm`}
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            placeholder="2"
          />
        </Field>
      )}

      {/* Host-offer: listing + hook */}
      {kind === "host_offer" && (
        <>
          <Field label="Listing">
            {myListings.length > 0 ? (
              <select
                value={listingId}
                onChange={(e) => setListingId(e.target.value)}
                className={`${fieldCls} w-full text-sm`}
              >
                {myListings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title} · {l.area_name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-muted-foreground">
                You don&apos;t have any active listings yet.
              </div>
            )}
          </Field>

          <Field label="Hook (optional)">
            <div className="space-y-2">
              <div className="flex gap-2">
                <HookToggle
                  active={hookType === "none"}
                  label="None"
                  onClick={() => setHookType("none")}
                />
                <HookToggle
                  active={hookType === "discount"}
                  label="Discount"
                  onClick={() => setHookType("discount")}
                />
                <HookToggle
                  active={hookType === "trade"}
                  label="Trade"
                  onClick={() => setHookType("trade")}
                />
              </div>
              {hookType !== "none" && (
                <input
                  className={`${fieldCls} w-full text-sm`}
                  value={hookDetails}
                  onChange={(e) => setHookDetails(e.target.value)}
                  placeholder={
                    hookType === "discount"
                      ? "e.g. 20% off weekly"
                      : "e.g. water plants + walk dog"
                  }
                />
              )}
            </div>
          </Field>
        </>
      )}

      {/* Visibility */}
      <Field label="Who can see this">
        <div className="space-y-3">
          <VisibilityRadio
            active={visibilityMode === "inherit"}
            onClick={() => setVisibilityMode("inherit")}
            label={
              kind === "trip_wish"
                ? "Inherit from your profile preview network"
                : "Inherit from this listing's preview network"
            }
            hint={`Current: ${ruleToLabel(inheritedRule)}`}
          />
          <VisibilityRadio
            active={visibilityMode === "custom"}
            onClick={() => setVisibilityMode("custom")}
            label="Customize for this post"
            hint="Choose a different audience — narrower or wider than the default."
          />

          {visibilityMode === "custom" && (
            <div className="rounded-xl border border-border bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Custom audience
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={customRuleType}
                  onChange={(e) =>
                    setCustomRuleType(e.target.value as CustomRuleType)
                  }
                  className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
                >
                  <option value="anyone_anywhere">
                    Anyone (incl. not signed in)
                  </option>
                  <option value="anyone">Anyone signed in</option>
                  <option value="min_score">Min 1° score</option>
                  <option value="max_degrees">Within N degrees of me</option>
                </select>
                {customRuleType === "min_score" && (
                  <input
                    type="number"
                    min={0}
                    className="h-10 w-24 rounded-lg border border-border bg-white px-3 text-sm"
                    value={customMinScore}
                    onChange={(e) => setCustomMinScore(e.target.value)}
                  />
                )}
                {customRuleType === "max_degrees" && (
                  <select
                    value={customMaxDegrees}
                    onChange={(e) => setCustomMaxDegrees(e.target.value)}
                    className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
                  >
                    <option value="1">Within 1° (direct)</option>
                    <option value="2">Within 2°</option>
                    <option value="3">Within 3°</option>
                  </select>
                )}
              </div>
            </div>
          )}
        </div>
      </Field>

      {/* Submit */}
      <div className="sticky bottom-4 z-10 mt-10 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="inline-flex h-12 items-center gap-2 rounded-lg bg-foreground px-6 text-sm font-semibold text-background shadow-md hover:bg-foreground/90 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Posting…" : "Post proposal"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </label>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function KindToggleButton({
  active,
  label,
  hint,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        active
          ? "flex flex-1 flex-col items-start rounded-xl border-2 border-foreground bg-foreground/5 p-4 text-left"
          : "flex flex-1 flex-col items-start rounded-xl border-2 border-border bg-white p-4 text-left hover:border-foreground/30 disabled:opacity-50"
      }
    >
      <span className="text-base font-semibold">{label}</span>
      <span className="mt-1 text-xs text-muted-foreground">{hint}</span>
    </button>
  );
}

function DateModeToggle({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex h-9 items-center rounded-full bg-foreground px-3 text-xs font-semibold text-background"
          : "inline-flex h-9 items-center rounded-full border border-border bg-white px-3 text-xs font-medium hover:bg-muted"
      }
    >
      {label}
    </button>
  );
}

function HookToggle({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex h-10 flex-1 items-center justify-center rounded-lg border-2 border-foreground bg-foreground/5 px-3 text-sm font-semibold"
          : "inline-flex h-10 flex-1 items-center justify-center rounded-lg border-2 border-border bg-white px-3 text-sm font-medium hover:border-foreground/30"
      }
    >
      {label}
    </button>
  );
}

function VisibilityRadio({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex w-full items-start gap-3 rounded-xl border-2 border-foreground bg-foreground/5 p-4 text-left"
          : "flex w-full items-start gap-3 rounded-xl border-2 border-border bg-white p-4 text-left hover:border-foreground/30"
      }
    >
      <span
        className={
          active
            ? "mt-1 block h-4 w-4 shrink-0 rounded-full border-2 border-foreground bg-foreground"
            : "mt-1 block h-4 w-4 shrink-0 rounded-full border-2 border-border"
        }
      />
      <span className="flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {hint}
        </span>
      </span>
    </button>
  );
}

function ruleToLabel(rule: AccessRule): string {
  switch (rule.type) {
    case "anyone_anywhere":
      return "Anyone (incl. not signed in)";
    case "anyone":
      return "Anyone signed in";
    case "min_score":
      return `Viewers with 1° score ≥ ${rule.threshold ?? 0}`;
    case "max_degrees":
      return `Within ${rule.threshold ?? 2}° of you`;
    case "specific_people":
      return `${rule.user_ids?.length ?? 0} specific people`;
    default:
      return "—";
  }
}

function buildCustomRule(
  type: CustomRuleType,
  minScore: string,
  maxDegrees: string
): AccessRule {
  switch (type) {
    case "anyone_anywhere":
      return { type: "anyone_anywhere" };
    case "anyone":
      return { type: "anyone" };
    case "min_score":
      return {
        type: "min_score",
        threshold: Math.max(0, parseInt(minScore || "0", 10) || 0),
      };
    case "max_degrees":
      return {
        type: "max_degrees",
        threshold: Math.max(
          1,
          Math.min(3, parseInt(maxDegrees || "2", 10) || 2)
        ),
      };
  }
}
