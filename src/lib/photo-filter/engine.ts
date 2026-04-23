// Client-side filter engine. Pure canvas 2D, no external deps.
//
// Color pipeline (v2 — CC-C10a self-test rev):
//   1. Channel WB/tint offsets (sRGB 0-255 space, cheap and perceptual)
//   2. sRGB → linear-light
//   3. Brightness (additive, linear-light — gives proper highlight rolloff)
//   4. Contrast: positive = filmic sigmoid S-curve; negative = pull toward
//      mid-gray. Linear-light so the shape hits tonal values evenly.
//   5. linear → sRGB
//   6. Shadow lift: gamma curve (pow 1/(1+amt)) — lifts blacks strongly,
//      midtones moderately, highlights barely.
//   7. Highlight recovery: soft-clip above ~0.78 — compresses only the
//      top of the range so midtones stay where they are.
// Then per-pixel (outside the LUT because it needs cross-channel info):
//   8. Vibrance — boost factor scales with (1 - current chroma), so
//      muted colors jump more than already-saturated ones.
//
// Everything scalar is baked into one 256-entry per-channel LUT, so the
// per-pixel hot loop is 3 LUT hits + the vibrance math. The filter
// settings are still called "saturation" on the wire to keep the API
// stable — the label just means "more color punch" now.

import type { FilterSettings } from "./types";
import { isIdentity } from "./types";

// Standard sRGB transfer functions. Used only when building the LUT
// (256 iterations), so the Math.pow cost is amortized over all pixels.
function srgbToLinear(v: number): number {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function linearToSrgb(v: number): number {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

/** Normalized sigmoid that preserves 0, 0.5, 1 as fixed points. Steeper
 *  `k` → stronger S-curve = more filmic contrast. */
function filmicSigmoid(x: number, k: number): number {
  const sig = (t: number) => 1 / (1 + Math.exp(-k * (t - 0.5)));
  const s0 = sig(0);
  const s1 = sig(1);
  return (sig(x) - s0) / (s1 - s0);
}

function buildChannelLut(
  channelOffset: number,
  brightness: number,
  contrast: number,
  shadowLift: number,
  highlightRecovery: number
): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  // Brightness is an exposure multiplier in linear light — preserves
  // blacks at 0 (they're already dark, no reason to lift them here;
  // that's shadow lift's job) and clips gracefully at the top.
  // +100 slider ≈ +1 stop, +25 ≈ +0.25 stop.
  const expMul = Math.pow(2, brightness / 100);
  const cAmt = contrast / 100; // -1..1
  const slAmt = shadowLift / 100; // 0..1
  const hrAmt = highlightRecovery / 100; // 0..1
  // Contrast S-curve strength. c=0 → k=1 (near-identity), c=0.5 → k=2.5
  // (moderate S), c=1 → k=4 (strong filmic).
  const cK = 1 + cAmt * 3;
  const HR_THRESHOLD = 0.78;

  for (let i = 0; i < 256; i++) {
    let vSrgb = (i + channelOffset) / 255;
    if (vSrgb < 0) vSrgb = 0;
    if (vSrgb > 1) vSrgb = 1;

    // → linear for brightness + contrast.
    let lin = srgbToLinear(vSrgb);
    lin *= expMul;
    if (lin < 0) lin = 0;
    if (lin > 1) lin = 1;

    if (cAmt > 0) {
      lin = filmicSigmoid(lin, cK);
    } else if (cAmt < 0) {
      // De-contrast: blend toward mid-gray (0.18 in linear ~= 0.5 sRGB).
      const mid = 0.18;
      lin = lin + -cAmt * (mid - lin);
    }
    if (lin < 0) lin = 0;
    if (lin > 1) lin = 1;

    // → sRGB for perceptually-scaled tone work.
    let v = linearToSrgb(lin);

    // Shadow lift: gamma curve. 1/(1+amt) > 1 flattens the dark end
    // upward. At amt=0.3, gamma=1.3, so 0.1 → 0.17, 0.3 → 0.39, 0.5 →
    // 0.58 — shadows open, midtones get a small bump, highlights unmoved.
    if (slAmt > 0) {
      v = Math.pow(v, 1 / (1 + slAmt * 1.5));
    }

    // Highlight recovery: soft-clip above a fixed threshold so midtones
    // are never touched. At hr=0.3 a pixel at 1.0 maps to ~0.91.
    if (hrAmt > 0 && v > HR_THRESHOLD) {
      const excess = v - HR_THRESHOLD;
      const compress = 1 + hrAmt * 5 * excess;
      v = HR_THRESHOLD + excess / compress;
    }

    if (v < 0) v = 0;
    if (v > 1) v = 1;
    lut[i] = Math.round(v * 255);
  }
  return lut;
}

/** Map Kelvin offset + tint to per-channel additive shifts in 0-255 space.
 *  White balance: warmer = more red, less blue.
 *  Tint: positive = magenta (more red+blue, less green). */
function channelOffsets(whiteBalance: number, tint: number): [number, number, number] {
  const wbMag = whiteBalance * 0.03;
  const tMag = tint * 0.2;
  const rOff = wbMag - tMag * 0.5;
  const gOff = -tMag;
  const bOff = -wbMag - tMag * 0.5;
  return [rOff, gOff, bOff];
}

export function applyFilter(img: ImageData, settings: FilterSettings): void {
  if (isIdentity(settings)) return;

  const [rOff, gOff, bOff] = channelOffsets(
    settings.white_balance,
    settings.tint
  );
  const rLut = buildChannelLut(
    rOff,
    settings.brightness,
    settings.contrast,
    settings.shadow_lift,
    settings.highlight_recovery
  );
  const gLut = buildChannelLut(
    gOff,
    settings.brightness,
    settings.contrast,
    settings.shadow_lift,
    settings.highlight_recovery
  );
  const bLut = buildChannelLut(
    bOff,
    settings.brightness,
    settings.contrast,
    settings.shadow_lift,
    settings.highlight_recovery
  );

  const data = img.data;
  const len = data.length;

  // Vibrance: amt scales muted-pixel saturation more than saturated-
  // pixel saturation. Chroma measured via max-min over 255. The (1-c)²
  // falloff keeps already-vivid reds/skin-tones from cooking.
  const vibAmt = settings.saturation / 100;
  const doVib = vibAmt !== 0;

  for (let i = 0; i < len; i += 4) {
    let r = rLut[data[i]];
    let g = gLut[data[i + 1]];
    let b = bLut[data[i + 2]];

    if (doVib) {
      const mx = r > g ? (r > b ? r : b) : g > b ? g : b;
      const mn = r < g ? (r < b ? r : b) : g < b ? g : b;
      const chroma = (mx - mn) / 255;
      const dampen = (1 - chroma) * (1 - chroma);
      const factor = 1 + vibAmt * dampen;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = lum + (r - lum) * factor;
      g = lum + (g - lum) * factor;
      b = lum + (b - lum) * factor;
      r = r < 0 ? 0 : r > 255 ? 255 : r;
      g = g < 0 ? 0 : g > 255 ? 255 : g;
      b = b < 0 ? 0 : b > 255 ? 255 : b;
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    // alpha (i+3) untouched
  }
}

export function renderFiltered(
  source: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
  settings: FilterSettings,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(source, 0, 0, width, height);
  if (isIdentity(settings)) return canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  applyFilter(imgData, settings);
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}
