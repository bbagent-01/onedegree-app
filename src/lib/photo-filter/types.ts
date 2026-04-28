// Filter settings live on listing_photos.filter_settings (jsonb).
// Sliders are signed except shadow_lift / highlight_recovery which are
// one-directional (a photo can't have negative shadow lift).

export type FilterPreset = "natural" | "bright_airy" | "warm" | "custom";

export interface FilterSettings {
  /** -100..100, additive brightness shift (linear in sRGB). */
  brightness: number;
  /** -100..100, contrast around mid-gray. 0 = identity. */
  contrast: number;
  /** -100..100, chroma scale around luminance. 0 = identity. */
  saturation: number;
  /** -1000..1000 Kelvin offset. Positive = warmer (more R, less B). */
  white_balance: number;
  /** -100..100. Positive = magenta, negative = green. */
  tint: number;
  /** 0..100. Lifts dark tones; leaves highlights alone. */
  shadow_lift: number;
  /** 0..100. Pulls bright tones down; leaves midtones alone. */
  highlight_recovery: number;
}

export const IDENTITY_SETTINGS: FilterSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  white_balance: 0,
  tint: 0,
  shadow_lift: 0,
  highlight_recovery: 0,
};

export function isIdentity(s: FilterSettings): boolean {
  return (
    s.brightness === 0 &&
    s.contrast === 0 &&
    s.saturation === 0 &&
    s.white_balance === 0 &&
    s.tint === 0 &&
    s.shadow_lift === 0 &&
    s.highlight_recovery === 0
  );
}
