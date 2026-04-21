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
import { cn } from "@/lib/utils";
import {
  CANCELLATION_APPROACHES,
  CANCELLATION_PRESETS,
  approachMeta,
  buildPolicyFromPreset,
  type CancellationApproach,
  type CancellationPolicy,
  type CancellationPreset,
} from "@/lib/cancellation";
import { CancellationPolicyCard } from "./CancellationPolicyCard";

interface Props {
  bookingId: string;
  initialTotal: number | null;
  initialPolicy: CancellationPolicy;
  checkIn: string | null;
  checkOut: string | null;
  guestCount: number;
  nightlyRate: number | null;
  cleaningFee: number | null;
  guestFirstName: string;
}

const APPROACH_ICONS = {
  installments: CalendarClock,
  refunds: RotateCcw,
} as const;

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
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
  guestFirstName,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"approve" | "decline" | null>(
    null
  );
  const [editSection, setEditSection] = useState<EditSection>(null);

  // Trip state
  const [localCheckIn, setLocalCheckIn] = useState<string>(checkIn ?? "");
  const [localCheckOut, setLocalCheckOut] = useState<string>(checkOut ?? "");
  const [localGuests, setLocalGuests] = useState<number>(guestCount);

  // Total state — stored as the two underlying line items so the
  // breakdown stays editable. Total is derived, not stored separately.
  const seedCleaning = Math.max(0, Math.round(cleaningFee ?? 0));
  const derivedNightly =
    nightlyRate && nightlyRate > 0
      ? nightlyRate
      : initialTotal && nightsBetween(checkIn, checkOut) > 0
        ? Math.round(
            ((initialTotal ?? 0) - seedCleaning) /
              Math.max(1, nightsBetween(checkIn, checkOut))
          )
        : 0;
  const [nightlyStr, setNightlyStr] = useState<string>(
    derivedNightly > 0 ? String(derivedNightly) : ""
  );
  const [cleaningStr, setCleaningStr] = useState<string>(
    seedCleaning > 0 ? String(seedCleaning) : ""
  );

  // Cancellation state
  const [approach, setApproach] = useState<CancellationApproach>(
    initialPolicy.approach
  );
  const initialPreset =
    initialPolicy.preset === "custom"
      ? "moderate"
      : (initialPolicy.preset as Exclude<CancellationPreset, "custom">);
  const [preset, setPreset] =
    useState<Exclude<CancellationPreset, "custom">>(initialPreset);

  const nights = useMemo(
    () => nightsBetween(localCheckIn || null, localCheckOut || null),
    [localCheckIn, localCheckOut]
  );
  const numericNightly = Number(nightlyStr || 0) || 0;
  const numericCleaning = Number(cleaningStr || 0) || 0;
  const computedTotal =
    Math.max(0, Math.round(numericNightly)) * nights +
    Math.max(0, Math.round(numericCleaning));

  const effectivePolicy: CancellationPolicy = useMemo(
    () => buildPolicyFromPreset(approach, preset),
    [approach, preset]
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
      const res = await fetch(`/api/contact-requests/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: decision,
          ...(decision === "accepted"
            ? {
                total_price: computedTotal > 0 ? computedTotal : undefined,
                cancellation_approach: approach,
                cancellation_preset: preset,
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
        decision === "accepted"
          ? `Terms sent to ${guestFirstName}`
          : "Request declined"
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border-2 border-amber-300 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <Check className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-amber-900">
            Review &amp; send terms to {guestFirstName}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-900/80">
            Each section has its own Edit. These numbers lock when{" "}
            {guestFirstName} confirms — the reservation isn&apos;t final
            until they accept.
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FieldLabel label="Check-in">
              <input
                type="date"
                value={localCheckIn}
                onChange={(e) => setLocalCheckIn(e.target.value)}
                className={INPUT_CLS}
              />
            </FieldLabel>
            <FieldLabel label="Checkout">
              <input
                type="date"
                min={localCheckIn || undefined}
                value={localCheckOut}
                onChange={(e) => setLocalCheckOut(e.target.value)}
                className={INPUT_CLS}
              />
            </FieldLabel>
            <FieldLabel label="Guests">
              <div className="flex h-11 items-center gap-2 rounded-lg border-2 border-border bg-white px-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => setLocalGuests((g) => Math.max(1, g - 1))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
                  aria-label="Decrease guests"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="flex-1 text-center text-sm font-semibold">
                  {localGuests}
                </span>
                <button
                  type="button"
                  onClick={() => setLocalGuests((g) => g + 1)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
                  aria-label="Increase guests"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </FieldLabel>
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
                      onClick={() => setApproach(a.key)}
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
              <div className="mb-1.5 text-sm font-semibold">Preset</div>
              <div className="flex flex-wrap gap-2">
                {CANCELLATION_PRESETS.map((p) => {
                  const active = preset === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPreset(p.key)}
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
                Need a fully custom schedule? Set it on your listing
                edit page under the Cancellation tab.
              </p>
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
        <button
          type="button"
          onClick={() => send("declined")}
          disabled={submitting !== null}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
        >
          <X className="h-4 w-4" />
          {submitting === "decline" ? "Declining…" : "Decline request"}
        </button>
        <button
          type="button"
          onClick={() => send("accepted")}
          disabled={submitting !== null}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting === "approve" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Approve &amp; send terms
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Local primitives ────────────────────────────────────────────

const INPUT_CLS =
  "h-11 w-full rounded-lg border-2 border-border !bg-white px-3 text-sm font-medium shadow-sm focus:border-foreground focus:outline-none";

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
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
        $
      </span>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT_CLS} pl-7`}
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
