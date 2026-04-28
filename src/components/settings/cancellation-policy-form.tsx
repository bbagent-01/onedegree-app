"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Loader2,
  CalendarClock,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CANCELLATION_APPROACHES,
  CANCELLATION_PRESETS,
  PLATFORM_NEUTRALITY_NOTE,
  buildPolicyFromPreset,
  type CancellationApproach,
  type CancellationPolicy,
  type CancellationPreset,
  type PaymentScheduleEntry,
  type RefundWindow,
} from "@/lib/cancellation";
import {
  PaymentRows,
  RefundRows,
} from "@/components/booking/cancellation-row-editors";

interface Props {
  initial: CancellationPolicy | null;
  /**
   * API endpoint to PUT the policy payload. Defaults to the
   * host-default route so existing call sites don't need to change.
   * Listing-override callers pass a listing-scoped URL.
   */
  endpoint?: string;
  /**
   * Hide the amber platform-neutrality banner. The /settings/hosting
   * page is where the banner lives canonically; when the same editor
   * appears on a listing edit page (underneath the host-defaults one),
   * re-rendering the banner is noise.
   */
  suppressPlatformBanner?: boolean;
  /** Optional callback once a save succeeds. */
  onSaved?: (policy: CancellationPolicy) => void;
  /**
   * Fires on every state change so a parent can render a live
   * preview. The payload matches the value that would be saved if
   * the host clicked Save right now.
   */
  onChange?: (policy: CancellationPolicy) => void;
}

/**
 * Host-level cancellation + payment editor with the two-approach
 * toggle at the top. Changing the approach re-applies the preset
 * template for that approach so the rows stay coherent. Any row-
 * level edit flips `preset` to "custom" so save-time intent is
 * preserved.
 */
