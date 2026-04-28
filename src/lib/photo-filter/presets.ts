import type { FilterPreset, FilterSettings } from "./types";
import { IDENTITY_SETTINGS } from "./types";

// v2 presets — re-tuned after first-pass feedback that filtered photos
// looked too close to the original. New engine semantics:
//   brightness = exposure in stops × 100 (preserves blacks)
//   contrast   = positive → filmic S-curve, negative → blend toward gray
//   saturation = vibrance (muted colors lift more than saturated)
//   shadow_lift = gamma curve in sRGB (opens shadows + some midtones)
//   highlight_recovery = soft-clip above 0.78 (saves blown whites)
export const PRESET_SETTINGS: Record<Exclude<FilterPreset, "custom">, FilterSettings> = {
  natural: {
    brightness: 30,       // ~+0.3 stop
    contrast: 20,
    saturation: 25,
    white_balance: 0,
    tint: 0,
    shadow_lift: 25,
    highlight_recovery: 20,
  },
  bright_airy: {
    brightness: 50,       // ~+0.5 stop
    contrast: 10,
    saturation: 15,
    white_balance: 250,
    tint: 0,
    shadow_lift: 40,
    highlight_recovery: 35,
  },
  warm: {
    brightness: 35,       // ~+0.35 stop
    contrast: 20,
    saturation: 35,
    white_balance: 600,
    tint: 5,
    shadow_lift: 30,
    highlight_recovery: 25,
  },
};

export const PRESET_LABELS: Record<FilterPreset, string> = {
  natural: "Natural",
  bright_airy: "Bright & Airy",
  warm: "Warm",
  custom: "Custom",
};

export const PRESET_ORDER: FilterPreset[] = [
  "natural",
  "bright_airy",
  "warm",
  "custom",
];

export function settingsForPreset(preset: FilterPreset): FilterSettings {
  if (preset === "custom") return { ...IDENTITY_SETTINGS };
  return { ...PRESET_SETTINGS[preset] };
}

/** Does `settings` match the baked preset values exactly? */
export function matchesPreset(
  preset: Exclude<FilterPreset, "custom">,
  settings: FilterSettings
): boolean {
  const p = PRESET_SETTINGS[preset];
  return (
    p.brightness === settings.brightness &&
    p.contrast === settings.contrast &&
    p.saturation === settings.saturation &&
    p.white_balance === settings.white_balance &&
    p.tint === settings.tint &&
    p.shadow_lift === settings.shadow_lift &&
    p.highlight_recovery === settings.highlight_recovery
  );
}

/** Infer the preset the current settings correspond to. */
export function detectPreset(settings: FilterSettings): FilterPreset {
  if (matchesPreset("natural", settings)) return "natural";
  if (matchesPreset("bright_airy", settings)) return "bright_airy";
  if (matchesPreset("warm", settings)) return "warm";
  return "custom";
}
