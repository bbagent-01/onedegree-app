// File / URL → ImageBitmap helpers, plus the full-resolution render
// pipeline used when the host clicks Save.

import type { FilterSettings } from "./types";
import { renderFiltered } from "./engine";

/** Upper bound on stored image dimension. Downscale bigger photos on save. */
export const MAX_OUTPUT_DIM = 2400;
/** Target longest-edge for the live preview (fast loop; ~200ms on 10MP source). */
export const PREVIEW_DIM = 800;
/** Output JPEG quality. 92 ≈ Lightroom "high", ~1/4 the bytes of q=100. */
export const OUTPUT_QUALITY = 0.92;

export async function bitmapFromFile(file: File): Promise<ImageBitmap> {
  return await createImageBitmap(file);
}

export async function bitmapFromUrl(url: string): Promise<ImageBitmap> {
  // crossOrigin anonymous is required for getImageData later. Supabase
  // public URLs serve Access-Control-Allow-Origin: *, so this works.
  const res = await fetch(url, { mode: "cors", cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  const blob = await res.blob();
  return await createImageBitmap(blob);
}

/** Compute target dimensions that fit inside `max` while preserving aspect. */
export function fitDims(
  srcW: number,
  srcH: number,
  max: number
): { width: number; height: number } {
  if (srcW <= max && srcH <= max) return { width: srcW, height: srcH };
  const scale = Math.min(max / srcW, max / srcH);
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  };
}

/** Downscaled copy of the bitmap, sized for the live preview canvas. */
export function previewBitmap(
  source: ImageBitmap,
  dim = PREVIEW_DIM
): HTMLCanvasElement {
  const { width, height } = fitDims(source.width, source.height, dim);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

/** Full-resolution render, resized to MAX_OUTPUT_DIM if larger, encoded
 *  as JPEG. Returns a Blob suitable for FormData upload. */
export async function renderFilteredJpeg(
  source: ImageBitmap,
  settings: FilterSettings
): Promise<Blob> {
  const { width, height } = fitDims(source.width, source.height, MAX_OUTPUT_DIM);
  const canvas = renderFiltered(source, settings, width, height);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob returned null"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      OUTPUT_QUALITY
    );
  });
}