export function CancellationPolicyForm({
  initial,
  endpoint = "/api/users/cancellation-policy",
  suppressPlatformBanner = false,
  onSaved,
  onChange,
}: Props) {
  const seed =
    initial ?? buildPolicyFromPreset("installments", "moderate");

  const [approach, setApproach] = useState<CancellationApproach>(seed.approach);
  const [preset, setPreset] = useState<CancellationPreset>(seed.preset);
  const [payment, setPayment] = useState<PaymentScheduleEntry[]>(
    seed.payment_schedule.map((e) => ({ ...e }))
  );
  const [refunds, setRefunds] = useState<RefundWindow[]>(
    seed.refund_schedule.map((e) => ({ ...e }))
  );
  const [deposit, setDeposit] = useState<PaymentScheduleEntry[]>(
    seed.security_deposit.map((e) => ({ ...e }))
  );
  const [customNote, setCustomNote] = useState<string>(
    seed.custom_note ?? ""
  );
  const [saving, setSaving] = useState(false);

  // Emit live state so a parent (e.g. listing-override wrapper) can
  // render a CancellationPolicyCard preview that updates as the
  // host edits. Fires on mount too so the first preview matches
  // the seeded state.
  useEffect(() => {
    onChange?.({
      approach,
      preset,
      payment_schedule: payment,
      refund_schedule: refunds,
      security_deposit: deposit,
      custom_note: customNote.trim() || null,
    });
    // onChange identity isn't part of the data dependency — re-
    // emitting when the handler changes would double-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approach, preset, payment, refunds, deposit, customNote]);

  const switchApproach = (next: CancellationApproach) => {
    if (next === approach) return;
    // Apply the same preset under the new approach so the rows
    // update coherently. Host can edit from there.
    const effectivePreset =
      preset === "custom" ? "moderate" : (preset as Exclude<CancellationPreset, "custom">);
    const tpl = buildPolicyFromPreset(next, effectivePreset, {
      securityDeposit: deposit,
      customNote,
    });
    setApproach(next);
    setPreset(effectivePreset);
    setPayment(tpl.payment_schedule);
    setRefunds(tpl.refund_schedule);
  };

  const applyPreset = (key: Exclude<CancellationPreset, "custom">) => {
    const tpl = buildPolicyFromPreset(approach, key, {
      securityDeposit: deposit,
      customNote,
    });
    setPreset(key);
    setPayment(tpl.payment_schedule);
    setRefunds(tpl.refund_schedule);
  };

  const markCustom = () => {
    if (preset !== "custom") setPreset("custom");
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approach,
          preset,
          payment_schedule: payment,
          refund_schedule: refunds,
          security_deposit: deposit,
          custom_note: customNote.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Save failed (${res.status})`);
      }
      toast.success("Saved");
      onSaved?.({
        approach,
        preset,
        payment_schedule: payment,
        refund_schedule: refunds,
        security_deposit: deposit,
        custom_note: customNote.trim() || null,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Platform-neutrality banner — most prominent element on the page.
          Suppressed when this editor renders nested inside a listing
          edit form where the banner would duplicate one already on screen. */}
      {!suppressPlatformBanner && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Trustead doesn&apos;t process payments or manage refunds.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
            This is guidance hosts and guests share to set expectations.
            Every payment and refund happens directly between you — no
            money ever touches the platform.
          </p>
        </div>
      )}

      {/* Approach toggle — large, obvious choice */}
      <section>
        <h3 className="text-sm font-semibold">Choose your approach</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Two common ways hosts handle payment + cancellation. Pick
          the one that matches how you actually collect money.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {CANCELLATION_APPROACHES.map((a) => (
            <ApproachCard
              key={a.key}
              active={approach === a.key}
              onClick={() => switchApproach(a.key)}
              icon={a.key === "installments" ? CalendarClock : RotateCcw}
              title={a.title}
              description={a.description}
            />
          ))}
        </div>
      </section>

      {/* Preset picker */}
      <section>
        <h3 className="text-sm font-semibold">Start from a template</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Picks a preset for your approach. Edit the rows below to
          customize — any change saves under the &ldquo;Custom&rdquo; label.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {CANCELLATION_PRESETS.map((p) => {
            const isActive = preset === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition",
                  isActive
                    ? "border-brand bg-brand/5"
                    : "border-border bg-white hover:border-foreground/30"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{p.label}</div>
                  {isActive && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {p.summary[approach]}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Payment schedule editor (always shown) */}
      <section>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Payment schedule</h3>
          {preset === "custom" && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
              Custom
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {approach === "installments"
            ? "Each row is an installment. Collect when each step is reached."
            : "Under the refunds approach, the entire balance is typically collected at time of booking."}
        </p>
        <PaymentRows
          rows={payment}
          onChange={(next) => {
            setPayment(next);
            markCustom();
          }}
          addLabel="Add payment step"
        />
      </section>

      {/* Refund schedule editor (only when approach = refunds) */}
      {approach === "refunds" && (
        <section>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Refund schedule</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            If the guest cancels, how much of the money you already
            collected gets refunded. Read top-down: first row is the
            most generous window, last row is the latest cutoff.
          </p>
          <RefundRows
            rows={refunds}
            onChange={(next) => {
              setRefunds(next);
              markCustom();
            }}
          />
        </section>
      )}

      {/* Security deposit editor */}
      <section>
        <h3 className="text-sm font-semibold">
          Security deposit{" "}
          <span className="text-xs font-normal text-muted-foreground">
            optional
          </span>
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          A refundable hold collected alongside payment. Leave empty to skip.
        </p>
        <PaymentRows
          rows={deposit}
          onChange={(next) => {
            setDeposit(next);
            markCustom();
          }}
          addLabel="Add deposit step"
          emptyHint="No deposit."
        />
      </section>

      {/* Custom note */}
      <section>
        <label htmlFor="policy-note" className="text-sm font-semibold">
          Note to guests{" "}
          <span className="text-xs font-normal text-muted-foreground">
            optional
          </span>
        </label>
        <textarea
          id="policy-note"
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
          placeholder="e.g. Venmo preferred. Deposit returned within 48h of checkout."
          rows={3}
          className="mt-2 w-full rounded-xl border-2 border-border !bg-white px-4 py-3 text-sm font-medium shadow-sm focus-visible:border-brand focus-visible:outline-none"
        />
      </section>

      {/* Save row */}
      <div className="flex justify-end rounded-xl border border-border bg-muted/30 p-4">
        <Button onClick={save} disabled={saving} className="shrink-0">
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save policy"
          )}
        </Button>
      </div>

      {/* Footer note, mirrors the top banner so it lives near the Save */}
      <p className="text-[11px] text-muted-foreground">
        {PLATFORM_NEUTRALITY_NOTE}
      </p>
    </div>
  );
}

// ── Approach card ──

function ApproachCard({
  active,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-xl border-2 p-4 text-left transition",
        active
          ? "border-brand bg-brand/5"
          : "border-border bg-white hover:border-foreground/30"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          active ? "bg-brand text-white" : "bg-muted text-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">{title}</div>
          {active && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
              <Check className="h-3 w-3" />
            </div>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </button>
  );
}

