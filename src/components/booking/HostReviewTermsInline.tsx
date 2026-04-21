"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  Check,
  Loader2,
  Pencil,
  Receipt,
  RotateCcw,
  Users,
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
  /** Initial total from the original request. Editable by the host. */
  initialTotal: number | null;
  /** Currently-resolved policy (listing override → host default) —
   *  seeds both the read view and the editor so the host isn't
   *  starting from scratch. */
  initialPolicy: CancellationPolicy;
  /** Date range from the original request — read-only here; edits
   *  happen via a separate message thread conversation. */
  checkIn: string | null;
  checkOut: string | null;
  /** Guest count on the original request — read-only. */
  guestCount: number;
  /** Listing nightly rate — read-only. Drives the breakdown line. */
  nightlyRate: number | null;
  /** Flat cleaning fee the guest was charged (USD, whole dollars).
   *  Null/0 hides the breakdown line. */
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

/**
 * Inline "Review & send terms" card. Default view is a read-only
 * summary of the request (dates, guests, total, cancellation
 * policy) so the host can scan + approve without wading through
 * editor chrome. Clicking "Edit terms" reveals the total input +
 * approach toggle + preset pills in-place.
 *
 * Dates + guests are NOT host-editable — those belong to the
 * guest's request and editing them feels like a different negotiation.
 * Total price and cancellation approach/preset are editable because
 * those are the host's judgment call per-reservation.
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
  const [editing, setEditing] = useState(false);
  const [totalStr, setTotalStr] = useState<string>(
    initialTotal && initialTotal > 0 ? String(initialTotal) : ""
  );
  const [approach, setApproach] = useState<CancellationApproach>(
    initialPolicy.approach
  );
  const initialPreset =
    initialPolicy.preset === "custom"
      ? "moderate"
      : (initialPolicy.preset as Exclude<CancellationPreset, "custom">);
  const [preset, setPreset] =
    useState<Exclude<CancellationPreset, "custom">>(initialPreset);

  // Policy that will be sent when the host approves. Always reflects
  // the current approach + preset, whether the editor is open or not.
  const effectivePolicy: CancellationPolicy = useMemo(
    () => buildPolicyFromPreset(approach, preset),
    [approach, preset]
  );

  const numericTotal = totalStr.trim() ? Number(totalStr.trim()) : null;
  const hasTotal = numericTotal !== null && Number.isFinite(numericTotal) && numericTotal > 0;
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const a = new Date(checkIn).getTime();
    const b = new Date(checkOut).getTime();
    return Math.max(0, Math.round((b - a) / 86_400_000));
  }, [checkIn, checkOut]);
  const approachLabel = approachMeta(approach).title;
  const presetName =
    CANCELLATION_PRESETS.find((p) => p.key === preset)?.label ?? preset;

  const send = async (decision: "accepted" | "declined") => {
    setSubmitting(decision === "accepted" ? "approve" : "decline");
    try {
      if (
        decision === "accepted" &&
        totalStr.trim() &&
        (!Number.isFinite(numericTotal) || (numericTotal as number) < 0)
      ) {
        throw new Error("Total price must be a non-negative number");
      }
      const res = await fetch(`/api/contact-requests/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: decision,
          ...(decision === "accepted"
            ? {
                total_price: numericTotal ?? undefined,
                cancellation_approach: approach,
                cancellation_preset: preset,
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
      <div className="flex items-start justify-between gap-3 border-b border-amber-200 bg-amber-50 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <Check className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-amber-900">
              Review &amp; send terms to {guestFirstName}
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-900/80">
              These numbers lock when {guestFirstName} confirms. The
              reservation isn&apos;t final until they accept.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
            editing
              ? "border-amber-900 bg-amber-900 text-amber-50 hover:bg-amber-900"
              : "border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
          )}
        >
          <Pencil className="h-3 w-3" />
          {editing ? "Done editing" : "Edit terms"}
        </button>
      </div>

      {/* Trip summary — dates + guests always read-only. */}
      <div className="grid grid-cols-1 divide-y divide-border border-b border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            Check-in
          </div>
          <div className="mt-0.5 text-sm font-semibold">{fmtDate(checkIn)}</div>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            Checkout
          </div>
          <div className="mt-0.5 text-sm font-semibold">{fmtDate(checkOut)}</div>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="h-3 w-3" />
            Guests
          </div>
          <div className="mt-0.5 text-sm font-semibold">
            {guestCount} guest{guestCount === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {/* Total — read in summary mode, input in edit mode. */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Receipt className="h-3 w-3" />
          Total for this stay
        </div>
        {editing ? (
          <div className="mt-1">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                $
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={totalStr}
                onChange={(e) => setTotalStr(e.target.value)}
                placeholder="e.g. 450"
                className="h-11 w-full rounded-lg border-2 border-border !bg-white pl-7 pr-3 text-sm font-medium shadow-sm focus:border-foreground focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Leave blank to keep {guestFirstName}&apos;s submitted estimate.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-0.5 text-base font-semibold">
              {hasTotal ? (
                `$${Math.round(numericTotal as number).toLocaleString()}`
              ) : (
                <span className="text-sm font-medium text-muted-foreground">
                  No total yet — click &ldquo;Edit terms&rdquo; to add one.
                </span>
              )}
            </div>
            {hasTotal && (nightlyRate || (cleaningFee ?? 0) > 0) && (
              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {nightlyRate && nights > 0 && (
                  <div className="flex items-center justify-between">
                    <span>
                      ${nightlyRate} × {nights} night{nights === 1 ? "" : "s"}
                    </span>
                    <span>
                      ${(nightlyRate * nights).toLocaleString()}
                    </span>
                  </div>
                )}
                {cleaningFee && cleaningFee > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Cleaning fee</span>
                    <span>${cleaningFee.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Cancellation approach + preset. Edit mode exposes the
          selectors; summary mode shows the resulting policy card. */}
      <div className="p-4">
        {editing ? (
          <div className="space-y-4">
            <section>
              <div className="mb-1.5 text-sm font-semibold">
                Cancellation approach
              </div>
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
            </section>

            <section>
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
                Need a fully custom schedule? Set it on your listing edit
                page under the Cancellation tab — your overrides apply
                automatically to new requests.
              </p>
            </section>

            <section>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Preview
              </div>
              <CancellationPolicyCard
                policy={effectivePolicy}
                scope="reservation"
              />
            </section>
          </div>
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Cancellation &amp; payment — {approachLabel}, {presetName}
              </div>
            </div>
            <CancellationPolicyCard
              policy={effectivePolicy}
              scope="reservation"
            />
          </div>
        )}
      </div>

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
