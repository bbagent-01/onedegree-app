"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import {
  CANCELLATION_APPROACHES,
  CANCELLATION_PRESETS,
  approachMeta,
  buildPolicyFromPreset,
  type CancellationApproach,
  type CancellationPolicy,
  type CancellationPreset,
  type PaymentScheduleEntry,
  type RefundWindow,
} from "@/lib/cancellation";
import { CancellationPolicyCard } from "./CancellationPolicyCard";
import { PaymentRows, RefundRows } from "./cancellation-row-editors";
import { AvailabilityCalendar } from "@/components/listing/availability-calendar";

interface Props {
  bookingId: string;
  initialTotal: number | null;
  initialPolicy: CancellationPolicy;
  checkIn: string | null;
  checkOut: string | null;
  guestCount: number;
  /** Listing baseline — used when creating the first offer so the
   *  nightly input starts from the host's published rate. */
  nightlyRate: number | null;
  cleaningFee: number | null;
  /** S7/040: previously-offered breakdown. In edit mode these seed
   *  the nightly + cleaning inputs so reopening Edit doesn't silently
   *  reset the host's prior offer back to the listing rate. */
  offeredNightlyRate?: number | null;
  offeredCleaningFee?: number | null;
  guestFirstName: string;
  /** S7 — "edit" mode skips the status flip (the request is already
   *  accepted/offered) and drops the "Decline request" button. The
   *  PATCH server detects already-accepted rows as an edit and
   *  stamps last_edited_at + increments edit_count. Default "create"
   *  preserves the original request → offer flow. */
  submitMode?: "create" | "edit";
  /** Called after a successful PATCH. The edit-dialog caller uses it
   *  to close the modal; the inline caller can ignore. */
  onDone?: () => void;
}

