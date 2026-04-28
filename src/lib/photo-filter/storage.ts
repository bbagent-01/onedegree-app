// Client helpers that wrap the existing /api/photos/upload endpoint
// and the new per-photo filter endpoints.

import type { FilterPreset, FilterSettings } from "./types";

export async function uploadBlob(
  blob: Blob,
  filename: string
): Promise<{ public_url: string; storage_path: string }> {
  const fd = new FormData();
  fd.append("file", new File([blob], filename, { type: blob.type || "image/jpeg" }));
  const res = await fetch("/api/photos/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
  return (await res.json()) as { public_url: string; storage_path: string };
}

/** Extract the Supabase storage path from a public URL, so server code
 *  can delete the old blob when a photo is re-filtered. */
export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+?)(?:\?.*)?$/);
  return m ? decodeURIComponent(m[1]) : null;
}

export interface ApplyFilterPayload {
  photoId: string;
  filtered_public_url: string;
  filtered_storage_path: string;
  original_public_url: string;
  filter_preset: FilterPreset;
  filter_settings: FilterSettings;
  /** storage_path of the previously-displayed blob, deleted on success. */
  replace_storage_path?: string | null;
}

export async function applyFilterToSavedPhoto(
  payload: ApplyFilterPayload
): Promise<void> {
  const res = await fetch(`/api/photos/${payload.photoId}/filter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`apply-filter failed: ${await res.text()}`);
}

export async function removeFilterFromSavedPhoto(photoId: string): Promise<void> {
  const res = await fetch(`/api/photos/${photoId}/filter`, { method: "DELETE" });
  if (!res.ok) throw new Error(`remove-filter failed: ${await res.text()}`);
}
