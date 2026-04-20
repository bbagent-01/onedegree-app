"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CANCELLATION_PRESETS,
  type CancellationPolicy,
  type CancellationPreset,
} from "@/lib/cancellation";

interface Props {
  initial: CancellationPolicy | null;
}

/**
 * Host-level cancellation policy picker. Three preset cards.
 * Selected state is the host's current default (via
 * users.cancellation_policy) — saving PUTs to
 * /api/users/cancellation-policy. Custom schedules aren't in the
 * Chunk 4 scope; if the stored preset is "custom" we still
 * highlight Moderate so the host can pick a preset to replace it.
 */
export function CancellationPolicyForm({ initial }: Props) {
  // Fall through custom (not editable here yet) to moderate for UI
  // selection purposes — the stored value is untouched until they save.
  const initialKey: Exclude<CancellationPreset, "custom"> =
    initial?.preset === "flexible" ||
    initial?.preset === "moderate" ||
    initial?.preset === "strict"
      ? initial.preset
      : "moderate";

  const [selected, setSelected] = useState<Exclude<CancellationPreset, "custom">>(
    initialKey
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/cancellation-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: selected }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Save failed (${res.status})`);
      }
      toast.success("Cancellation policy saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-3">
        {CANCELLATION_PRESETS.map((p) => {
          const isSelected = selected === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setSelected(p.key)}
              className={cn(
                "rounded-xl border-2 p-4 text-left transition",
                isSelected
                  ? "border-brand bg-brand/5"
                  : "border-border bg-white hover:border-foreground/30"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">{p.label}</div>
                {isSelected && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {p.summary}
              </p>
              <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                {p.windows.map((w, i) => (
                  <li key={i}>
                    {w.cutoff_days_before_checkin === 0
                      ? "After check-in"
                      : w.cutoff_days_before_checkin === 1
                        ? "24h before"
                        : `${w.cutoff_days_before_checkin}d before`}
                    : <span className="font-medium text-foreground">{w.refund_pct}% refund</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
        <p>
          1° B&amp;B doesn&apos;t process payments or refunds — this policy is
          a shared source of truth so hosts and guests can settle up off-platform
          with aligned expectations.
        </p>
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
    </div>
  );
}
