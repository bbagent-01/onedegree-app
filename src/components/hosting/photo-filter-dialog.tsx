"use client";

// CC-C10a: filter dialog shared by the "new upload" and "edit existing"
// entry points. Takes a source image (File for new uploads, URL for
// re-edits), shows side-by-side before/after, lets the host pick a
// preset or tweak sliders, and returns either a filtered JPEG blob or
// null (meaning "no filter / restore original").

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  IDENTITY_SETTINGS,
  type FilterPreset,
  type FilterSettings,
  isIdentity,
} from "@/lib/photo-filter/types";
import {
  PRESET_LABELS,
  PRESET_ORDER,
  detectPreset,
  settingsForPreset,
} from "@/lib/photo-filter/presets";
import { renderFiltered } from "@/lib/photo-filter/engine";
import {
  PREVIEW_DIM,
  bitmapFromFile,
  bitmapFromUrl,
  fitDims,
  previewBitmap,
  renderFilteredJpeg,
} from "@/lib/photo-filter/pipeline";

export interface FilterResult {
  /** Non-null when the user chose any non-identity filter. */
  filteredBlob: Blob | null;
  preset: FilterPreset | null;
  settings: FilterSettings | null;
}

type Source =
  | { kind: "file"; file: File }
  | { kind: "url"; url: string };

interface Props {
  open: boolean;
  /** Source image to filter. `file` for fresh uploads, `url` for re-edits. */
  source: Source | null;
  /** Pre-selected preset (re-edit case). Defaults to "natural" for new uploads. */
  initialPreset?: FilterPreset | null;
  initialSettings?: FilterSettings | null;
  /** Whether the source image already has a filter on file. Enables the
   *  "Remove filter" path which returns { filteredBlob: null } + lets the
   *  caller nuke stored filter metadata. */
  allowReset?: boolean;
  onSave: (result: FilterResult) => Promise<void> | void;
  onCancel: () => void;
}

