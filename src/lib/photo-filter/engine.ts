// Client-side filter engine. Pure canvas 2D, no external deps.
//
// Color space note: we operate in sRGB throughout. A proper linear
// pipeline (pow 2.4 decode → ops → encode) gives more "photographic"
// results for brightness/contrast, but doubles per-pixel work and is
// indistinguishable from well-tuned sRGB ops at the slider ranges we
// expose. If we ever need the extra fidelity we can swap in a
// linearize()/delinearize() pair around the LUT.

import type { FilterSettings } from "./types";
import { isIdentity } from "./types";

/** Build a per-channel 256-entry LUT that folds every scalar op
 *  (channel offset, brightness, contrast, shadow lift, highlight
 *  recovery) into a single lookup. Saturation touches all three
 *  channels at once so it stays in the main loop. */
function buildChannelLut(
  channelOffset: number,
  brightness: number,
  contrast: number,
  shadowLift: number,
  highlightRecovery: number
): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  const bAdd = brightness / 200; // +100 → +0.5
  const cFactor = (contrast + 100) / 100; // 0..2, 1 = identity
  const slAmt = shadowLift / 100;
  const hrAmt = highlightRecovery / 100;

  for (let i = 0; i < 256; i++) {
    let v = (i + channelOffset) / 255;

    // Brightness (additive, in normalized space).
    v += bAdd;
    // Contrast around mid-gray.
    v = (v - 0.5) * cFactor + 0.5;

    // Shadow lift — raises dark tones, barely touches midtones/highlights.
    // (1 - v)^4 is peaked near v=0, so the effect fades quickly above ~0.3.
    if (slAmt > 0) {
      const vClamped = v < 0 ? 0 : v > 1 ? 1 : v;
      const w = 1 - vClamped;
      v += slAmt * w * w * w * w;
    }

    // Highlight recovery — pulls bright tones down, barely touches midtones.
    // v^4 peaks near v=1 for the same reason (mirrored curve).
    if (hrAmt > 0) {
      const vClamped = v < 0 ? 0 : v > 1 ? 1 : v;
      const vv = vClamped * vClamped;
      v -= hrAmt * vv * vv;
    }

    lut[i] = Math.max(0, Math.min(255, Math.round(v * 255)));
  }
  return lut;
}

/** Map Kelvin offset + tint to per-channel additive shifts in 0-255 space.
 *  White balance: warmer = more red, less blue.
 *  Tint: positive = magenta (more red+blue, less green). */
function channelOffsets(whiteBalance: number, tint: number): [number, number, number] {
  // ±1000 K → ±30 on channels. Empirically this matches perceived WB
  // shifts in the preset range (0..+600K).
  const wbMag = whiteBalance * 0.03;
  // ±100 tint → ±20 on green, half that on R/B.
  const tMag = tint * 0.2;
  const rOff = wbMag - tMag * 0.5;
  const gOff = -tMag;
  const bOff = -wbMag - tMag * 0.5;
  return [rOff, gOff, bOff];
}

/** Apply filter to an ImageData in place. Safe to call with identity
 *  settings — it'll early-return without touching pixels. */
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

  // Saturation: luminance-preserving chroma scale.
  // Rec. 601 weights (0.299/0.587/0.114) — perceptually closer for
  // sRGB-encoded inputs than Rec. 709.
  const satScale = 1 + settings.saturation / 100;
  const doSat = satScale !== 1;

  for (let i = 0; i < len; i += 4) {
    let r = rLut[data[i]];
    let g = gLut[data[i + 1]];
    let b = bLut[data[i + 2]];

    if (doSat) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = lum + (r - lum) * satScale;
      g = lum + (g - lum) * satScale;
      b = lum + (b - lum) * satScale;
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

/** Render a bitmap to a canvas with the filter applied, returning
 *  a new canvas. Used for both the live preview and the final save. */
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