const APPROACH_ICONS = {
  installments: CalendarClock,
  refunds: RotateCcw,
} as const;

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  // check_in / check_out are bare YYYY-MM-DD date strings. `new Date(iso)`
  // UTC-coerces them and then reformats in the viewer's local TZ, which
  // drifts by one day west of UTC (e.g. Apr 24 renders as Apr 23). Parse
  // the pieces and construct a local date so the Trip section shows the
  // same dates the guest submitted and the sidebar already shows.
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function nightsBetween(from: string | null, to: string | null): number {
  if (!from || !to) return 0;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

type EditSection = "trip" | "total" | "cancellation" | null;

/**
 * Inline "Review & send terms" card with per-section editing. Each
 * section — Trip (dates + guests), Total (nightly + cleaning), and
 * Cancellation (approach + preset) — has its own Edit affordance
 * and opens into its own editable form when clicked. Only one
 * section is editable at a time to keep the card scannable.
 *
 * The host's final PATCH packages the whole offer: possibly-edited
 * dates/guest count, the computed total (nightly × nights +
 * cleaning), and the chosen approach/preset.
 *
 * FUTURE: Loren has flagged that confirmed trips should be
 * editable by either party via a propose/accept/deny flow similar
 * to reviews. Today only the host can edit via this card, and only
 * while the request is still pending. See
 * docs/BOOKING_FLOW_V2_PLAN.md under "Two-way trip edits".
 */
export function HostReviewTermsInline({
  bookingId,
  initialTotal,
  initialPolicy,
  checkIn,
  checkOut,
  guestCount,
  nightlyRate,
  cleaningFee,
  offeredNightlyRate,
  offeredCleaningFee,
  guestFirstName,
  submitMode = "create",
  onDone,
}: Props) {
  const router = useRouter();
  const isEditMode = submitMode === "edit";
  const [submitting, setSubmitting] = useState<"approve" | "decline" | null>(
    null
  );
  const [editSection, setEditSection] = useState<EditSection>(null);

  // Trip state
  const [localCheckIn, setLocalCheckIn] = useState<string>(checkIn ?? "");
  const [localCheckOut, setLocalCheckOut] = useState<string>(checkOut ?? "");
  const [localGuests, setLocalGuests] = useState<number>(guestCount);
  // Inline calendar popover — expands under the date button when the
  // host wants to change the range. Matches the Request Intro dialog
  // pattern so the picker reads consistently across the app instead
  // of falling back to the browser-native <input type="date"> popup.
  const [calendarOpen, setCalendarOpen] = useState(false);

  const tripRange: DateRange | undefined = useMemo(() => {
    const parse = (iso: string): Date | undefined => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
      const [y, m, d] = iso.split("-").map(Number);
      return new Date(y, m - 1, d);
    };
    const from = parse(localCheckIn);
    const to = parse(localCheckOut);
    if (!from) return undefined;
    return { from, to };
  }, [localCheckIn, localCheckOut]);

  const onRangeChange = (next: DateRange | undefined) => {
    if (!next?.from) {
      setLocalCheckIn("");
      setLocalCheckOut("");
      return;
    }
    setLocalCheckIn(format(next.from, "yyyy-MM-dd"));
    setLocalCheckOut(next.to ? format(next.to, "yyyy-MM-dd") : "");
    // Auto-close only after a TRUE range is picked — react-day-picker
    // sets to=from on the first click, which would slam the calendar
    // shut before the host could pick an end date.
    if (next.from && next.to && next.from.getTime() !== next.to.getTime()) {
      setCalendarOpen(false);
    }
  };

  const dateLabel = (() => {
    if (!tripRange?.from) return "Add dates";
    const fromLabel = format(tripRange.from, "MMM d");
    if (!tripRange.to) return `${fromLabel} — pick end date`;
    return `${fromLabel} – ${format(tripRange.to, "MMM d")}`;
  })();

  // Total state — stored as the two underlying line items so the
  // breakdown stays editable. Total is derived, not stored separately.
  //
  // Seed priority:
  //   1. S7/040 offered breakdown — if the booking row has stored
  //      nightly/cleaning from a prior send/edit, reuse those exactly.
  //   2. Listing baseline — create-mode starts from the host's
  //      published rate.
  //   3. Derived from total − cleaning − nights — last-resort legacy
  //      fallback for rows that predate offered_* columns.
  const seedCleaning =
    typeof offeredCleaningFee === "number"
      ? Math.max(0, Math.round(offeredCleaningFee))
      : Math.max(0, Math.round(cleaningFee ?? 0));
  const seedNights = Math.max(1, nightsBetween(checkIn, checkOut));
  const totalBackedNightly =
    initialTotal && seedNights > 0
      ? Math.max(0, Math.round((initialTotal - seedCleaning) / seedNights))
      : 0;
  const derivedNightly =
    typeof offeredNightlyRate === "number" && offeredNightlyRate >= 0
      ? offeredNightlyRate
      : submitMode === "edit"
        ? totalBackedNightly > 0
          ? totalBackedNightly
          : nightlyRate ?? 0
        : nightlyRate && nightlyRate > 0
          ? nightlyRate
          : totalBackedNightly;
  const [nightlyStr, setNightlyStr] = useState<string>(
    derivedNightly > 0 ? String(derivedNightly) : ""
  );
  const [cleaningStr, setCleaningStr] = useState<string>(
    seedCleaning > 0 ? String(seedCleaning) : ""
  );

  // Cancellation state — approach + preset drive the template, but
  // row-level edits keep their own state and flip preset to "custom"
  // so the server-side build-from-preset path is skipped.
  const [approach, setApproach] = useState<CancellationApproach>(
    initialPolicy.approach
  );
  const [preset, setPreset] = useState<CancellationPreset>(initialPolicy.preset);
  const [paymentSchedule, setPaymentSchedule] = useState<
    PaymentScheduleEntry[]
  >(initialPolicy.payment_schedule.map((e) => ({ ...e })));
  const [refundSchedule, setRefundSchedule] = useState<RefundWindow[]>(
    initialPolicy.refund_schedule.map((e) => ({ ...e }))
  );
  const [securityDeposit, setSecurityDeposit] = useState<
    PaymentScheduleEntry[]
  >(initialPolicy.security_deposit.map((e) => ({ ...e })));

  const switchApproach = (next: CancellationApproach) => {
    if (next === approach) return;
    const effectivePreset =
      preset === "custom"
        ? "moderate"
        : (preset as Exclude<CancellationPreset, "custom">);
    const tpl = buildPolicyFromPreset(next, effectivePreset);
    setApproach(next);
    setPreset(effectivePreset);
    setPaymentSchedule(tpl.payment_schedule);
    setRefundSchedule(tpl.refund_schedule);
  };

  const applyPreset = (key: Exclude<CancellationPreset, "custom">) => {
    const tpl = buildPolicyFromPreset(approach, key);
    setPreset(key);
    setPaymentSchedule(tpl.payment_schedule);
    setRefundSchedule(tpl.refund_schedule);
  };

  const markCustom = () => {
    if (preset !== "custom") setPreset("custom");
  };

  const nights = useMemo(
    () => nightsBetween(localCheckIn || null, localCheckOut || null),
    [localCheckIn, localCheckOut]
  );
  const numericNightly = Number(nightlyStr || 0) || 0;
  const numericCleaning = Number(cleaningStr || 0) || 0;
  const computedTotal =
    Math.max(0, Math.round(numericNightly)) * nights +
    Math.max(0, Math.round(numericCleaning));

  // Effective policy always reflects the live state, whether the
  // host stayed on a preset or started editing rows directly.
  const effectivePolicy: CancellationPolicy = useMemo(
    () => ({
      approach,
      preset,
      payment_schedule: paymentSchedule,
      refund_schedule: refundSchedule,
      security_deposit: securityDeposit,
      custom_note: null,
    }),
    [approach, preset, paymentSchedule, refundSchedule, securityDeposit]
  );

  const approachLabel = approachMeta(approach).title;
  const presetName =
    CANCELLATION_PRESETS.find((p) => p.key === preset)?.label ?? preset;

  const toggleSection = (section: Exclude<EditSection, null>) => {
    setEditSection((prev) => (prev === section ? null : section));
  };

  const send = async (decision: "accepted" | "declined") => {
    setSubmitting(decision === "accepted" ? "approve" : "decline");
    try {
      // When preset is a named template (flexible/moderate/strict),
      // send just approach + preset — server rebuilds from the
      // template. When preset is "custom" (row-level edits), send
      // the full schedule payload so the host's rows are preserved.
      const policyPayload =
        preset === "custom"
          ? {
              cancellation_approach: approach,
              cancellation_preset: "custom" as const,
              cancellation_policy: {
                approach,
                preset: "custom" as const,
                payment_schedule: paymentSchedule,
                refund_schedule: refundSchedule,
                security_deposit: securityDeposit,
                custom_note: null,
              },
            }
          : {
              cancellation_approach: approach,
              cancellation_preset: preset,
            };

      const res = await fetch(`/api/contact-requests/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Edit mode omits status — the server keeps status=accepted
          // and just diff-updates the other fields. Create mode sends
          // the initial accept/decline transition.
          ...(isEditMode ? {} : { status: decision }),
          ...(decision === "accepted"
            ? {
                total_price: computedTotal > 0 ? computedTotal : undefined,
                // S7/040: send the per-line offered values too so the
                // guest-side card renders a real breakdown instead of
                // deriving a lump Discount from listing defaults.
                nightly_rate: Math.max(0, Math.round(numericNightly)),
                cleaning_fee: Math.max(0, Math.round(numericCleaning)),
                ...policyPayload,
                check_in: localCheckIn || undefined,
                check_out: localCheckOut || undefined,
                guest_count: localGuests,
              }
            : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      toast.success(
        isEditMode
          ? "Terms updated"
          : decision === "accepted"
            ? `Terms sent to ${guestFirstName}`
            : "Request declined"
      );
      onDone?.();
      // RSC refresh + client-side refetch of the inbox thread. The
      // InboxShell listens for this custom event and re-pulls the
      // thread via /api/inbox/thread/[id] so the review card
      // unmounts and the terms_offered message renders immediately.
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inbox:thread-refresh"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      // Always reset the spinner — on success the card usually
      // unmounts, but this guards against the "stuck spinner"
      // bug Loren hit when router.refresh was slow.
      setSubmitting(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border-2 border-amber-400/50/40 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-amber-400/50/30 bg-amber-400/10 p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-200">
          <Check className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-amber-100">
            {isEditMode
              ? `Edit terms for ${guestFirstName}`
              : `Review & send terms to ${guestFirstName}`}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-100/80">
            {isEditMode
              ? `${guestFirstName} hasn't accepted yet, so you can still update any section. Saving reposts the terms with a note about what changed.`
              : `Each section has its own Edit. These numbers lock when ${guestFirstName} confirms — the reservation isn't final until they accept.`}
          </p>
        </div>
      </div>

      {/* Trip section */}
      <Section
        icon={CalendarDays}
        title="Trip"
        editing={editSection === "trip"}
        onEditToggle={() => toggleSection("trip")}
      >
        {editSection === "trip" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
              <FieldLabel label="Dates">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCalendarOpen((v) => !v)}
                    aria-expanded={calendarOpen}
                    className="flex h-14 flex-1 items-center gap-2 rounded-xl border-2 border-border !bg-white px-4 text-left text-base font-medium shadow-sm transition hover:bg-muted/30 focus:border-foreground/60 focus:outline-none"
                  >
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span
                      className={
                        tripRange?.from ? "" : "text-muted-foreground"
                      }
                    >
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
                  {tripRange?.from && (
                    <button
                      type="button"
                      aria-label="Clear dates"
                      onClick={() => {
                        setLocalCheckIn("");
                        setLocalCheckOut("");
                      }}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </FieldLabel>
              <FieldLabel label="Guests">
                <div className="flex h-14 items-center gap-2 rounded-xl border-2 border-border bg-white px-3 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setLocalGuests((g) => Math.max(1, g - 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
                    aria-label="Decrease guests"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="flex-1 text-center text-base font-semibold">
                    {localGuests}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLocalGuests((g) => g + 1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
                    aria-label="Increase guests"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </FieldLabel>
            </div>
            {/* Inline expandable calendar. blockedRanges left empty —
                the host is picking dates they're offering, not
                filtering against availability at this stage. */}
            {calendarOpen && (
              <div className="overflow-hidden rounded-xl border-2 border-border bg-white p-2 shadow-sm">
                <AvailabilityCalendar
                  value={tripRange}
                  onChange={onRangeChange}
                  blockedRanges={[]}
                  numberOfMonths={1}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <RowKV k="Check-in" v={fmtDate(localCheckIn || null)} />
            <RowKV k="Checkout" v={fmtDate(localCheckOut || null)} />
            <RowKV
              k="Guests"
              v={`${localGuests} guest${localGuests === 1 ? "" : "s"}`}
            />
          </div>
        )}
      </Section>

      {/* Total section */}
      <Section
        icon={Receipt}
        title="Total for this stay"
        editing={editSection === "total"}
        onEditToggle={() => toggleSection("total")}
      >
        {editSection === "total" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldLabel label="Nightly rate">
                <PriceInput value={nightlyStr} onChange={setNightlyStr} />
              </FieldLabel>
              <FieldLabel label="Cleaning fee">
                <PriceInput value={cleaningStr} onChange={setCleaningStr} />
              </FieldLabel>
            </div>
            <div className="space-y-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
              <Breakdown
                k={`$${numericNightly || 0} × ${nights} night${nights === 1 ? "" : "s"}`}
                v={`$${(numericNightly * nights).toLocaleString()}`}
              />
              {numericCleaning > 0 && (
                <Breakdown
                  k="Cleaning fee"
                  v={`$${numericCleaning.toLocaleString()}`}
                />
              )}
              <div className="mt-1 flex items-center justify-between border-t border-border pt-1 text-sm font-semibold">
                <span>Total</span>
                <span>${computedTotal.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Nights follow the dates above. Edit dates in the Trip
              section to change the night count.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-base font-semibold">
              {computedTotal > 0 ? (
                `$${computedTotal.toLocaleString()}`
              ) : (
                <span className="text-sm font-medium text-muted-foreground">
                  No total yet — click Edit to set one.
                </span>
              )}
            </div>
            {computedTotal > 0 && (
              <div className="space-y-0.5 text-xs text-muted-foreground">
                {numericNightly > 0 && nights > 0 && (
                  <Breakdown
                    k={`$${numericNightly} × ${nights} night${nights === 1 ? "" : "s"}`}
                    v={`$${(numericNightly * nights).toLocaleString()}`}
                  />
                )}
                {numericCleaning > 0 && (
                  <Breakdown
                    k="Cleaning fee"
                    v={`$${numericCleaning.toLocaleString()}`}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Cancellation section */}
      <Section
        icon={ShieldCheck}
        title="Cancellation & payment"
        editing={editSection === "cancellation"}
        onEditToggle={() => toggleSection("cancellation")}
      >
        {editSection === "cancellation" ? (
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-sm font-semibold">Approach</div>
              <div className="grid gap-2 md:grid-cols-2">
                {CANCELLATION_APPROACHES.map((a) => {
                  const Icon = APPROACH_ICONS[a.key];
                  const active = approach === a.key;
                  return (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => switchApproach(a.key)}
                      className={cn(
                        "rounded-xl border-2 p-3 text-left transition",
                        active
                          ? "border-brand bg-brand/5"
                          : "border-border bg-white hover:border-foreground/30"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <div className="text-sm font-semibold">{a.title}</div>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {a.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                Preset
                {preset === "custom" && (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--tt-cream-muted)]">
                    Custom
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {CANCELLATION_PRESETS.map((p) => {
                  const active = preset === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => applyPreset(p.key)}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-sm font-semibold transition",
                        active
                          ? "border-brand bg-brand text-white"
                          : "border-border bg-white text-foreground hover:border-foreground/30"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Edit rows below to customize — any change flips the
                preset to Custom.
              </p>
            </div>

            {/* Payment schedule editor — always shown */}
            <div>
              <div className="text-sm font-semibold">Payment schedule</div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {approach === "installments"
                  ? "Each row is an installment. Collect when each step is reached."
                  : "Under the refunds approach, the whole balance is typically collected at booking."}
              </p>
              <PaymentRows
                rows={paymentSchedule}
                onChange={(next) => {
                  setPaymentSchedule(next);
                  markCustom();
                }}
                addLabel="Add payment step"
              />
            </div>

            {/* Refund schedule editor — only when approach = refunds */}
            {approach === "refunds" && (
              <div>
                <div className="text-sm font-semibold">Refund schedule</div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  How much of the already-collected money is refunded
                  if the guest cancels. First row is the most generous
                  window.
                </p>
                <RefundRows
                  rows={refundSchedule}
                  onChange={(next) => {
                    setRefundSchedule(next);
                    markCustom();
                  }}
                />
              </div>
            )}

            {/* Security deposit — optional */}
            <div>
              <div className="text-sm font-semibold">
                Security deposit{" "}
                <span className="text-[11px] font-normal text-muted-foreground">
                  optional
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                A refundable hold collected alongside payment. Leave empty to skip.
              </p>
              <PaymentRows
                rows={securityDeposit}
                onChange={(next) => {
                  setSecurityDeposit(next);
                  markCustom();
                }}
                addLabel="Add deposit step"
                emptyHint="No deposit."
              />
            </div>

            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Preview
              </div>
              <CancellationPolicyCard
                policy={effectivePolicy}
                scope="reservation"
              />
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {approachLabel} · {presetName}
            </div>
            <CancellationPolicyCard
              policy={effectivePolicy}
              scope="reservation"
            />
          </div>
        )}
      </Section>

      <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 p-4 sm:flex-row sm:justify-between">
        {!isEditMode && (
          <button
            type="button"
            onClick={() => send("declined")}
            disabled={submitting !== null}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-400/10 disabled:opacity-60"
          >
            <X className="h-4 w-4" />
            {submitting === "decline" ? "Declining…" : "Decline request"}
          </button>
        )}
        {isEditMode && onDone && (
          <button
            type="button"
            onClick={onDone}
            disabled={submitting !== null}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={() => send("accepted")}
          disabled={submitting !== null}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting === "approve" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEditMode ? "Saving…" : "Sending…"}
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              {isEditMode ? "Save changes" : "Approve & send terms"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Local primitives ────────────────────────────────────────────

// Matches the listing-creation form-field pattern (h-14, rounded-xl,
// border-2, !bg-white, px-4, shadow-sm, font-medium) so the Trip /
// Total edit fields don't stick out vs the rest of the app's forms.
// Loren's memory: all form fields follow this shape.
const INPUT_CLS =
  "h-14 w-full rounded-xl border-2 border-border !bg-white px-4 text-base font-medium shadow-sm focus:border-foreground focus:outline-none";

function Section({
  icon: Icon,
  title,
  editing,
  onEditToggle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  editing: boolean;
  onEditToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3 w-3" />
          {title}
        </div>
        <button
          type="button"
          onClick={onEditToggle}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition",
            editing
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-white text-foreground hover:bg-muted"
          )}
        >
          {editing ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Done
            </>
          ) : (
            <>
              <Pencil className="h-3 w-3" />
              Edit
            </>
          )}
        </button>
      </div>
      {children}
      {editing && (
        <div className="mt-2 hidden" aria-hidden>
          {/* anchor for future scroll-into-view */}
          <ChevronDown className="h-3 w-3" />
        </div>
      )}
    </section>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function PriceInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium text-muted-foreground">
        $
      </span>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT_CLS} pl-8`}
      />
    </div>
  );
}

function RowKV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{k}</div>
      <div className="mt-0.5 text-sm font-semibold">{v}</div>
    </div>
  );
}

function Breakdown({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}