interface SliderConfig {
  key: keyof FilterSettings;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

const SLIDERS: SliderConfig[] = [
  { key: "brightness", label: "Brightness", min: -100, max: 100, step: 1 },
  { key: "contrast", label: "Contrast", min: -100, max: 100, step: 1 },
  { key: "saturation", label: "Saturation", min: -100, max: 100, step: 1 },
  { key: "white_balance", label: "White balance", min: -1000, max: 1000, step: 50, unit: "K" },
  { key: "tint", label: "Tint", min: -100, max: 100, step: 1 },
  { key: "shadow_lift", label: "Shadow lift", min: 0, max: 100, step: 1 },
  { key: "highlight_recovery", label: "Highlight recovery", min: 0, max: 100, step: 1 },
];

type Tab = "original" | "filtered";

export function PhotoFilterDialog({
  open,
  source,
  initialPreset,
  initialSettings,
  allowReset = false,
  onSave,
  onCancel,
}: Props) {
  const [preset, setPreset] = useState<FilterPreset>(
    initialPreset ?? "natural"
  );
  const [settings, setSettings] = useState<FilterSettings>(
    initialSettings ?? settingsForPreset(initialPreset ?? "natural")
  );
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("filtered");

  // Preview canvases. "original" is the downscaled source (drawn once).
  // "filtered" is redrawn from `originalPreview` whenever settings change.
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const filteredCanvasRef = useRef<HTMLDivElement | null>(null);
  const originalPreviewRef = useRef<HTMLCanvasElement | null>(null);

  // Reset state when a new source arrives.
  useEffect(() => {
    if (!open || !source) return;
    setLoading(true);
    setBitmap(null);
    setTab("filtered");
    const next = initialPreset ?? "natural";
    setPreset(next);
    setSettings(initialSettings ?? settingsForPreset(next));

    let cancelled = false;
    const load = async () => {
      try {
        const bmp =
          source.kind === "file"
            ? await bitmapFromFile(source.file)
            : await bitmapFromUrl(source.url);
        if (cancelled) {
          bmp.close?.();
          return;
        }
        setBitmap(bmp);
        originalPreviewRef.current = previewBitmap(bmp, PREVIEW_DIM);
      } catch (e) {
        console.error("Failed to load source image", e);
        toast.error("Couldn't load that photo. Try again.");
        onCancel();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source]);

  // Re-render the filtered preview whenever settings change.
  useEffect(() => {
    if (!bitmap || !originalPreviewRef.current) return;
    const host = filteredCanvasRef.current;
    if (!host) return;
    const orig = originalPreviewRef.current;
    const canvas = renderFiltered(orig, settings, orig.width, orig.height);
    canvas.className = "max-h-full max-w-full object-contain";
    host.replaceChildren(canvas);

    // Also paint the original panel once (cheap — it's already downscaled).
    const origHost = originalCanvasRef.current;
    if (origHost && !origHost.dataset.painted) {
      const ctx = origHost.getContext("2d");
      origHost.width = orig.width;
      origHost.height = orig.height;
      ctx?.drawImage(orig, 0, 0);
      origHost.dataset.painted = "1";
    }
  }, [bitmap, settings]);

  // Clear the "painted" flag when bitmap changes so the original canvas
  // repaints for a new source.
  useEffect(() => {
    if (originalCanvasRef.current) {
      delete originalCanvasRef.current.dataset.painted;
    }
  }, [bitmap]);

  const derivedPreset = useMemo(() => detectPreset(settings), [settings]);
  // Show user-selected preset highlight only when settings still match it.
  const activePreset: FilterPreset =
    preset !== "custom" && derivedPreset === preset ? preset : derivedPreset;

  const onPresetClick = (p: FilterPreset) => {
    setPreset(p);
    if (p === "custom") return;
    setSettings(settingsForPreset(p));
  };

  const onSliderChange = (key: keyof FilterSettings, value: number) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setPreset("custom");
  };

  const onResetAll = () => {
    setPreset("natural");
    setSettings({ ...IDENTITY_SETTINGS });
  };

  const onSaveClick = async () => {
    if (!bitmap) return;
    setSaving(true);
    try {
      let blob: Blob | null = null;
      let outPreset: FilterPreset | null = null;
      let outSettings: FilterSettings | null = null;
      if (!isIdentity(settings)) {
        const t0 = performance.now();
        blob = await renderFilteredJpeg(bitmap, settings);
        // eslint-disable-next-line no-console
        console.log(
          `[photo-filter] full-res render: ${(performance.now() - t0).toFixed(0)}ms`
        );
        outPreset = activePreset;
        outSettings = settings;
      }
      await onSave({
        filteredBlob: blob,
        preset: outPreset,
        settings: outSettings,
      });
    } catch (e) {
      console.error(e);
      toast.error("Couldn't save the filter. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // Preview dims for the original canvas — draw at natural size, scaled
  // by object-contain in CSS.
  const previewDims = bitmap
    ? fitDims(bitmap.width, bitmap.height, PREVIEW_DIM)
    : { width: 0, height: 0 };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !saving) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-4xl">
        <DialogTitle>Edit photo</DialogTitle>
        <DialogDescription>
          Pick a preset or fine-tune with the sliders. Your original photo is
          kept safe.
        </DialogDescription>

        {loading || !bitmap ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Mobile tab toggle */}
            <div className="flex gap-1 rounded-lg bg-muted p-1 sm:hidden">
              <button
                type="button"
                onClick={() => setTab("original")}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  tab === "original"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                Original
              </button>
              <button
                type="button"
                onClick={() => setTab("filtered")}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  tab === "filtered"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                Filtered
              </button>
            </div>

            {/* Side-by-side previews. On mobile, one tab visible at a time. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                className={cn(
                  "relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-border bg-black/5",
                  tab === "original" ? "block" : "hidden sm:flex"
                )}
              >
                <canvas
                  ref={originalCanvasRef}
                  width={previewDims.width}
                  height={previewDims.height}
                  className="max-h-full max-w-full object-contain"
                />
                <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Original
                </span>
              </div>
              <div
                className={cn(
                  "relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-border bg-black/5",
                  tab === "filtered" ? "block" : "hidden sm:flex"
                )}
              >
                <div
                  ref={filteredCanvasRef}
                  className="flex h-full w-full items-center justify-center"
                />
                <span className="absolute left-2 top-2 rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Filtered
                </span>
              </div>
            </div>

            {/* Preset row */}
            <div className="flex flex-wrap gap-2">
              {PRESET_ORDER.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPresetClick(p)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors",
                    activePreset === p
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-white text-foreground hover:border-foreground/40"
                  )}
                >
                  {PRESET_LABELS[p]}
                </button>
              ))}
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SLIDERS.map((s) => (
                <SliderRow
                  key={s.key}
                  config={s}
                  value={settings[s.key]}
                  onChange={(v) => onSliderChange(s.key, v)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onResetAll}
            disabled={saving || loading}
          >
            {allowReset ? "Remove filter" : "Reset"}
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onSaveClick}
              disabled={saving || loading}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SliderRow({
  config,
  value,
  onChange,
}: {
  config: SliderConfig;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{config.label}</span>
        <input
          type="number"
          value={value}
          min={config.min}
          max={config.max}
          step={config.step}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) {
              onChange(
                Math.max(config.min, Math.min(config.max, Math.round(n)))
              );
            }
          }}
          className="w-16 rounded border border-border bg-white px-1.5 py-0.5 text-right font-mono tabular-nums text-foreground"
        />
      </div>
      <input
        type="range"
        min={config.min}
        max={config.max}
        step={config.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-foreground"
        aria-label={config.label}
      />
    </div>
  );
}
