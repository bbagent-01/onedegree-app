"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CancellationPolicyForm } from "@/components/settings/cancellation-policy-form";
import { CancellationPolicyCard } from "@/components/booking/CancellationPolicyCard";
import {
  DEFAULT_CANCELLATION_APPROACH,
  DEFAULT_CANCELLATION_PRESET,
  buildPolicyFromPreset,
  type CancellationPolicy,
} from "@/lib/cancellation";
import { cn } from "@/lib/utils";

interface Props {
  listingId: string;
  /** The host's default policy — shown as the "inherit" preview. */
  hostDefault: CancellationPolicy;
  /** Listing-level override if one is set. null means "inherit host default". */
  initialOverride: CancellationPolicy | null;
}

/**
 * Listing-level cancellation & payment override.
 *
 * Two modes:
 *   "inherit"  — shows a read-only preview of the host default. DELETE
 *                against the override endpoint to reset if needed.
 *   "override" — renders the full CancellationPolicyForm bound to the
 *                listing-scoped PUT endpoint.
 *
 * Decision was to keep a single toggle instead of always rendering the
 * form — the common case is "inherit", so the form only appears when
 * the host explicitly wants a listing-specific policy.
 */
export function ListingCancellationOverride({
  listingId,
  hostDefault,
  initialOverride,
}: Props) {
  const [override, setOverride] = useState<CancellationPolicy | null>(
    initialOverride
  );
  const [mode, setMode] = useState<"inherit" | "override">(
    initialOverride ? "override" : "inherit"
  );
  const [clearing, setClearing] = useState(false);

  // Seed for the override form when flipping to override mode. Use the
  // existing override if present, otherwise start from the host's
  // default so the host edits *their own* policy rather than a generic
  // platform template.
  const seed =
    override ??
    (hostDefault ??
      buildPolicyFromPreset(
        DEFAULT_CANCELLATION_APPROACH,
        DEFAULT_CANCELLATION_PRESET
      ));

  const switchToOverride = () => {
    setMode("override");
  };

  const clearOverride = async () => {
    setClearing(true);
    try {
      const res = await fetch(
        `/api/listings/${listingId}/cancellation-policy`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(err.error ?? `Failed (${res.status})`);
      }
      setOverride(null);
      setMode("inherit");
      toast.success("Listing reverted to your host default");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't reset");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
        <p className="text-sm font-semibold text-amber-100">
          Trustead doesn&apos;t process payments or manage refunds.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
          This listing can use your host default, or an override that
          only applies to this place. Either way, payment and refunds
          happen directly between you and your guest.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ModeCard
          active={mode === "inherit"}
          onClick={() => {
            if (mode !== "inherit" && override) {
              // Don't silently drop an override — make the host click
              // "Revert to host default" explicitly via the button.
              return;
            }
            setMode("inherit");
          }}
          title="Use my host default"
          description="Your policy on Settings → Hosting applies to this listing. Changes there affect this listing automatically."
          disabled={mode === "inherit"}
        />
        <ModeCard
          active={mode === "override"}
          onClick={switchToOverride}
          title="Override for this listing"
          description="Set a policy that only applies to this place. Future edits to your host default won't affect this listing."
        />
      </div>

      {mode === "inherit" ? (
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Currently applies to this listing (host default)
          </div>
          <CancellationPolicyCard policy={hostDefault} scope="listing" />
        </div>
      ) : (
        <OverrideEditor
          listingId={listingId}
          seed={seed}
          override={override}
          clearing={clearing}
          onClear={clearOverride}
          onSaved={setOverride}
        />
      )}
    </div>
  );
}

function OverrideEditor({
  listingId,
  seed,
  override,
  clearing,
  onClear,
  onSaved,
}: {
  listingId: string;
  seed: CancellationPolicy;
  override: CancellationPolicy | null;
  clearing: boolean;
  onClear: () => void;
  onSaved: (policy: CancellationPolicy) => void;
}) {
  // Mirror the form's live state so the preview below the controls
  // updates as the host edits — without waiting for a save.
  const [livePolicy, setLivePolicy] = useState<CancellationPolicy>(seed);

  return (
    <div>
      {override && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            This listing currently has its own override. Revert to
            fall back on your host default.
          </p>
          <Button
            variant="outline"
            onClick={onClear}
            disabled={clearing}
            className="h-9 shrink-0 rounded-lg text-xs font-semibold"
          >
            {clearing ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Reverting…
              </>
            ) : (
              "Revert to host default"
            )}
          </Button>
        </div>
      )}
      <CancellationPolicyForm
        initial={seed}
        endpoint={`/api/listings/${listingId}/cancellation-policy`}
        suppressPlatformBanner
        onSaved={onSaved}
        onChange={setLivePolicy}
      />

      {/* Live preview. Mirrors the inherit-mode preview but reflects
          the current editor state so the host can see guest-facing
          output before they hit Save. */}
      <div className="mt-8">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Preview — how guests will see this
        </div>
        <CancellationPolicyCard policy={livePolicy} scope="listing" />
      </div>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  title,
  description,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled && active}
      className={cn(
        "rounded-xl border-2 p-4 text-left transition",
        active
          ? "border-brand bg-brand/5"
          : "border-border bg-white hover:border-foreground/30"
      )}
    >
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </button>
  );
}
