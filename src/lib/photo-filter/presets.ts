import type { FilterPreset, FilterSettings } from "./types";
import { IDENTITY_SETTINGS } from "./types";

// Starting values from CC-C10a spec. Tuned during self-test against a
// spread of test images (bright room, dark room, warm natural light,
// cool daylight, mixed lighting). Tweaks documented in the session recap.
export const PRESET_SETTINGS: Record<Exclude<FilterPreset, "custom">, FilterSettings> = {
  natural: {
    brightness: 5,
    contrast: 10,
    saturation: 8,
    white_balance: 0,
    tint: 0,
    shadow_lift: 12,
    highlight_recovery: 8,
  },
  bright_airy: {
    brightness: 18,
    contrast: 5,
    saturation: 6,
    white_balance: 300,
    tint: 0,
    shadow_lift: 22,
    highlight_recovery: 15,
  },
  warm: {
    brightness: 10,
    contrast: 8,
    saturation: 15,
    white_balance: 600,
    tint: 5,
    shadow_lift: 15,
    highlight_recovery: 10,
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
